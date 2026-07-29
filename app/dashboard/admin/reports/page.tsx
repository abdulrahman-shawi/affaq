"use client";

import { GraduationCap, CreditCard, CalendarCheck, ClipboardList } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatsChart from "@/components/charts/StatsChart";
import { useStudents } from "@/hooks/useStudents";
import { usePayments } from "@/hooks/usePayments";
import { useAttendance } from "@/hooks/useAttendance";
import { formatCurrency } from "@/app/lib/utils";

export default function AdminReportsPage() {
  const { students } = useStudents();
  const { payments } = usePayments();
  const { attendance } = useAttendance();

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const attendanceByStatus = (["present", "absent", "late"] as const).map(
    (s) => ({
      name: s === "present" ? "حاضر" : s === "absent" ? "غائب" : "متأخر",
      value: attendance.filter((a) => a.status === s).length,
    })
  );

  const revenueByPeriod = (["monthly", "semester", "year"] as const).map(
    (p) => ({
      name: p === "monthly" ? "شهري" : p === "semester" ? "فصلي" : "سنوي",
      total: payments
        .filter((payment) => payment.period === p)
        .reduce((sum, payment) => sum + payment.amount, 0),
    })
  );

  const studentsByGrade = Object.entries(
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
          title="إجمالي الطلاب"
          value={students.length}
          icon={GraduationCap}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(revenue)}
          icon={CreditCard}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="سجلات الحضور"
          value={attendance.length}
          icon={CalendarCheck}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="اشتراكات نشطة"
          value={students.filter((s) => s.status === "active").length}
          icon={ClipboardList}
          iconClassName="text-blue-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatsChart
          type="pie"
          title="الحضور حسب الحالة"
          data={attendanceByStatus}
          dataKey="value"
          nameKey="name"
        />
        <StatsChart
          type="bar"
          title="الإيرادات حسب نوع الاشتراك"
          data={revenueByPeriod}
          dataKey="total"
          xKey="name"
        />
      </div>

      <StatsChart
        type="line"
        title="توزيع الطلاب حسب الصف"
        data={studentsByGrade}
        dataKey="count"
        xKey="name"
      />
    </div>
  );
}
