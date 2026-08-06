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
        <div>
          <p className="eyebrow">Avora live operations</p>
          <h1>{source.event.name}</h1>
          <p className="venue">{source.event.venueName} · Synthetic review</p>
        </div>
        <div className="status-cluster" aria-label="Event status">
          <span className="sync-pill"><span className="sync-dot" /> Local demo</span>
          <span className="count"><strong>{checkedInCount}</strong> / {guests.length} arrived</span>
        </div>
      </header>

      <section className="workspace" aria-label="Guest check-in workspace">
        <div className="search-panel">
          <label htmlFor="guest-search">Find a guest</label>
          <div className="search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              id="guest-search"
              autoComplete="off"
              autoFocus
              placeholder="Start typing a name…"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }}
            />
            {query && <button className="clear" onClick={() => { setQuery(""); setSelectedId(null); }}>Clear</button>}
          </div>

          <div className="result-summary" aria-live="polite">
            {query ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : "Search by first or last name"}
          </div>

          <div className="results">
            {!query && <EmptySearch />}
            {query && results.length === 0 && <NoResults query={query} />}
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
              <div className="detail-heading">
                <p className="eyebrow">Confirm identity</p>
                <h2>{guestFullName(selected)}</h2>
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
                <button className="text-action" onClick={() => setSelectedId(null)}>Back to results</button>
              </div>
            </>
          )}
        </aside>
      </section>

      {lastAction && <div className="undo-toast" role="status"><span>Check-in updated.</span><button onClick={undo}>Undo</button></div>}
    </main>
  );
}

function EmptySearch() {
  return <div className="empty-state"><span>⌕</span><h2>Ready for the next arrival</h2><p>Search by first or last name. Results appear as you type.</p></div>;
}

function NoResults({ query }: { query: string }) {
  return <div className="empty-state warning"><span>!</span><h2>No match for “{query}”</h2><p>Check the spelling or ask the event lead to handle an exception.</p><button>Open exception flow</button></div>;
}

function SelectPrompt() {
  return <div className="select-prompt"><span>01</span><p>Select a guest to confirm their party, table, and arrival status.</p></div>;
}
