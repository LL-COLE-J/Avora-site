import type { PendingMutation, StaffUser } from "@/src/domain/models";

export type SyncOutcomeStatus = "acknowledged" | "conflict" | "rejected";

export interface SyncOutcome {
  mutationId: string;
  status: SyncOutcomeStatus;
  message?: string;
}

export interface AuthenticatedEventStaff extends StaffUser {
  uid: string;
}

export interface CheckInSyncResult {
  staff: AuthenticatedEventStaff;
  outcomes: SyncOutcome[];
}

export interface CheckInSyncAdapter {
  sync(eventId: string, mutations: PendingMutation[]): Promise<CheckInSyncResult>;
}

