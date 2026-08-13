import type { CheckInAction, StaffUser } from "@/src/domain/models";

export function requiredRole(action: CheckInAction): StaffUser["role"] {
  if (action === "import_guests") return "admin";
  if (action === "resolve_exception") return "lead";
  return "volunteer";
}

export function hasStaffRole(actual: StaffUser["role"], required: StaffUser["role"]) {
  const ranks: Record<StaffUser["role"], number> = { volunteer: 1, lead: 2, admin: 3 };
  return ranks[actual] >= ranks[required];
}

