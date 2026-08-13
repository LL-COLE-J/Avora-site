import { guestFullName } from "./guest-search";
import type {
  AuditRecord,
  CheckInAction,
  EntityId,
  ExceptionReason,
  Guest,
  GuestException,
  StaffUser,
  SyncStatus,
} from "./models";

export interface OperationContext {
  eventId: EntityId;
  staff: StaffUser;
  occurredAt: string;
  syncStatus: SyncStatus;
  id: string;
}

function auditRecord(
  context: OperationContext,
  action: CheckInAction,
  subject: string,
  guestId?: EntityId,
  reason?: string,
): AuditRecord {
  return {
    id: `audit_${context.id}`,
    eventId: context.eventId,
    guestId,
    staffUserId: context.staff.id,
    action,
    occurredAt: context.occurredAt,
    subject,
    syncStatus: context.syncStatus,
    reason,
  };
}

export function recordCheckIn(guest: Guest, context: OperationContext) {
  const nextGuest: Guest = {
    ...guest,
    status: "checked_in",
    checkedInAt: context.occurredAt,
  };

  return {
    guest: nextGuest,
    audit: auditRecord(context, "check_in", guestFullName(guest), guest.id),
  };
}

export function recordCorrection(guest: Guest, reason: string, context: OperationContext) {
  if (!reason.trim()) throw new Error("A correction reason is required.");

  const nextGuest: Guest = {
    ...guest,
    status: "expected",
    checkedInAt: undefined,
  };

  return {
    guest: nextGuest,
    audit: auditRecord(context, "undo_check_in", guestFullName(guest), guest.id, reason.trim()),
  };
}

export function createGuestException(
  input: { guest?: Guest; guestName: string; reason: ExceptionReason; details: string },
  context: OperationContext,
) {
  if (!input.guestName.trim()) throw new Error("A guest name or search term is required.");
  if (!input.details.trim()) throw new Error("Exception details are required.");

  const exception: GuestException = {
    id: `exception_${context.id}`,
    eventId: context.eventId,
    guestId: input.guest?.id,
    guestName: input.guestName.trim(),
    reason: input.reason,
    details: input.details.trim(),
    status: "open",
    createdAt: context.occurredAt,
    createdByStaffId: context.staff.id,
  };

  return {
    exception,
    audit: auditRecord(
      context,
      "create_exception",
      exception.guestName,
      input.guest?.id,
      exception.details,
    ),
  };
}

export function resolveGuestException(
  exception: GuestException,
  resolution: string,
  context: OperationContext,
) {
  if (!resolution.trim()) throw new Error("A resolution note is required.");

  const nextException: GuestException = {
    ...exception,
    status: "resolved",
    resolvedAt: context.occurredAt,
    resolvedByStaffId: context.staff.id,
  };

  return {
    exception: nextException,
    audit: auditRecord(
      context,
      "resolve_exception",
      exception.guestName,
      exception.guestId,
      resolution.trim(),
    ),
  };
}
