import type { CheckInSession } from "@/src/domain/models";
import { guestFullName } from "./guest-search";

const HEADERS = [
  "record_type",
  "record_id",
  "subject",
  "action",
  "status",
  "occurred_at",
  "staff_id",
  "sync_state",
  "details",
];

function safeCsvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReconciliationCsv(session: CheckInSession) {
  const rows: unknown[][] = [];

  session.guests.forEach((guest) => rows.push([
    "guest",
    guest.id,
    guestFullName(guest),
    "arrival",
    guest.status,
    guest.checkedInAt,
    "",
    guest.status === "checked_in" ? "recorded" : "not_applicable",
    guest.note,
  ]));
  session.exceptions.forEach((item) => rows.push([
    "exception",
    item.id,
    item.guestName,
    item.reason,
    item.status,
    item.resolvedAt ?? item.createdAt,
    item.resolvedByStaffId ?? item.createdByStaffId,
    "recorded",
    item.details,
  ]));
  session.auditRecords.forEach((record) => rows.push([
    "audit",
    record.id,
    record.subject,
    record.action,
    "complete",
    record.occurredAt,
    record.staffUserId,
    record.syncStatus,
    record.reason,
  ]));
  session.outbox.forEach((mutation) => rows.push([
    "pending_operation",
    mutation.id,
    mutation.audit?.subject ?? mutation.guest?.firstName ?? mutation.exception?.guestName ?? "Guest import",
    mutation.action,
    "pending",
    mutation.createdAt,
    mutation.audit?.staffUserId,
    "pending",
    `attempts=${mutation.attempts}`,
  ]));

  return [HEADERS, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
}
