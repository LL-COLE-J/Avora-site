import { describe, expect, it } from "vitest";
import { pinkGala2027Synthetic } from "../src/data/synthetic/pink-gala-2027";
import {
  acknowledgeMutations,
  createPendingMutation,
  defaultCheckInSession,
  enqueueMutation,
  parseStoredSession,
} from "../src/data/local-check-in-session";
import { recordCheckIn } from "../src/domain/check-in-operations";

const fallback = defaultCheckInSession(pinkGala2027Synthetic);

describe("local check-in session", () => {
  it("rejects corrupt and incompatible saved sessions", () => {
    expect(parseStoredSession("not json", fallback)).toBe(fallback);
    expect(parseStoredSession(JSON.stringify({ ...fallback, version: 2 }), fallback)).toBe(fallback);
    expect(parseStoredSession(JSON.stringify({ ...fallback, eventId: "another_event" }), fallback)).toBe(fallback);
  });

  it("restores a valid versioned session", () => {
    const saved = { ...fallback, updatedAt: "2027-04-17T18:02:00-05:00" };
    expect(parseStoredSession(JSON.stringify(saved), fallback)).toEqual(saved);
  });

  it("does not enqueue the same operation twice", () => {
    const result = recordCheckIn(pinkGala2027Synthetic.guests[0], {
      eventId: fallback.eventId,
      staff: pinkGala2027Synthetic.staff[0],
      occurredAt: "2027-04-17T18:02:00-05:00",
      syncStatus: "pending",
      id: "operation_1",
    });
    const mutation = createPendingMutation({ id: "operation_1", audit: result.audit, guest: result.guest });
    expect(mutation.audit).toEqual(result.audit);
    expect(enqueueMutation([mutation], mutation)).toHaveLength(1);
    expect(enqueueMutation([mutation], { ...mutation, id: "operation_2" })).toHaveLength(1);
  });

  it("acknowledges only selected mutations and marks their audits synced", () => {
    const result = recordCheckIn(pinkGala2027Synthetic.guests[0], {
      eventId: fallback.eventId,
      staff: pinkGala2027Synthetic.staff[0],
      occurredAt: "2027-04-17T18:02:00-05:00",
      syncStatus: "pending",
      id: "operation_1",
    });
    const mutation = createPendingMutation({ id: "operation_1", audit: result.audit, guest: result.guest });
    const next = acknowledgeMutations({ ...fallback, auditRecords: [result.audit], outbox: [mutation] }, [mutation.id], "2027-04-17T18:03:00-05:00");
    expect(next.outbox).toEqual([]);
    expect(next.auditRecords[0].syncStatus).toBe("synced");
  });
});
