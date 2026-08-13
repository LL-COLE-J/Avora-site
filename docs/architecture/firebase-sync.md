# Firebase check-in sync

## Collections

All event data is scoped below `events/{eventId}`. Staff membership documents use the authenticated Firebase UID as their document ID.

| Collection | Purpose |
| --- | --- |
| `staff` | Event-scoped `volunteer`, `lead`, or `admin` membership |
| `guests`, `parties`, `tables` | Operational arrival dataset |
| `exceptions` | Event-lead review queue |
| `auditRecords` | Immutable action history |
| `operations` | Stable idempotency keys and import progress |

## Device enrollment

The browser signs in anonymously when it first attempts a sync. An administrator must then create `events/{eventId}/staff/{uid}` with `active: true`, a `displayName`, and a valid `role`. A device without active event membership cannot read or write event data.

## Retry and conflict policy

- Every local outbox item becomes an `operations/{operationId}` document.
- An existing operation document acknowledges a retry without applying it twice.
- Guest and exception writes use a Firestore transaction. A later remote `lastOperationAt` produces a conflict and leaves the local item pending for reconciliation.
- Guest-list imports are admin-only and use deterministic document IDs in restart-safe batches. The operation is complete only after every document and the audit record are committed.
- Audit records are immutable after creation.
- New outbox records include the complete audit payload. Legacy pending records fall back to the operation metadata and remain retryable.

## Deployment setup

1. Create the Firebase web app and enable Cloud Firestore and Anonymous Authentication.
2. Copy the web app values into the `NEXT_PUBLIC_FIREBASE_*` deployment variables shown in `.env.example`.
3. Deploy `firestore.rules` and `firestore.indexes.json` with the Firebase CLI.
4. Attempt one sync on each onsite device, note its anonymous UID, and add its event staff membership from a trusted admin environment.
5. Run the multi-device rehearsal before event day.
