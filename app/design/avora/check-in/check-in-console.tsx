"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { pinkGala2027Synthetic } from "@/src/data/synthetic/pink-gala-2027";
import {
  acknowledgeMutations,
  createLocalCheckInStore,
  createPendingMutation,
  defaultCheckInSession,
  enqueueMutation,
  getNetworkStatus,
  subscribeToNetworkStatus,
} from "@/src/data/local-check-in-session";
import { isFirebaseConfigured } from "@/src/data/firebase/config";
import {
  createGuestException,
  recordCheckIn,
  recordCorrection,
  resolveGuestException,
  type OperationContext,
} from "@/src/domain/check-in-operations";
import { duplicateNameIds, guestFullName, searchGuests } from "@/src/domain/guest-search";
import { buildGuestImportPreview, type GuestImportPreview } from "@/src/domain/guest-import";
import { buildReconciliationCsv } from "@/src/domain/reconciliation-export";
import { evaluateRehearsalReadiness } from "@/src/domain/rehearsal-readiness";
import type { AuditRecord, CheckInSession, Guest, GuestException } from "@/src/domain/models";

const source = pinkGala2027Synthetic;
const staff = source.staff[0];
const checkInStore = createLocalCheckInStore(defaultCheckInSession(source));
type WorkspaceView = "arrivals" | "exceptions" | "activity" | "import" | "rehearsal";

function formatTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function actionLabel(action: AuditRecord["action"]) {
  return {
    check_in: "Checked in",
    undo_check_in: "Corrected check-in",
    create_exception: "Sent to event lead",
    resolve_exception: "Resolved exception",
    import_guests: "Imported guest list",
  }[action];
}

export function CheckInConsole() {
  const session = useSyncExternalStore(checkInStore.subscribe, checkInStore.getSnapshot, checkInStore.getServerSnapshot);
  const browserOnline = useSyncExternalStore(subscribeToNetworkStatus, getNetworkStatus, () => true);
  const { guests, parties, tables, exceptions, auditRecords, outbox } = session;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>("arrivals");
  const [forceOffline, setForceOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [importPreview, setImportPreview] = useState<GuestImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [lastCheckIn, setLastCheckIn] = useState<{ guestId: string; previous: Guest } | null>(null);
  const operationSequence = useRef(0);
  const isOnline = browserOnline && !forceOffline;

  const duplicates = useMemo(() => duplicateNameIds(guests), [guests]);
  const results = useMemo(() => searchGuests(guests, query), [guests, query]);
  const selected = guests.find((guest) => guest.id === selectedId);
  const checkedInCount = guests.filter((guest) => guest.status === "checked_in").length;
  const openExceptions = exceptions.filter((item) => item.status === "open");
  const pendingCount = outbox.length;
  const party = selected ? parties.find((item) => item.id === selected.partyId) : undefined;
  const table = selected ? tables.find((item) => item.id === selected.tableId) : undefined;
  const partyGuests = party ? guests.filter((guest) => party.guestIds.includes(guest.id)) : [];
  const selectedName = selected ? guestFullName(selected) : "";
  const lastActionGuest = lastCheckIn ? guests.find((guest) => guest.id === lastCheckIn.guestId) : undefined;
  const selectedHasOpenException = selected
    ? openExceptions.some((item) => item.guestId === selected.id)
    : false;

  function operationContext(): OperationContext {
    operationSequence.current += 1;
    return {
      eventId: source.event.id,
      staff,
      occurredAt: new Date().toISOString(),
      syncStatus: "pending",
      id: `${Date.now()}_${operationSequence.current}`,
    };
  }

  function persistOperation(input: { id: string; audit: AuditRecord; guest?: Guest; exception?: GuestException }) {
    const mutation = createPendingMutation(input);
    checkInStore.update((current) => {
      const nextGuests = input.guest
        ? current.guests.map((guest) => guest.id === input.guest?.id ? input.guest : guest)
        : current.guests;
      const hasException = input.exception && current.exceptions.some((item) => item.id === input.exception?.id);
      const nextExceptions = input.exception
        ? hasException
          ? current.exceptions.map((item) => item.id === input.exception?.id ? input.exception : item)
          : [input.exception, ...current.exceptions]
        : current.exceptions;
      return {
        ...current,
        updatedAt: input.audit.occurredAt,
        guests: nextGuests,
        exceptions: nextExceptions,
        auditRecords: current.auditRecords.some((record) => record.id === input.audit.id)
          ? current.auditRecords
          : [input.audit, ...current.auditRecords],
        outbox: enqueueMutation(current.outbox, mutation),
      };
    });
  }

  function checkIn(guest: Guest) {
    const context = operationContext();
    const result = recordCheckIn(guest, context);
    setLastCheckIn({ guestId: guest.id, previous: guest });
    persistOperation({ id: context.id, audit: result.audit, guest: result.guest });
  }

  function confirmCorrection(guest: Guest) {
    if (!correctionReason.trim()) return;
    const context = operationContext();
    const result = recordCorrection(guest, correctionReason, context);
    persistOperation({ id: context.id, audit: result.audit, guest: result.guest });
    setCorrectionOpen(false);
    setCorrectionReason("");
    setLastCheckIn(null);
  }

  function undoLastCheckIn() {
    if (!lastCheckIn) return;
    const currentGuest = guests.find((guest) => guest.id === lastCheckIn.guestId);
    if (!currentGuest) return;
    const context = operationContext();
    const result = recordCorrection(currentGuest, "Immediate undo by staff", context);
    persistOperation({
      id: context.id,
      audit: result.audit,
      guest: { ...lastCheckIn.previous, status: result.guest.status, checkedInAt: result.guest.checkedInAt },
    });
    setLastCheckIn(null);
  }

  function queueGuestException(guest: Guest) {
    const context = operationContext();
    const result = createGuestException({
      guest,
      guestName: guestFullName(guest),
      reason: guest.tableId ? "identity_question" : "missing_assignment",
      details: guest.note ?? "Guest requires review before check-in.",
    }, context);
    persistOperation({ id: context.id, audit: result.audit, exception: result.exception });
    setSelectedId(null);
    setView("exceptions");
  }

  function queueMissingGuest() {
    const context = operationContext();
    const result = createGuestException({
      guestName: query,
      reason: "guest_not_found",
      details: "No matching guest record after staff verified the spelling.",
    }, context);
    persistOperation({ id: context.id, audit: result.audit, exception: result.exception });
    setQuery("");
    setView("exceptions");
  }

  function resolveException(item: GuestException, note: string) {
    const context = operationContext();
    const result = resolveGuestException(item, note, context);
    persistOperation({ id: context.id, audit: result.audit, exception: result.exception });
  }

  async function syncPending() {
    if (!isOnline || syncing) return;
    if (!isFirebaseConfigured()) {
      setSyncNotice("Firebase setup is required; saved actions remain safely on this device.");
      return;
    }
    setSyncing(true);
    setSyncNotice("");
    try {
      const { createFirebaseCheckInAdapter } = await import("@/src/data/firebase/check-in-adapter");
      const result = await createFirebaseCheckInAdapter().sync(session.eventId, outbox);
      const acknowledged = result.outcomes
        .filter((outcome) => outcome.status === "acknowledged")
        .map((outcome) => outcome.mutationId);
      if (acknowledged.length) {
        checkInStore.update((current) => acknowledgeMutations(current, acknowledged, new Date().toISOString()));
      }
      const held = result.outcomes.filter((outcome) => outcome.status !== "acknowledged");
      setSyncNotice(held.length
        ? `${acknowledged.length} synced; ${held.length} held for review. ${held[0].message ?? ""}`.trim()
        : `${acknowledged.length} ${acknowledged.length === 1 ? "action" : "actions"} synced as ${result.staff.displayName}.`);
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : "Sync could not be completed.");
    } finally {
      setSyncing(false);
    }
  }

  function resetReview() {
    checkInStore.reset();
    setQuery("");
    setSelectedId(null);
    setView("arrivals");
    setLastCheckIn(null);
  }

  async function loadImport(file?: File) {
    if (!file) return;
    const text = await file.text();
    setImportPreview(buildGuestImportPreview(text, source.event.id));
    setImportFileName(file.name);
  }

  function loadSampleImport() {
    const sample = [
      "first_name,last_name,party,table,zone,note",
      "Amelia,Bennett,Bennett party,Rose 1,Main floor,",
      "Marcus,Bennett,Bennett party,Rose 1,Main floor,",
      "Jordan,Carter,Carter / Lewis party,Rose 2,Main floor,Confirm party before check-in",
      "Jordan,Carter,Carter party,Magnolia 3,East wing,Dietary note on file",
      "Sam,Reed,Reed party,,,Table assignment missing",
    ].join("\n");
    setImportPreview(buildGuestImportPreview(sample, source.event.id));
    setImportFileName("pink-gala-sample.csv");
  }

  function applyImport(preview: GuestImportPreview) {
    if (preview.issues.some((issue) => issue.severity === "error") || auditRecords.length > 0) return;
    const context = operationContext();
    const audit: AuditRecord = {
      id: `audit_${context.id}`,
      eventId: source.event.id,
      staffUserId: staff.id,
      action: "import_guests",
      occurredAt: context.occurredAt,
      subject: `${preview.guests.length} guests`,
      syncStatus: "pending",
      reason: `Imported from ${importFileName || "CSV file"}`,
    };
    const mutation = createPendingMutation({
      id: context.id,
      audit,
      guests: preview.guests,
      parties: preview.parties,
      tables: preview.tables,
    });
    checkInStore.update((current) => ({
      ...current,
      updatedAt: context.occurredAt,
      guests: preview.guests,
      parties: preview.parties,
      tables: preview.tables,
      exceptions: [],
      auditRecords: [audit],
      outbox: enqueueMutation(current.outbox, mutation),
    }));
    setImportPreview(null);
    setView("arrivals");
  }

  function downloadReconciliation() {
    const blob = new Blob([buildReconciliationCsv(session)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "avora-pink-gala-2027-reconciliation.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="console-shell">
      <header className="event-header">
        <div className="event-identity">
          <div className="brand-mark" aria-hidden="true"><span>A</span></div>
          <div>
            <p className="eyebrow">Avora · Guest arrival</p>
            <h1>{source.event.name}</h1>
            <p className="venue">{source.event.venueName} <span aria-hidden="true">·</span> Synthetic review</p>
          </div>
        </div>
        <div className="status-cluster" aria-label="Event status">
          <button className={`sync-pill ${isOnline ? "online" : "offline"}`} onClick={() => setForceOffline((current) => !current)}>
            <span className="sync-dot" /> {isOnline ? isFirebaseConfigured() ? "Online · Firebase" : "Online · local" : browserOnline ? "Forced offline" : "Device offline"}
          </button>
          <span className="count"><strong>{checkedInCount}</strong><span> of {guests.length} arrived</span></span>
        </div>
      </header>

      <nav className="operation-nav" aria-label="Check-in sections">
        <button className={view === "arrivals" ? "active" : ""} onClick={() => setView("arrivals")}>Guest arrivals</button>
        <button className={view === "exceptions" ? "active" : ""} onClick={() => setView("exceptions")}>Event lead <span>{openExceptions.length}</span></button>
        <button className={view === "activity" ? "active" : ""} onClick={() => setView("activity")}>Activity <span>{auditRecords.length}</span></button>
        <button className={view === "import" ? "active" : ""} onClick={() => setView("import")}>Guest import</button>
        <button className={view === "rehearsal" ? "active" : ""} onClick={() => setView("rehearsal")}>Rehearsal</button>
        <div className={`queue-state ${pendingCount ? "pending" : ""}`}>
          {pendingCount ? `${pendingCount} saved on this device` : "All actions synced"}
          {pendingCount > 0 && isOnline && <button onClick={syncPending} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</button>}
        </div>
      </nav>

      {syncNotice && <div className="sync-notice" role="status">{syncNotice}<button onClick={() => setSyncNotice("")}>Dismiss</button></div>}

      {view === "arrivals" && (
        <section className="workspace" aria-label="Guest check-in workspace">
          <div className="search-panel">
            <div className="panel-heading">
              <div><p className="step-label">Arrival 01</p><h2>Find a guest</h2></div>
              <span>Search by first or last name</span>
            </div>
            <div className="search-wrap">
              <span className="search-icon" aria-hidden="true" />
              <input
                id="guest-search"
                autoComplete="off"
                autoFocus
                placeholder="Type a guest name…"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }}
              />
              {query && <button className="clear" onClick={() => { setQuery(""); setSelectedId(null); }}>Clear</button>}
            </div>

            <div className="result-summary" aria-live="polite">
              {query ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : "Guest results will appear here"}
            </div>

            <div className="results">
              {!query && <EmptySearch />}
              {query && results.length === 0 && <NoResults query={query} onClear={() => setQuery("")} onEscalate={queueMissingGuest} />}
              {results.map((guest) => {
                const guestParty = parties.find((item) => item.id === guest.partyId);
                const guestTable = tables.find((item) => item.id === guest.tableId);
                return (
                  <button key={guest.id} className={`guest-result ${selectedId === guest.id ? "selected" : ""}`} onClick={() => { setSelectedId(guest.id); setCorrectionOpen(false); }}>
                    <span><strong>{guestFullName(guest)}</strong><small>{guestParty?.displayName}{guestTable ? ` · ${guestTable.label}` : " · No table"}</small></span>
                    <span className={`guest-status ${guest.status}`}>
                      {duplicates.has(guest.id) && <em>Same name</em>}
                      {guest.status === "checked_in" ? "Arrived" : guest.status === "needs_attention" ? "Attention" : "Expected"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className={`detail-panel ${selected ? "active" : ""}`} aria-live="polite">
            {!selected ? <SelectPrompt /> : (
              <>
                <button className="mobile-close" onClick={() => setSelectedId(null)} aria-label="Close guest details">Close</button>
                <div className="detail-heading">
                  <p className="step-label">Arrival 02 · Confirm identity</p>
                  <h2>{selectedName}</h2>
                  {duplicates.has(selected.id) && <span className="warning-badge">Duplicate name—verify party and table</span>}
                </div>

                <dl className="facts">
                  <div><dt>Party</dt><dd>{party?.displayName ?? "No party"}</dd></div>
                  <div><dt>Table</dt><dd>{table ? `${table.label} · ${table.zone}` : "Not assigned"}</dd></div>
                  <div><dt>Status</dt><dd>{selected.status === "checked_in" ? `Arrived ${formatTime(selected.checkedInAt)}` : selected.status === "needs_attention" ? "Needs event lead" : "Expected"}</dd></div>
                </dl>

                {selected.note && <div className="note"><strong>Staff note</strong><p>{selected.note}</p></div>}

                {partyGuests.length > 1 && (
                  <div className="party-list">
                    <h3>Party members</h3>
                    {partyGuests.map((guest) => <div key={guest.id}><span>{guestFullName(guest)}</span><span>{guest.status === "checked_in" ? "Arrived" : "Expected"}</span></div>)}
                  </div>
                )}

                <div className="actions">
                  {selected.status === "checked_in" ? (
                    correctionOpen ? (
                      <div className="correction-form">
                        <label htmlFor="correction-reason">Why is this being corrected?</label>
                        <select id="correction-reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)}>
                          <option value="">Choose a reason</option>
                          <option>Selected the wrong guest</option>
                          <option>Guest has not arrived</option>
                          <option>Duplicate staff action</option>
                          <option>Other correction approved by lead</option>
                        </select>
                        <div><button className="secondary-action" disabled={!correctionReason} onClick={() => confirmCorrection(selected)}>Confirm correction</button><button className="text-action" onClick={() => setCorrectionOpen(false)}>Cancel</button></div>
                      </div>
                    ) : <button className="secondary-action" onClick={() => setCorrectionOpen(true)}>Correct check-in</button>
                  ) : selected.status === "needs_attention" ? (
                    <button className="primary-action" disabled={selectedHasOpenException} onClick={() => queueGuestException(selected)}>
                      {selectedHasOpenException ? "Already with event lead" : "Send to event lead"}
                    </button>
                  ) : (
                    <button className="primary-action" onClick={() => checkIn(selected)}>Check in {selected.firstName}</button>
                  )}
                  <button className="text-action" onClick={() => setSelectedId(null)}>Back to guest results</button>
                </div>
              </>
            )}
          </aside>
        </section>
      )}

      {view === "exceptions" && <ExceptionQueue items={exceptions} onResolve={resolveException} />}
      {view === "activity" && <ActivityLog records={auditRecords} onReset={resetReview} />}
      {view === "import" && <GuestImportPanel preview={importPreview} fileName={importFileName} activityCount={auditRecords.length} onFile={loadImport} onSample={loadSampleImport} onApply={applyImport} />}
      {view === "rehearsal" && <RehearsalPanel session={session} onExport={downloadReconciliation} />}

      {lastCheckIn && <div className="undo-toast" role="status"><span><strong>{lastActionGuest ? guestFullName(lastActionGuest) : "Guest"}</strong> checked in.</span><button onClick={undoLastCheckIn}>Undo</button></div>}
    </main>
  );
}

function RehearsalPanel({ session, onExport }: { session: CheckInSession; onExport: () => void }) {
  const checks = evaluateRehearsalReadiness(session, isFirebaseConfigured());
  const readyCount = checks.filter((item) => item.status === "ready").length;
  return (
    <section className="operations-panel rehearsal-panel">
      <div className="operations-heading">
        <div><p className="step-label">Event readiness</p><h2>Two-device rehearsal</h2></div>
        <p>Deterministic safeguards are checked here. Complete the live device run after Firebase activation.</p>
      </div>
      <div className="rehearsal-summary">
        <div><strong>{readyCount}/{checks.length}</strong><span>checks ready</span></div>
        <div><strong>{session.outbox.length}</strong><span>pending operations</span></div>
        <div><strong>{session.auditRecords.length}</strong><span>audit records</span></div>
        <button onClick={onExport}>Download reconciliation CSV</button>
      </div>
      <div className="rehearsal-checks">
        {checks.map((check) => (
          <article key={check.id} className={check.status}>
            <span>{check.status === "ready" ? "Ready" : "Action required"}</span>
            <div><h3>{check.label}</h3><p>{check.detail}</p></div>
          </article>
        ))}
      </div>
      <div className="rehearsal-note"><strong>Live signoff sequence</strong><p>Device A offline check-in → device B newer online check-in → device A reconnects and holds the stale operation → retry an acknowledged ID → resolve an exception with a lead device → export closeout.</p></div>
    </section>
  );
}

function ExceptionQueue({ items, onResolve }: { items: GuestException[]; onResolve: (item: GuestException, note: string) => void }) {
  const open = items.filter((item) => item.status === "open");
  const resolved = items.filter((item) => item.status === "resolved");
  return (
    <section className="operations-panel">
      <div className="operations-heading"><div><p className="step-label">Event desk</p><h2>Needs event lead</h2></div><p>Resolve missing guests, assignments, and identity questions without blocking the arrival line.</p></div>
      {open.length === 0 ? <div className="empty-state compact"><span>✓</span><h2>No open exceptions</h2><p>Items routed by check-in staff will appear here.</p></div> : (
        <div className="exception-list">{open.map((item) => <ExceptionCard key={item.id} item={item} onResolve={onResolve} />)}</div>
      )}
      {resolved.length > 0 && <details className="resolved-items"><summary>{resolved.length} resolved</summary>{resolved.map((item) => <p key={item.id}><strong>{item.guestName}</strong> · {item.details}</p>)}</details>}
    </section>
  );
}

function ExceptionCard({ item, onResolve }: { item: GuestException; onResolve: (item: GuestException, note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <article className="exception-card">
      <div><span className="exception-reason">{item.reason.replaceAll("_", " ")}</span><h3>{item.guestName}</h3><p>{item.details}</p><small>Queued {formatTime(item.createdAt)}</small></div>
      <div className="resolution-form"><label htmlFor={`resolution-${item.id}`}>Resolution note</label><input id={`resolution-${item.id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was confirmed or changed?" /><button disabled={!note.trim()} onClick={() => onResolve(item, note)}>Resolve item</button></div>
    </article>
  );
}

function ActivityLog({ records, onReset }: { records: AuditRecord[]; onReset: () => void }) {
  return (
    <section className="operations-panel">
      <div className="operations-heading"><div><p className="step-label">Accountability</p><h2>Event activity</h2></div><div className="operations-heading-actions"><p>Every check-in, correction, escalation, and resolution identifies its actor and sync state.</p><button onClick={onReset}>Reset synthetic review</button></div></div>
      {records.length === 0 ? <div className="empty-state compact"><span>↗</span><h2>No activity yet</h2><p>Event actions will be recorded here as staff work.</p></div> : (
        <div className="activity-list">{records.map((record) => <article key={record.id}><span className={`audit-sync ${record.syncStatus}`}>{record.syncStatus}</span><div><strong>{actionLabel(record.action)} · {record.subject}</strong><p>{record.reason ?? `Recorded by ${staff.displayName}`}</p></div><time>{formatTime(record.occurredAt)}</time></article>)}</div>
      )}
    </section>
  );
}

function GuestImportPanel({
  preview,
  fileName,
  activityCount,
  onFile,
  onSample,
  onApply,
}: {
  preview: GuestImportPreview | null;
  fileName: string;
  activityCount: number;
  onFile: (file?: File) => Promise<void>;
  onSample: () => void;
  onApply: (preview: GuestImportPreview) => void;
}) {
  const errors = preview?.issues.filter((issue) => issue.severity === "error") ?? [];
  const warnings = preview?.issues.filter((issue) => issue.severity === "warning") ?? [];
  const blockedByActivity = activityCount > 0;
  return (
    <section className="operations-panel import-panel">
      <div className="operations-heading"><div><p className="step-label">Guest data</p><h2>Review before import</h2></div><p>Required columns: first_name, last_name, and party. Optional columns: table, zone, and note.</p></div>
      <div className="import-controls">
        <label className="file-picker">Choose CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void onFile(event.target.files?.[0])} /></label>
        <button onClick={onSample}>Load realistic sample</button>
        <span>{fileName || "No file selected"}</span>
      </div>

      {!preview ? <div className="empty-state compact"><span>↓</span><h2>Import stays in review</h2><p>No guest record changes until validation passes and you explicitly apply the preview.</p></div> : (
        <>
          <div className="import-summary">
            <div><strong>{preview.guests.length}</strong><span>valid guests</span></div>
            <div><strong>{preview.parties.length}</strong><span>parties</span></div>
            <div><strong>{preview.tables.length}</strong><span>tables</span></div>
            <div className={errors.length ? "has-errors" : ""}><strong>{errors.length}</strong><span>blocking errors</span></div>
            <div className={warnings.length ? "has-warnings" : ""}><strong>{warnings.length}</strong><span>warnings</span></div>
          </div>
          {preview.issues.length > 0 && <div className="import-issues">{preview.issues.map((issue, index) => <article key={`${issue.message}_${index}`} className={issue.severity}><strong>{issue.severity}{issue.row ? ` · Row ${issue.row}` : ""}</strong><span>{issue.message}</span></article>)}</div>}
          {blockedByActivity && <div className="import-blocker"><strong>Import locked after event activity begins.</strong><span>Reset the synthetic review from Activity before replacing the guest list.</span></div>}
          <div className="import-actions"><button className="primary-action" disabled={errors.length > 0 || blockedByActivity || preview.guests.length === 0} onClick={() => onApply(preview)}>Apply {preview.guests.length} validated guests</button><p>Warnings may be imported; affected guests enter the event-lead workflow.</p></div>
        </>
      )}
    </section>
  );
}

function EmptySearch() {
  return <div className="empty-state"><span>✦</span><h2>Ready for the next arrival</h2><p>Welcome guests, confirm their party and table, then record their arrival.</p></div>;
}

function NoResults({ query, onClear, onEscalate }: { query: string; onClear: () => void; onEscalate: () => void }) {
  return <div className="empty-state warning"><span>!</span><h2>No match for “{query}”</h2><p>Check the spelling. If the guest still cannot be found, route them to the event lead without blocking the line.</p><div className="empty-actions"><button onClick={onClear}>Clear and search again</button><button onClick={onEscalate}>Send to event lead</button></div></div>;
}

function SelectPrompt() {
  return <div className="select-prompt"><span>02</span><h2>Confirm the guest</h2><p>Select a guest to verify their party, table, and arrival status.</p></div>;
}
