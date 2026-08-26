"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  CreditCard,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  AlarmClock,
  Printer,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatsChart from "@/components/charts/StatsChart";
import ReportsExport from "@/components/shared/ReportsExport";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudents } from "@/hooks/useStudents";
import { usePayments } from "@/hooks/usePayments";
import { useAttendance } from "@/hooks/useAttendance";
import { formatCurrency } from "@/app/lib/utils";
import type { GradeDTO } from "@/types";

type Period = "all" | "month" | "quarter" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  all: "كل الفترات",
  month: "هذا الشهر",
  quarter: "آخر 3 أشهر",
  year: "هذه السنة",
};

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AdminReportsPage() {
  const { students } = useStudents();
  const { payments } = usePayments();
  const { attendance } = useAttendance();
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    fetch("/api/grades")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGrades)
      .catch(() => setGrades([]));
  }, []);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "month")
      return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "quarter")
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (period === "year") return new Date(now.getFullYear(), 0, 1);
    return null;
  }, [period]);

  const filteredPayments = useMemo(
    () =>
      periodStart
        ? payments.filter((p) => new Date(p.date) >= periodStart)
        : payments,
    [payments, periodStart]
  );
  const filteredAttendance = useMemo(
    () =>
      periodStart
        ? attendance.filter(
            (a) => a.session?.date && new Date(a.session.date) >= periodStart
          )
        : attendance,
    [attendance, periodStart]
  );

  const revenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // مقارنة إيرادات هذا الشهر بالشهر الماضي (غير متأثرة بالفلتر)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthRevenue = payments
    .filter((p) => new Date(p.date) >= thisMonthStart)
    .reduce((sum, p) => sum + p.amount, 0);
  const lastMonthRevenue = payments
    .filter((p) => {
      const d = new Date(p.date);
      return d >= lastMonthStart && d < thisMonthStart;
    })
    .reduce((sum, p) => sum + p.amount, 0);
  const revenueDelta =
    lastMonthRevenue > 0
      ? Math.round(
          ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        )
      : null;

  const presentCount = filteredAttendance.filter(
    (a) => a.status === "present"
  ).length;
  const attendanceRate =
    filteredAttendance.length > 0
      ? Math.round((presentCount / filteredAttendance.length) * 100)
      : null;

  const expiringSoon = students.filter((s) => {
    if (!s.subEndDate) return false;
    const days = Math.ceil(
      (new Date(s.subEndDate).getTime() - now.getTime()) / DAY_MS
    );
    return days >= 0 && days <= 7;
  }).length;

  // متوسط كل طالب من سجل الدرجات
  const studentAverages = useMemo(() => {
    const map = new Map<string, { name: string; score: number; max: number }>();
    for (const grade of grades) {
      const agg = map.get(grade.studentId) ?? {
        name: grade.student?.user?.name ?? "طالب",
        score: 0,
        max: 0,
      };
      agg.score += grade.score;
      agg.max += grade.maxScore;
      map.set(grade.studentId, agg);
    }
    return Array.from(map.values())
      .filter((a) => a.max > 0)
      .map((a) => ({
        name: a.name,
        average: Math.round((a.score / a.max) * 100),
      }));
  }, [grades]);

  const topStudents = useMemo(
    () =>
      [...studentAverages]
        .sort((a, b) => b.average - a.average)
        .slice(0, 5),
    [studentAverages]
  );
  const needsFollowUp = useMemo(
    () =>
      studentAverages
        .filter((a) => a.average < 60)
        .sort((a, b) => a.average - b.average),
    [studentAverages]
  );

  const attendanceByStatus = (["present", "absent", "late"] as const).map(
    (s) => ({
      name: s === "present" ? "حاضر" : s === "absent" ? "غائب" : "متأخر",
      value: filteredAttendance.filter((a) => a.status === s).length,
    })
  );

  const revenueByPeriod = (["monthly", "semester", "year"] as const).map(
    (p) => ({
      name: p === "monthly" ? "شهري" : p === "semester" ? "فصلي" : "سنوي",
      total: filteredPayments
        .filter((payment) => payment.period === p)
        .reduce((sum, payment) => sum + payment.amount, 0),
    })
  );

  const studentsByGrade = Object.entries(
    students.reduce<Record<string, number>>((acc, s) => {
      const key = s.class?.name ?? "بدون صف";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <select
          className={selectClassName}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          طباعة / حفظ PDF
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="إجمالي الطلاب"
          value={students.length}
          icon={GraduationCap}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title={`إجمالي الإيرادات (${PERIOD_LABELS[period]})`}
          value={formatCurrency(revenue)}
          icon={CreditCard}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title={
            revenueDelta === null
              ? "إيرادات هذا الشهر"
              : `إيرادات هذا الشهر (${
                  revenueDelta >= 0 ? "+" : ""
                }${revenueDelta}% عن الشهر الماضي)`
          }
          value={formatCurrency(thisMonthRevenue)}
          icon={
            revenueDelta !== null && revenueDelta < 0
              ? TrendingDown
              : TrendingUp
          }
          iconClassName={
            revenueDelta !== null && revenueDelta < 0
              ? "text-red-600"
              : "text-emerald-600"
          }
          iconBgClassName={
            revenueDelta !== null && revenueDelta < 0
              ? "bg-red-500/10"
              : "bg-emerald-500/10"
          }
        />
        <StatCard
          title={`سجلات الحضور (${PERIOD_LABELS[period]})`}
          value={filteredAttendance.length}
          icon={CalendarCheck}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="نسبة الحضور"
          value={attendanceRate === null ? "—" : `${attendanceRate}%`}
          icon={ClipboardList}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="اشتراكات تنتهي خلال 7 أيام"
          value={expiringSoon}
          icon={AlarmClock}
          iconClassName={
            expiringSoon > 0 ? "text-amber-600" : "text-blue-600"
          }
          iconBgClassName={
            expiringSoon > 0 ? "bg-amber-500/10" : "bg-blue-500/10"
          }
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>أعلى 5 طلاب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topStudents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا توجد درجات مسجلة بعد
              </p>
            )}
            {topStudents.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <span className="text-sm">
                  {i + 1}. {s.name}
                </span>
                <span className="text-sm font-semibold">{s.average}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>طلاب بحاجة لمتابعة (أقل من 60%)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsFollowUp.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا يوجد طلاب تحت الحد — ممتاز
              </p>
            )}
            {needsFollowUp.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <span className="text-sm">{s.name}</span>
                <span className="text-sm font-semibold text-red-600">
                  {s.average}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="print:hidden">
        <ReportsExport students={students} />
      </div>
    </div>
  );
}
