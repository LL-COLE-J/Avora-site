"use client";

import { useMemo, useState } from "react";
import { pinkGala2027Synthetic } from "@/src/data/synthetic/pink-gala-2027";
import { duplicateNameIds, guestFullName, searchGuests } from "@/src/domain/guest-search";
import type { Guest } from "@/src/domain/models";

const source = pinkGala2027Synthetic;

function formatTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function CheckInConsole() {
  const [guests, setGuests] = useState<Guest[]>(source.guests);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ guestId: string; previous: Guest } | null>(null);

  const duplicates = useMemo(() => duplicateNameIds(guests), [guests]);
  const results = useMemo(() => searchGuests(guests, query), [guests, query]);
  const selected = guests.find((guest) => guest.id === selectedId);
  const checkedInCount = guests.filter((guest) => guest.status === "checked_in").length;
  const party = selected ? source.parties.find((item) => item.id === selected.partyId) : undefined;
  const table = selected ? source.tables.find((item) => item.id === selected.tableId) : undefined;
  const partyGuests = party ? guests.filter((guest) => party.guestIds.includes(guest.id)) : [];
  const selectedName = selected ? guestFullName(selected) : "";
  const lastActionGuest = lastAction ? guests.find((guest) => guest.id === lastAction.guestId) : undefined;

  function replaceGuest(next: Guest) {
    setGuests((current) => current.map((guest) => guest.id === next.id ? next : guest));
  }

  function checkIn(guest: Guest) {
    setLastAction({ guestId: guest.id, previous: guest });
    replaceGuest({ ...guest, status: "checked_in", checkedInAt: new Date().toISOString() });
  }

  function correctCheckIn(guest: Guest) {
    setLastAction({ guestId: guest.id, previous: guest });
    replaceGuest({ ...guest, status: "expected", checkedInAt: undefined });
  }

  function undo() {
    if (!lastAction) return;
    replaceGuest(lastAction.previous);
    setLastAction(null);
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
          <span className="sync-pill"><span className="sync-dot" /> Ready on this device</span>
          <span className="count"><strong>{checkedInCount}</strong><span> of {guests.length} arrived</span></span>
        </div>
      </header>

      <section className="workspace" aria-label="Guest check-in workspace">
        <div className="search-panel">
          <div className="panel-heading">
            <div>
              <p className="step-label">Arrival 01</p>
              <h2>Find a guest</h2>
            </div>
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
            {query && results.length === 0 && <NoResults query={query} onClear={() => setQuery("")} />}
            {results.map((guest) => {
              const guestParty = source.parties.find((item) => item.id === guest.partyId);
              const guestTable = source.tables.find((item) => item.id === guest.tableId);
              return (
                <button key={guest.id} className={`guest-result ${selectedId === guest.id ? "selected" : ""}`} onClick={() => setSelectedId(guest.id)}>
                  <span>
                    <strong>{guestFullName(guest)}</strong>
                    <small>{guestParty?.displayName}{guestTable ? ` · ${guestTable.label}` : " · No table"}</small>
                  </span>
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
                  <button className="secondary-action" onClick={() => correctCheckIn(selected)}>Correct check-in</button>
                ) : (
                  <button className="primary-action" onClick={() => checkIn(selected)} disabled={selected.status === "needs_attention"}>Check in {selected.firstName}</button>
                )}
                <button className="text-action" onClick={() => setSelectedId(null)}>Back to guest results</button>
              </div>
            </>
          )}
        </aside>
      </section>

      {lastAction && <div className="undo-toast" role="status"><span><strong>{lastActionGuest ? guestFullName(lastActionGuest) : "Guest"}</strong> updated.</span><button onClick={undo}>Undo</button></div>}
    </main>
  );
}

function EmptySearch() {
  return <div className="empty-state"><span>✦</span><h2>Ready for the next arrival</h2><p>Welcome guests, confirm their party and table, then record their arrival.</p></div>;
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return <div className="empty-state warning"><span>!</span><h2>No match for “{query}”</h2><p>Check the spelling. If the guest still cannot be found, ask the event lead for help.</p><button onClick={onClear}>Clear and search again</button></div>;
}

function SelectPrompt() {
  return <div className="select-prompt"><span>02</span><h2>Confirm the guest</h2><p>Select a guest to verify their party, table, and arrival status.</p></div>;
}
