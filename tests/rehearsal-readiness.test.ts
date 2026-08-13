import { describe, expect, it } from "vitest";
import { defaultCheckInSession } from "../src/data/local-check-in-session";
import { pinkGala2027Synthetic } from "../src/data/synthetic/pink-gala-2027";
import { evaluateRehearsalReadiness, remoteWriteIsNewer } from "../src/domain/rehearsal-readiness";

describe("rehearsal readiness", () => {
  it("holds a stale device write when the remote edit is newer", () => {
    expect(remoteWriteIsNewer("2027-04-17T18:02:00-05:00", "2027-04-17T18:01:00-05:00")).toBe(true);
    expect(remoteWriteIsNewer("2027-04-17T18:01:00-05:00", "2027-04-17T18:02:00-05:00")).toBe(false);
  });

  it("keeps live activation explicit", () => {
    const checks = evaluateRehearsalReadiness(defaultCheckInSession(pinkGala2027Synthetic), false);
    expect(checks.find((item) => item.id === "two-device-conflict")?.status).toBe("ready");
    expect(checks.find((item) => item.id === "firebase-activation")?.status).toBe("action_required");
  });
});

