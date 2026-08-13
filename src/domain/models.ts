export type EntityId = string;
export type EventStatus = "draft" | "ready" | "live" | "closed";
export type GuestStatus = "expected" | "checked_in" | "needs_attention";
export type CheckInAction = "check_in" | "undo_check_in" | "create_exception" | "resolve_exception" | "import_guests";
export type SyncStatus = "synced" | "pending";
export type ExceptionStatus = "open" | "resolved";
export type ExceptionReason = "guest_not_found" | "missing_assignment" | "identity_question" | "other";

export interface Event {
  id: EntityId;
  name: string;
  startsAt: string;
  venueName: string;
  status: EventStatus;
}

export interface Party {
  id: EntityId;
  displayName: string;
  guestIds: EntityId[];
}

export interface Table {
  id: EntityId;
  label: string;
  zone?: string;
}

export interface Guest {
  id: EntityId;
  eventId: EntityId;
  partyId: EntityId;
  firstName: string;
  lastName: string;
  tableId?: EntityId;
  status: GuestStatus;
  note?: string;
  checkedInAt?: string;
}

export interface StaffUser {
  id: EntityId;
  displayName: string;
  role: "volunteer" | "lead" | "admin";
}

export interface AuditRecord {
  id: EntityId;
  eventId: EntityId;
  guestId?: EntityId;
  staffUserId: EntityId;
  action: CheckInAction;
  occurredAt: string;
  subject: string;
  syncStatus: SyncStatus;
  reason?: string;
}

export interface GuestException {
  id: EntityId;
  eventId: EntityId;
  guestId?: EntityId;
  guestName: string;
  reason: ExceptionReason;
  details: string;
  status: ExceptionStatus;
  createdAt: string;
  createdByStaffId: EntityId;
  resolvedAt?: string;
  resolvedByStaffId?: EntityId;
}

export interface PendingMutation {
  id: EntityId;
  eventId: EntityId;
  auditId: EntityId;
  action: CheckInAction;
  createdAt: string;
  attempts: number;
  audit?: AuditRecord;
  guest?: Guest;
  guests?: Guest[];
  parties?: Party[];
  tables?: Table[];
  exception?: GuestException;
}

export interface CheckInSession {
  version: 1;
  eventId: EntityId;
  updatedAt: string;
  guests: Guest[];
  parties: Party[];
  tables: Table[];
  exceptions: GuestException[];
  auditRecords: AuditRecord[];
  outbox: PendingMutation[];
}

export interface CheckInDataset {
  event: Event;
  guests: Guest[];
  parties: Party[];
  tables: Table[];
  staff: StaffUser[];
}
