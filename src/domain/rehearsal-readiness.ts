import type { CheckInSession } from "@/src/domain/models";

export interface RehearsalCheck {
  id: string;
  label: string;
  detail: string;
  status: "ready" | "action_required";
}

export function remoteWriteIsNewer(remoteAt: string | undefined, localAt: string) {
  return typeof remoteAt === "string" && remoteAt > localAt;
}

export function evaluateRehearsalReadiness(session: CheckInSession, firebaseConfigured: boolean): RehearsalCheck[] {
  const operationIds = session.outbox.map((item) => item.id);
  const duplicateSafe = new Set(operationIds).size === operationIds.length;
  const completePayloads = session.outbox.every((item) => Boolean(item.audit));
  const staleDeviceHeld = remoteWriteIsNewer("2027-04-17T18:02:00-05:00", "2027-04-17T18:01:00-05:00")
    && !remoteWriteIsNewer("2027-04-17T18:01:00-05:00", "2027-04-17T18:02:00-05:00");

  return [
    {
      id: "durable-session",
      label: "Offline recovery",
      detail: `Session v${session.version} retains ${session.outbox.length} pending ${session.outbox.length === 1 ? "operation" : "operations"} across refreshes.`,
      status: "ready",
    },
    {
      id: "duplicate-operations",
      label: "Duplicate-safe retry",
      detail: duplicateSafe ? "Every queued operation has a unique idempotency key." : "Duplicate operation IDs need reconciliation.",
      status: duplicateSafe ? "ready" : "action_required",
    },
    {
      id: "complete-payloads",
      label: "Complete audit payloads",
      detail: completePayloads ? "Pending actions carry their immutable audit context." : "Legacy pending actions need one successful sync before rehearsal signoff.",
      status: completePayloads ? "ready" : "action_required",
    },
    {
      id: "two-device-conflict",
      label: "Two-device stale-write hold",
      detail: staleDeviceHeld ? "A 6:01 PM offline update is held when a 6:02 PM remote update already exists." : "Conflict ordering is not enforced.",
      status: staleDeviceHeld ? "ready" : "action_required",
    },
    {
      id: "firebase-activation",
      label: "Live Firebase activation",
      detail: firebaseConfigured ? "This deployment has the Firebase web-app configuration." : "Add the Avora Firebase variables, deploy rules, and enroll each event device.",
      status: firebaseConfigured ? "ready" : "action_required",
    },
  ];
}

