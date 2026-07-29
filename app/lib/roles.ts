import type { Role } from "@/types";

const roles: Role[] = ["admin", "teacher", "parent", "student"];

export function roleDashboardPath(role?: string | null): string {
  return roles.includes(role as Role) ? `/dashboard/${role}` : "/login";
}
