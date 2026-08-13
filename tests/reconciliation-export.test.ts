import { describe, expect, it } from "vitest";
import { defaultCheckInSession } from "../src/data/local-check-in-session";
import { pinkGala2027Synthetic } from "../src/data/synthetic/pink-gala-2027";
import { buildReconciliationCsv } from "../src/domain/reconciliation-export";

describe("reconciliation export", () => {
  it("exports guest, audit, and pending-operation rows", () => {
    const base = defaultCheckInSession(pinkGala2027Synthetic);
    const audit = {
      id: "audit_1",
      eventId: base.eventId,
      staffUserId: "staff_1",
      action: "check_in" as const,
      occurredAt: "2027-04-17T18:01:00-05:00",
      subject: "Amelia Bennett",
      syncStatus: "pending" as const,
      reason: "Confirmed at arrival",
    };
    const csv = buildReconciliationCsv({
      ...base,
      auditRecords: [audit],
      outbox: [{ id: "operation_1", eventId: base.eventId, auditId: audit.id, action: audit.action, createdAt: audit.occurredAt, attempts: 0, audit }],
    });
    expect(csv).toContain('"guest"');
    expect(csv).toContain('"audit","audit_1"');
    expect(csv).toContain('"pending_operation","operation_1"');
  });

  it("neutralizes spreadsheet formulas", () => {
    const base = defaultCheckInSession(pinkGala2027Synthetic);
    const guests = base.guests.map((guest, index) => index === 0 ? { ...guest, note: "=HYPERLINK(\"bad\")" } : guest);
    expect(buildReconciliationCsv({ ...base, guests })).toContain("'=HYPERLINK");
  });
});

