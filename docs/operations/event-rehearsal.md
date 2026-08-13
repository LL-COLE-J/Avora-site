# Event rehearsal and reconciliation

## Required rehearsal

1. Configure Firebase, deploy the Firestore rules and indexes, and enroll two onsite devices with active event staff memberships.
2. On device A, force offline mode and check in a guest.
3. On device B, check in the same guest while online, then sync.
4. Bring device A online and sync. Its older operation must remain pending as a conflict rather than overwrite device B.
5. Retry a previously acknowledged operation ID. The remote guest and audit history must not duplicate.
6. Create and resolve an exception using volunteer and lead devices respectively.
7. Refresh both browsers and confirm local sessions and any pending operations survive.
8. Download the reconciliation CSV and retain it with the event closeout materials.

## Signoff

The in-app Rehearsal panel reports deterministic local safeguards and deployment activation. Live Firebase activation is intentionally a separate action-required item until the deployment variables and event device memberships exist.

The CSV includes guest state, exception state, immutable audit records, and still-pending operations. Cells beginning with spreadsheet formula characters are neutralized before export.

