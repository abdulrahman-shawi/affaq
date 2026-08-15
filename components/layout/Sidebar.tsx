"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  MessagesSquare,
  ChartBar,
  BookOpen,
  FileText,
  Inbox,
  Baby,
  School,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const roleNav: Record<Role, NavItem[]> = {
  admin: [
    { href: "/dashboard/admin", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/dashboard/admin/students", label: "الطلاب", icon: GraduationCap },
    { href: "/dashboard/admin/teachers", label: "المعلمون", icon: Users },
    { href: "/dashboard/admin/parents", label: "أولياء الأمور", icon: Baby },
    { href: "/dashboard/admin/classes", label: "الصفوف", icon: School },
    { href: "/dashboard/admin/timetable", label: "الجدول الأسبوعي", icon: CalendarDays },
    { href: "/dashboard/admin/subjects", label: "المواد", icon: BookOpen },
    { href: "/dashboard/admin/payments", label: "المدفوعات", icon: CreditCard },
    { href: "/dashboard/admin/attendance", label: "الحضور", icon: CalendarCheck },
    { href: "/dashboard/admin/grades", label: "الدرجات", icon: ClipboardList },
    { href: "/dashboard/admin/messages", label: "الرسائل", icon: MessagesSquare },
    { href: "/dashboard/admin/reports", label: "التقارير", icon: ChartBar },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/dashboard/teacher/students", label: "طلابي", icon: GraduationCap },
    { href: "/dashboard/teacher/sessions", label: "الحصص", icon: BookOpen },
    { href: "/dashboard/teacher/timetable", label: "الجدول الأسبوعي", icon: CalendarDays },
    { href: "/dashboard/teacher/assignments", label: "الواجبات", icon: FileText },
    { href: "/dashboard/teacher/submissions", label: "التسليمات", icon: Inbox },
    { href: "/dashboard/teacher/grades", label: "الدرجات", icon: ClipboardList },
    { href: "/dashboard/teacher/messages", label: "الرسائل", icon: MessagesSquare },
  ],
  parent: [
    { href: "/dashboard/parent", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/dashboard/parent/children", label: "أبنائي", icon: Baby },
    { href: "/dashboard/parent/timetable", label: "الجدول الأسبوعي", icon: CalendarDays },
    { href: "/dashboard/parent/attendance", label: "الحضور", icon: CalendarCheck },
    { href: "/dashboard/parent/grades", label: "الدرجات", icon: ClipboardList },
    { href: "/dashboard/parent/messages", label: "الرسائل", icon: MessagesSquare },
  ],
  student: [
    { href: "/dashboard/student", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/dashboard/student/assignments", label: "واجباتي", icon: FileText },
    { href: "/dashboard/student/sessions", label: "حصصي", icon: BookOpen },
    { href: "/dashboard/student/timetable", label: "الجدول الأسبوعي", icon: CalendarDays },
    { href: "/dashboard/student/recordings", label: "التسجيلات", icon: Video },
    { href: "/dashboard/student/grades", label: "درجاتي", icon: ClipboardList },
    { href: "/dashboard/student/messages", label: "الرسائل", icon: MessagesSquare },
  ],
};

export const roleAccent: Record<Role, { active: string; logo: string }> = {
  admin: { active: "bg-blue-100 text-blue-700", logo: "text-blue-600" },
  teacher: { active: "bg-emerald-100 text-emerald-700", logo: "text-emerald-600" },
  parent: { active: "bg-amber-100 text-amber-700", logo: "text-amber-600" },
  student: { active: "bg-violet-100 text-violet-700", logo: "text-violet-600" },
};

export const roleLabels: Record<Role, string> = {
  admin: "مدير النظام",
  teacher: "معلم",
  parent: "ولي أمر",
  student: "طالب",
};

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = roleNav[role];
  const accent = roleAccent[role];

  return (
    <aside className="flex h-full w-64 flex-col border-l bg-card">
      <div className="flex items-center gap-2 border-b p-6">
        <GraduationCap className={cn("h-8 w-8", accent.logo)} />
        <span className="text-xl font-bold">آفاق أكاديمي</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) => {
          const isActive =
            item.href === `/dashboard/${role}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? accent.active
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
