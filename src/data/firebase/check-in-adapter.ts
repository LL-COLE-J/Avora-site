import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type {
  AuthenticatedEventStaff,
  CheckInSyncAdapter,
  CheckInSyncResult,
  SyncOutcome,
} from "@/src/data/check-in-sync-adapter";
import { getFirebaseConfig } from "@/src/data/firebase/config";
import type { PendingMutation, StaffUser } from "@/src/domain/models";
import { hasStaffRole, requiredRole } from "@/src/domain/staff-permissions";

const IMPORT_BATCH_SIZE = 400;

class MutationConflictError extends Error {}

function remoteAudit(mutation: PendingMutation, staff: AuthenticatedEventStaff) {
  return {
    ...mutation.audit,
    eventId: mutation.eventId,
    staffUserId: staff.uid,
    action: mutation.action,
    occurredAt: mutation.createdAt,
    syncStatus: "synced",
  };
}

async function syncImport(
  db: ReturnType<typeof getFirestore>,
  eventId: string,
  mutation: PendingMutation,
  staff: AuthenticatedEventStaff,
) {
  if (!mutation.guests || !mutation.parties || !mutation.tables) {
    throw new Error("Import payload is incomplete.");
  }

  const operationRef = doc(db, "events", eventId, "operations", mutation.id);
  const existing = await getDoc(operationRef);
  if (existing.data()?.status === "complete") return;

  const entries = [
    ...mutation.guests.map((value) => ({ collection: "guests", id: value.id, value })),
    ...mutation.parties.map((value) => ({ collection: "parties", id: value.id, value })),
    ...mutation.tables.map((value) => ({ collection: "tables", id: value.id, value })),
  ];

  for (let offset = 0; offset < entries.length; offset += IMPORT_BATCH_SIZE) {
    const batch = writeBatch(db);
    entries.slice(offset, offset + IMPORT_BATCH_SIZE).forEach((entry) => {
      batch.set(doc(db, "events", eventId, entry.collection, entry.id), {
        ...entry.value,
        lastOperationId: mutation.id,
        lastOperationAt: mutation.createdAt,
      });
    });
    batch.set(operationRef, {
      action: mutation.action,
      actorUid: staff.uid,
      createdAt: mutation.createdAt,
      status: "applying",
      appliedCount: Math.min(offset + IMPORT_BATCH_SIZE, entries.length),
      totalCount: entries.length,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  }

  const finalBatch = writeBatch(db);
  finalBatch.set(doc(db, "events", eventId, "auditRecords", mutation.auditId), {
    ...remoteAudit(mutation, staff),
    subject: `${mutation.guests.length} guests`,
  });
  finalBatch.set(operationRef, {
    action: mutation.action,
    actorUid: staff.uid,
    createdAt: mutation.createdAt,
    status: "complete",
    appliedCount: entries.length,
    totalCount: entries.length,
    completedAt: serverTimestamp(),
  }, { merge: true });
  await finalBatch.commit();
}

async function syncOperationalMutation(
  db: ReturnType<typeof getFirestore>,
  eventId: string,
  mutation: PendingMutation,
  staff: AuthenticatedEventStaff,
) {
  const operationRef = doc(db, "events", eventId, "operations", mutation.id);
  await runTransaction(db, async (transaction) => {
    const operation = await transaction.get(operationRef);
    if (operation.exists()) return;

    const targetRef = mutation.guest
      ? doc(db, "events", eventId, "guests", mutation.guest.id)
      : mutation.exception
        ? doc(db, "events", eventId, "exceptions", mutation.exception.id)
        : null;
    const target = targetRef ? await transaction.get(targetRef) : null;
    const lastOperationAt = target?.data()?.lastOperationAt;
    if (typeof lastOperationAt === "string" && lastOperationAt > mutation.createdAt) {
      throw new MutationConflictError("A newer device update already exists for this record.");
    }

    if (targetRef && mutation.guest) {
      transaction.set(targetRef, {
        ...mutation.guest,
        lastOperationId: mutation.id,
        lastOperationAt: mutation.createdAt,
      }, { merge: true });
    }
    if (targetRef && mutation.exception) {
      transaction.set(targetRef, {
        ...mutation.exception,
        createdByStaffId: mutation.exception.createdByStaffId === "staff_demo"
          ? staff.uid
          : mutation.exception.createdByStaffId,
        resolvedByStaffId: mutation.exception.status === "resolved" ? staff.uid : null,
        lastOperationId: mutation.id,
        lastOperationAt: mutation.createdAt,
      }, { merge: true });
    }
    transaction.set(doc(db, "events", eventId, "auditRecords", mutation.auditId), {
      ...remoteAudit(mutation, staff),
      guestId: mutation.guest?.id ?? mutation.exception?.guestId ?? null,
      subject: mutation.guest
        ? `${mutation.guest.firstName} ${mutation.guest.lastName}`
        : mutation.exception?.guestName ?? "Guest operation",
    });
    transaction.set(operationRef, {
      action: mutation.action,
      actorUid: staff.uid,
      createdAt: mutation.createdAt,
      status: "complete",
      completedAt: serverTimestamp(),
    });
  });
}

export function createFirebaseCheckInAdapter(): CheckInSyncAdapter {
  return {
    async sync(eventId: string, mutations: PendingMutation[]): Promise<CheckInSyncResult> {
      const config = getFirebaseConfig();
      if (!config) throw new Error("Firebase is not configured for this deployment.");
      const app = getApps().length ? getApp() : initializeApp(config);
      const auth = getAuth(app);
      const credential = auth.currentUser ?? (await signInAnonymously(auth)).user;
      const db = getFirestore(app);
      const membership = await getDoc(doc(db, "events", eventId, "staff", credential.uid));
      if (!membership.exists() || membership.data().active !== true) {
        throw new Error("This device is not assigned to the event staff roster.");
      }
      const role = membership.data().role as StaffUser["role"];
      const staff: AuthenticatedEventStaff = {
        id: credential.uid,
        uid: credential.uid,
        displayName: String(membership.data().displayName ?? "Event staff"),
        role,
      };
      const outcomes: SyncOutcome[] = [];

      for (const mutation of mutations) {
        if (!hasStaffRole(role, requiredRole(mutation.action))) {
          outcomes.push({
            mutationId: mutation.id,
            status: "rejected",
            message: `${requiredRole(mutation.action)} access is required.`,
          });
          continue;
        }
        try {
          if (mutation.action === "import_guests") {
            await syncImport(db, eventId, mutation, staff);
          } else {
            await syncOperationalMutation(db, eventId, mutation, staff);
          }
          outcomes.push({ mutationId: mutation.id, status: "acknowledged" });
        } catch (error) {
          outcomes.push({
            mutationId: mutation.id,
            status: error instanceof MutationConflictError ? "conflict" : "rejected",
            message: error instanceof Error ? error.message : "Sync failed.",
          });
        }
      }
      return { staff, outcomes };
    },
  };
}
