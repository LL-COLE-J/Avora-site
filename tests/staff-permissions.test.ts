import { describe, expect, it } from "vitest";
import { hasStaffRole, requiredRole } from "../src/domain/staff-permissions";

describe("event staff permissions", () => {
  it("allows volunteers to record arrivals and create exceptions", () => {
    expect(requiredRole("check_in")).toBe("volunteer");
    expect(requiredRole("create_exception")).toBe("volunteer");
    expect(hasStaffRole("volunteer", "volunteer")).toBe(true);
  });

  it("reserves resolution for leads and admins", () => {
    expect(requiredRole("resolve_exception")).toBe("lead");
    expect(hasStaffRole("volunteer", "lead")).toBe(false);
    expect(hasStaffRole("lead", "lead")).toBe(true);
    expect(hasStaffRole("admin", "lead")).toBe(true);
  });

  it("reserves guest imports for admins", () => {
    expect(requiredRole("import_guests")).toBe("admin");
    expect(hasStaffRole("lead", "admin")).toBe(false);
    expect(hasStaffRole("admin", "admin")).toBe(true);
  });
});

