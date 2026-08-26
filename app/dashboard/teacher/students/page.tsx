"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Search, UserCheck, Users, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/tables/DataTable";
import StatCard from "@/components/shared/StatCard";
import { studentColumns } from "@/components/tables/Columns";
import { useStudents } from "@/hooks/useStudents";

export default function TeacherStudentsPage() {
  const { students, loading } = useStudents();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.user?.name?.includes(search) || s.user?.email?.includes(search)
      ),
    [students, search]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      total: students.length,
      active: students.filter((s) => s.status === "active").length,
      expiringSoon: students.filter((s) => {
        if (!s.subEndDate) return false;
        const end = new Date(s.subEndDate);
        return end >= now && end <= in30Days;
      }).length,
      noClass: students.filter((s) => !s.classId).length,
    };
  }, [students]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الطلاب"
          value={stats.total}
          icon={Users}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="الطلاب النشطون"
          value={stats.active}
          icon={UserCheck}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="اشتراكات تنتهي قريبًا"
          value={stats.expiringSoon}
          icon={CalendarClock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
          description="خلال 30 يومًا"
        />
        <StatCard
          title="بدون صف"
          value={stats.noClass}
          icon={UserX}
          iconClassName="text-rose-600"
          iconBgClassName="bg-rose-500/10"
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث عن طالب..."
          className="pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={studentColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا يوجد طلاب"
      />
    </div>
  );
}
