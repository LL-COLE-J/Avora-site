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

Every consequential synthetic action now creates an `AuditRecord` with an actor, timestamp, subject, optional reason, and `synced` or `pending` status. Corrections and exception resolutions require a reason.

The current offline switch is a review simulator: it demonstrates pending-action behavior within the active browser session. Durable IndexedDB persistence, automatic retry, conflict handling, and a production sync adapter remain required before event use.

The synthetic dataset is the only active data source. Firebase and real guest data remain disconnected until the synthetic workflow and production adapter contract are approved.
