# Foundational data model

The first check-in milestone uses stable string IDs and explicit status values. The model is intentionally narrow enough for Pink Gala 2027 while leaving clean relationships for later Avora modules.

| Entity | Current responsibility | Future extension point |
|---|---|---|
| `Event` | Event identity, venue, start time, lifecycle | branding, configuration, modules |
| `Guest` | Person, arrival status, party and table references | ticket, bidder, donor identities |
| `Party` | Arrival/household grouping | invitation and ticket grouping |
| `Table` | Seating destination | seats and floor-plan geometry |
| `StaffUser` | Actor and operational role | authentication and permissions |
| `AuditRecord` | Consequential check-in action | corrections, imports, seating changes |
| `GuestException` | Event-lead queue for missing guests, assignments, and identity questions | configurable exception policies |

Every consequential synthetic action now creates an `AuditRecord` with an actor, timestamp, subject, optional reason, and `synced` or `pending` status. Corrections and exception resolutions require a reason. A `PendingMutation` contains the complete guest or exception payload needed by the future remote adapter, plus a stable operation ID for retry safety.

The local session is versioned and persisted in browser storage. Guest state, exceptions, audit records, and the outbox survive refreshes and browser restarts. Rehearsal mode uses real browser connectivity plus an optional forced-offline switch. Pending mutations are deduplicated by operation ID and by entity/action while unsynced.

The `Sync now` action is still a synthetic acknowledgement. The Firebase adapter must exchange the same idempotency key with the remote store, retry automatically, and define conflict handling before event use.

The synthetic dataset is the only active data source. Firebase and real guest data remain disconnected until the synthetic workflow and production adapter contract are approved.
