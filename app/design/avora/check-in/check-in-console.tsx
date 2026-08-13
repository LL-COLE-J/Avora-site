"use client";

import { useMemo, useRef, useState } from "react";
import { pinkGala2027Synthetic } from "@/src/data/synthetic/pink-gala-2027";
import {
  createGuestException,
  recordCheckIn,
  recordCorrection,
  resolveGuestException,
  type OperationContext,
} from "@/src/domain/check-in-operations";
import { duplicateNameIds, guestFullName, searchGuests } from "@/src/domain/guest-search";
import type { AuditRecord, Guest, GuestException } from "@/src/domain/models";

const source = pinkGala2027Synthetic;
const staff = source.staff[0];
type WorkspaceView = "arrivals" | "exceptions" | "activity";

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
  }[action];
}

export function CheckInConsole() {
  const [guests, setGuests] = useState<Guest[]>(source.guests);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>("arrivals");
  const [isOnline, setIsOnline] = useState(true);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [exceptions, setExceptions] = useState<GuestException[]>([]);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [lastCheckIn, setLastCheckIn] = useState<{ guestId: string; previous: Guest } | null>(null);
  const operationSequence = useRef(0);

  const duplicates = useMemo(() => duplicateNameIds(guests), [guests]);
  const results = useMemo(() => searchGuests(guests, query), [guests, query]);
  const selected = guests.find((guest) => guest.id === selectedId);
  const checkedInCount = guests.filter((guest) => guest.status === "checked_in").length;
  const openExceptions = exceptions.filter((item) => item.status === "open");
  const pendingCount = auditRecords.filter((record) => record.syncStatus === "pending").length;
  const party = selected ? source.parties.find((item) => item.id === selected.partyId) : undefined;
  const table = selected ? source.tables.find((item) => item.id === selected.tableId) : undefined;
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
      syncStatus: isOnline ? "synced" : "pending",
      id: `${Date.now()}_${operationSequence.current}`,
    };
  }

  function replaceGuest(next: Guest) {
    setGuests((current) => current.map((guest) => guest.id === next.id ? next : guest));
  }

  function appendAudit(audit: AuditRecord) {
    setAuditRecords((current) => [audit, ...current]);
  }

  function checkIn(guest: Guest) {
    const result = recordCheckIn(guest, operationContext());
    setLastCheckIn({ guestId: guest.id, previous: guest });
    replaceGuest(result.guest);
    appendAudit(result.audit);
  }

  function confirmCorrection(guest: Guest) {
    if (!correctionReason.trim()) return;
    const result = recordCorrection(guest, correctionReason, operationContext());
    replaceGuest(result.guest);
    appendAudit(result.audit);
    setCorrectionOpen(false);
    setCorrectionReason("");
    setLastCheckIn(null);
  }

  function undoLastCheckIn() {
    if (!lastCheckIn) return;
    const currentGuest = guests.find((guest) => guest.id === lastCheckIn.guestId);
    if (!currentGuest) return;
    const result = recordCorrection(currentGuest, "Immediate undo by staff", operationContext());
    replaceGuest({ ...lastCheckIn.previous, status: result.guest.status, checkedInAt: result.guest.checkedInAt });
    appendAudit(result.audit);
    setLastCheckIn(null);
  }

  function queueGuestException(guest: Guest) {
    const result = createGuestException({
      guest,
      guestName: guestFullName(guest),
      reason: guest.tableId ? "identity_question" : "missing_assignment",
      details: guest.note ?? "Guest requires review before check-in.",
    }, operationContext());
    setExceptions((current) => [result.exception, ...current]);
    appendAudit(result.audit);
    setSelectedId(null);
    setView("exceptions");
  }

  function queueMissingGuest() {
    const result = createGuestException({
      guestName: query,
      reason: "guest_not_found",
      details: "No matching guest record after staff verified the spelling.",
    }, operationContext());
    setExceptions((current) => [result.exception, ...current]);
    appendAudit(result.audit);
    setQuery("");
    setView("exceptions");
  }

  function resolveException(item: GuestException, note: string) {
    const result = resolveGuestException(item, note, operationContext());
    setExceptions((current) => current.map((exception) => exception.id === item.id ? result.exception : exception));
    appendAudit(result.audit);
  }

  function syncPending() {
    if (!isOnline) return;
    setAuditRecords((current) => current.map((record) => (
      record.syncStatus === "pending" ? { ...record, syncStatus: "synced" } : record
    )));
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
          <button className={`sync-pill ${isOnline ? "online" : "offline"}`} onClick={() => setIsOnline((current) => !current)}>
            <span className="sync-dot" /> {isOnline ? "Online" : "Offline simulation"}
          </button>
          <span className="count"><strong>{checkedInCount}</strong><span> of {guests.length} arrived</span></span>
        </div>
      </header>

      <nav className="operation-nav" aria-label="Check-in sections">
        <button className={view === "arrivals" ? "active" : ""} onClick={() => setView("arrivals")}>Guest arrivals</button>
        <button className={view === "exceptions" ? "active" : ""} onClick={() => setView("exceptions")}>Event lead <span>{openExceptions.length}</span></button>
        <button className={view === "activity" ? "active" : ""} onClick={() => setView("activity")}>Activity <span>{auditRecords.length}</span></button>
        <div className={`queue-state ${pendingCount ? "pending" : ""}`}>
          {pendingCount ? `${pendingCount} pending in this session` : "All actions synced"}
          {pendingCount > 0 && isOnline && <button onClick={syncPending}>Sync now</button>}
        </div>
      </nav>

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
                const guestParty = source.parties.find((item) => item.id === guest.partyId);
                const guestTable = source.tables.find((item) => item.id === guest.tableId);
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
      {view === "activity" && <ActivityLog records={auditRecords} />}

      {lastCheckIn && <div className="undo-toast" role="status"><span><strong>{lastActionGuest ? guestFullName(lastActionGuest) : "Guest"}</strong> checked in.</span><button onClick={undoLastCheckIn}>Undo</button></div>}
    </main>
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

function ActivityLog({ records }: { records: AuditRecord[] }) {
  return (
    <section className="operations-panel">
      <div className="operations-heading"><div><p className="step-label">Accountability</p><h2>Event activity</h2></div><p>Every check-in, correction, escalation, and resolution identifies its actor and sync state.</p></div>
      {records.length === 0 ? <div className="empty-state compact"><span>↗</span><h2>No activity yet</h2><p>Event actions will be recorded here as staff work.</p></div> : (
        <div className="activity-list">{records.map((record) => <article key={record.id}><span className={`audit-sync ${record.syncStatus}`}>{record.syncStatus}</span><div><strong>{actionLabel(record.action)} · {record.subject}</strong><p>{record.reason ?? `Recorded by ${staff.displayName}`}</p></div><time>{formatTime(record.occurredAt)}</time></article>)}</div>
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
