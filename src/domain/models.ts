export type EntityId = string;
export type EventStatus = "draft" | "ready" | "live" | "closed";
export type GuestStatus = "expected" | "checked_in" | "needs_attention";
export type CheckInAction = "check_in" | "undo_check_in";

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
  guestId: EntityId;
  staffUserId: EntityId;
  action: CheckInAction;
  occurredAt: string;
  reason?: string;
}

export interface CheckInDataset {
  event: Event;
  guests: Guest[];
  parties: Party[];
  tables: Table[];
  staff: StaffUser[];
}
