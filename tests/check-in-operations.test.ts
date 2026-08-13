import { describe, expect, it } from "vitest";
import {
  createGuestException,
  recordCheckIn,
  recordCorrection,
  resolveGuestException,
} from "../src/domain/check-in-operations";
import { pinkGala2027Synthetic } from "../src/data/synthetic/pink-gala-2027";
import type { OperationContext } from "../src/domain/check-in-operations";

const guest = pinkGala2027Synthetic.guests[0];
const staff = pinkGala2027Synthetic.staff[0];
const context: OperationContext = {
  eventId: pinkGala2027Synthetic.event.id,
  staff,
  occurredAt: "2027-04-17T18:04:00-05:00",
  syncStatus: "pending",
  id: "test_1",
};

describe("check-in operations", () => {
  it("records a check-in and its pending audit entry", () => {
    const result = recordCheckIn(guest, context);
    expect(result.guest.status).toBe("checked_in");
    expect(result.audit).toMatchObject({ action: "check_in", subject: "Amelia Bennett", syncStatus: "pending" });
  });

  it("requires a reason before correcting a check-in", () => {
    const checkedIn = recordCheckIn(guest, context).guest;
    expect(() => recordCorrection(checkedIn, "   ", context)).toThrow("correction reason");
    expect(recordCorrection(checkedIn, "Selected wrong guest", context).audit.reason).toBe("Selected wrong guest");
  });

  it("creates a named exception when a search has no match", () => {
    const result = createGuestException({
      guestName: "Jamie Parker",
      reason: "guest_not_found",
      details: "No record found after spelling check.",
    }, context);
    expect(result.exception).toMatchObject({ guestName: "Jamie Parker", status: "open" });
    expect(result.audit.action).toBe("create_exception");
  });

  it("requires a resolution note and closes an exception", () => {
    const open = createGuestException({
      guest,
      guestName: "Amelia Bennett",
      reason: "identity_question",
      details: "Confirm party.",
    }, context).exception;
    expect(() => resolveGuestException(open, "", context)).toThrow("resolution note");
    expect(resolveGuestException(open, "Identity confirmed", context).exception.status).toBe("resolved");
  });
});
