"use client";

import { useMemo } from "react";
import { Users, UserCheck, CalendarClock, School } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";

export default function ParentChildrenPage() {
  const { user } = useAuth();
  const { students, loading } = useStudents();

  const children = useMemo(
    () => students.filter((s) => s.parent?.userId === user?.id),
    [students, user]
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const in30Days = now + 30 * 24 * 60 * 60 * 1000;
    return {
      active: children.filter((s) => s.status === "active").length,
      expiringSoon: children.filter((s) => {
        if (!s.subEndDate) return false;
        const end = new Date(s.subEndDate).getTime();
        return end >= now && end <= in30Days;
      }).length,
      withoutClass: children.filter((s) => !s.classId).length,
    };
  }, [children]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الأبناء"
          value={children.length}
          icon={Users}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="الأبناء النشطون"
          value={stats.active}
          icon={UserCheck}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="اشتراكات تنتهي قريباً"
          value={stats.expiringSoon}
          icon={CalendarClock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
          description="خلال 30 يوماً"
        />
        <StatCard
          title="بدون صف"
          value={stats.withoutClass}
          icon={School}
          iconClassName="text-rose-600"
          iconBgClassName="bg-rose-500/10"
        />
      </div>

      <DataTable
        columns={studentColumns()}
        data={children}
        loading={loading}
        emptyTitle="لا يوجد أبناء مسجلون"
      />
    </div>
  );
}
