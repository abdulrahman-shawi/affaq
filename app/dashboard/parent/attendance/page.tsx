"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { attendanceColumns } from "@/components/tables/Columns";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useAttendance } from "@/hooks/useAttendance";

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const { students } = useStudents();
  const { attendance, loading } = useAttendance();

  const childrenIds = useMemo(
    () =>
      students
        .filter((s) => s.parent?.userId === user?.id)
        .map((s) => s.id),
    [students, user]
  );

  const childrenAttendance = useMemo(
    () => attendance.filter((a) => childrenIds.includes(a.studentId)),
    [attendance, childrenIds]
  );

  const count = (status: string) =>
    childrenAttendance.filter((a) => a.status === status).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حاضر"
          value={count("present")}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="غائب"
          value={count("absent")}
          icon={XCircle}
          iconClassName="text-red-600"
          iconBgClassName="bg-red-500/10"
        />
        <StatCard
          title="متأخر"
          value={count("late")}
          icon={Clock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <DataTable
        columns={attendanceColumns()}
        data={childrenAttendance}
        loading={loading}
        emptyTitle="لا توجد سجلات حضور"
      />
    </div>
  );
}
