import type { Role } from "@/types";

const roles: Role[] = ["admin", "supervisor", "teacher", "parent", "student"];

export function roleDashboardPath(role?: string | null): string {
  // المشرف يدخل على لوحة الأدمن نفسها
  if (role === "supervisor") return "/dashboard/admin";
  return roles.includes(role as Role) ? `/dashboard/${role}` : "/login";
}

/** الأدمن والمشرف يتشاركان صلاحيات الإدارة عدا المدفوعات وإدارة المشرفين */
export function isAdminAreaRole(role?: string | null): boolean {
  return role === "admin" || role === "supervisor";
}
