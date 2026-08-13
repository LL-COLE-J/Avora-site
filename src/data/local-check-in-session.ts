import type {
  AuditRecord,
  CheckInDataset,
  CheckInSession,
  GuestException,
  PendingMutation,
} from "@/src/domain/models";

export const CHECK_IN_SESSION_VERSION = 1 as const;
export const CHECK_IN_STORAGE_KEY = "avora.check-in-session.v1";

export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultCheckInSession(dataset: CheckInDataset): CheckInSession {
  return {
    version: CHECK_IN_SESSION_VERSION,
    eventId: dataset.event.id,
    updatedAt: dataset.event.startsAt,
    guests: dataset.guests,
    parties: dataset.parties,
    tables: dataset.tables,
    exceptions: [],
    auditRecords: [],
    outbox: [],
  };
}

export function parseStoredSession(raw: string | null, fallback: CheckInSession): CheckInSession {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as Partial<CheckInSession>;
    if (
      value.version !== CHECK_IN_SESSION_VERSION
      || value.eventId !== fallback.eventId
      || !Array.isArray(value.guests)
      || !Array.isArray(value.parties)
      || !Array.isArray(value.tables)
      || !Array.isArray(value.exceptions)
      || !Array.isArray(value.auditRecords)
      || !Array.isArray(value.outbox)
      || typeof value.updatedAt !== "string"
    ) return fallback;
    return value as CheckInSession;
  } catch {
    return fallback;
  }
}

export function enqueueMutation(current: PendingMutation[], mutation: PendingMutation) {
  const duplicatesPendingEntityAction = current.some((item) => (
    item.id === mutation.id
    || (
      item.action === mutation.action
      && item.guest?.id === mutation.guest?.id
      && item.exception?.id === mutation.exception?.id
      && Boolean(item.guest?.id || item.exception?.id)
    )
  ));
  return duplicatesPendingEntityAction ? current : [...current, mutation];
}

export function acknowledgeMutations(session: CheckInSession, mutationIds: string[], occurredAt: string): CheckInSession {
  const acknowledged = new Set(mutationIds);
  const auditIds = new Set(session.outbox.filter((item) => acknowledged.has(item.id)).map((item) => item.auditId));
  return {
    ...session,
    updatedAt: occurredAt,
    outbox: session.outbox.filter((item) => !acknowledged.has(item.id)),
    auditRecords: session.auditRecords.map((record) => (
      auditIds.has(record.id) ? { ...record, syncStatus: "synced" } : record
    )),
  };
}

export function createPendingMutation(input: {
  id: string;
  audit: AuditRecord;
  guest?: PendingMutation["guest"];
  guests?: PendingMutation["guests"];
  parties?: PendingMutation["parties"];
  tables?: PendingMutation["tables"];
  exception?: GuestException;
}): PendingMutation {
  return {
    id: input.id,
    eventId: input.audit.eventId,
    auditId: input.audit.id,
    action: input.audit.action,
    createdAt: input.audit.occurredAt,
    attempts: 0,
    audit: input.audit,
    guest: input.guest,
    guests: input.guests,
    parties: input.parties,
    tables: input.tables,
    exception: input.exception,
  };
}

export function createLocalCheckInStore(fallback: CheckInSession) {
  let snapshot = fallback;
  let initialized = false;
  const listeners = new Set<() => void>();

  function storage(): BrowserStorage | null {
    return typeof window === "undefined" ? null : window.localStorage;
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    snapshot = parseStoredSession(storage()?.getItem(CHECK_IN_STORAGE_KEY) ?? null, fallback);
  }

  function persist(next: CheckInSession) {
    storage()?.setItem(CHECK_IN_STORAGE_KEY, JSON.stringify(next));
  }

  return {
    getSnapshot() {
      initialize();
      return snapshot;
    },
    getServerSnapshot() {
      return fallback;
    },
    subscribe(listener: () => void) {
      initialize();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(updater: (current: CheckInSession) => CheckInSession) {
      initialize();
      const next = updater(snapshot);
      if (next === snapshot) return;
      snapshot = next;
      persist(snapshot);
      listeners.forEach((listener) => listener());
    },
    reset() {
      snapshot = fallback;
      initialized = true;
      storage()?.removeItem(CHECK_IN_STORAGE_KEY);
      listeners.forEach((listener) => listener());
    },
  };
}

export function subscribeToNetworkStatus(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function getNetworkStatus() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}
