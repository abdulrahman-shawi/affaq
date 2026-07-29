"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Users, CreditCard, CalendarCheck } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatsChart from "@/components/charts/StatsChart";
import { useStudents } from "@/hooks/useStudents";
import { usePayments } from "@/hooks/usePayments";
import { useAttendance } from "@/hooks/useAttendance";
import { formatCurrency } from "@/app/lib/utils";
import type { TeacherDTO } from "@/types";

export default function AdminDashboard() {
  const { students } = useStudents();
  const { payments } = usePayments();
  const { attendance } = useAttendance();
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, []);

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  const gradeDistribution = Object.entries(
    students.reduce<Record<string, number>>((acc, s) => {
      const key = `الصف ${s.grade}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="الطلاب"
          value={students.length}
          icon={GraduationCap}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="المعلمون"
          value={teachers.length}
          icon={Users}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="الإيرادات"
          value={formatCurrency(revenue)}
          icon={CreditCard}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="نسبة الحضور"
          value={`${attendanceRate}%`}
          icon={CalendarCheck}
          iconClassName="text-blue-600"
        />
      </div>

      <StatsChart
        type="bar"
        title="توزيع الطلاب حسب الصف"
        data={gradeDistribution}
        dataKey="count"
        xKey="name"
      />
    </div>
  );
}
