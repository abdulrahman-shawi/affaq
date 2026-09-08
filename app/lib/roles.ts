import type { Role } from "@/types";

const roles: Role[] = ["admin", "supervisor", "teacher", "parent", "student"];

export function roleDashboardPath(role?: string | null): string {
  // المشرف يدخل على لوحة الأدمن لكن صفحته الأولى هي الطلاب — لوحة التحكم محظورة عليه
  if (role === "supervisor") return "/dashboard/admin/students";
  return roles.includes(role as Role) ? `/dashboard/${role}` : "/login";
}

/** الأدمن والمشرف يتشاركان صلاحيات الإدارة عدا لوحة التحكم والتقارير والمدفوعات وإدارة المشرفين */
export function isAdminAreaRole(role?: string | null): boolean {
  return role === "admin" || role === "supervisor";
}
