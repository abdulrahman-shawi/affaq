"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  CreditCard,
  CalendarCheck,
  AlarmClock,
  UserPlus,
  MessagesSquare,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatsChart from "@/components/charts/StatsChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StudentForm from "@/components/forms/StudentForm";
import PaymentForm from "@/components/forms/PaymentForm";
import { useNotifications } from "@/hooks/useNotifications";
import { formatCurrency, formatCurrencyBreakdown, formatDate } from "@/app/lib/utils";
import type { Currency } from "@/types";

// نفس أرقام لوحة التحكم السابقة لكن محسوبة في /api/dashboard/summary
// من استعلامات خفيفة واحدة بدل 8 طلبات تسحب جداول الأكاديمية كاملة
type DashboardSummary = {
  studentsCount: number;
  teachersCount: number;
  attendanceRate: number;
  revenueByCurrency: Record<string, number>;
  monthlyRevenue: { name: string; total: number }[];
  gradeDistribution: { name: string; count: number }[];
  expiringStudents: { id: string; name: string; days: number }[];
  pendingSubmissions: number;
  todayAbsences: { id: string; name: string; subject: string }[];
  todaySlots: {
    id: string;
    subject: string;
    teacherName: string | null;
    className: string | null;
    startTime: string;
    endTime: string;
  }[];
  recentPayments: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    date: string;
  }[];
  recentAttempts: {
    id: string;
    quizTitle: string;
    studentName: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  }[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  studentsCount: 0,
  teachersCount: 0,
  attendanceRate: 0,
  revenueByCurrency: {},
  monthlyRevenue: [],
  gradeDistribution: [],
  expiringStudents: [],
  pendingSubmissions: 0,
  todayAbsences: [],
  todaySlots: [],
  recentPayments: [],
  recentAttempts: [],
};

export default function AdminDashboard() {
  const { unreadCount } = useNotifications();
  const [data, setData] = useState<DashboardSummary>(EMPTY_SUMMARY);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) setData(await res.json());
    } catch {
      // نبقي القيم الحالية عند تعذر التحديث — كما كانت السلوكيات السابقة
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasAlerts =
    data.expiringStudents.length > 0 ||
    data.pendingSubmissions > 0 ||
    data.todayAbsences.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <StudentForm
          onSuccess={load}
          trigger={
            <Button>
              <UserPlus className="h-4 w-4" />
              إضافة طالب
            </Button>
          }
        />
        <PaymentForm
          onSuccess={load}
          trigger={
            <Button variant="secondary">
              <CreditCard className="h-4 w-4" />
              تسجيل دفعة
            </Button>
          }
        />
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/messages">
            <MessagesSquare className="h-4 w-4" />
            رسالة جماعية
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/timetable">
            <CalendarDays className="h-4 w-4" />
            الجدول الأسبوعي
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="الطلاب"
          value={data.studentsCount}
          icon={GraduationCap}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="المعلمون"
          value={data.teachersCount}
          icon={Users}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="الإيرادات"
          value={formatCurrencyBreakdown(
            data.revenueByCurrency as Partial<Record<Currency, number>>
          )}
          icon={CreditCard}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          title="نسبة الحضور"
          value={`${data.attendanceRate}%`}
          icon={CalendarCheck}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-amber-600" />
            تنبيهات تتطلب إجراء
            {unreadCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({unreadCount} إشعار غير مقروء)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasAlerts && (
            <p className="text-sm text-muted-foreground">
              لا توجد تنبيهات حاليًا — كل شيء على ما يرام
            </p>
          )}
          {data.expiringStudents.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                اشتراكات تنتهي خلال 7 أيام ({data.expiringStudents.length})
              </p>
              {data.expiringStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <span>
                    {s.name} — متبقٍ {s.days} {s.days === 1 ? "يوم" : "أيام"}
                  </span>
                  <Link
                    href="/dashboard/admin/payments"
                    className="text-xs text-primary hover:underline"
                  >
                    تسجيل دفعة
                  </Link>
                </div>
              ))}
            </div>
          )}
          {data.pendingSubmissions > 0 && (
            <p className="rounded-md border p-2 text-sm">
              {data.pendingSubmissions}{" "}
              {data.pendingSubmissions === 1
                ? "تسليم بانتظار"
                : "تسليمات بانتظار"}{" "}
              التقييم من المعلمين
            </p>
          )}
          {data.todayAbsences.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                غياب اليوم ({data.todayAbsences.length})
              </p>
              {data.todayAbsences.map((a) => (
                <p key={a.id} className="rounded-md border p-2 text-sm">
                  {a.name} — {a.subject}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>حصص اليوم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.todaySlots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد حصص مجدولة اليوم
            </p>
          )}
          {data.todaySlots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <span className="font-medium">{slot.subject}</span>
              <span className="text-muted-foreground">
                {slot.teacherName ?? "—"} — {slot.className ?? "—"}
              </span>
              <span className="text-muted-foreground" dir="ltr">
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatsChart
          type="bar"
          title="توزيع الطلاب حسب الصف"
          data={data.gradeDistribution}
          dataKey="count"
          xKey="name"
        />
        <StatsChart
          type="line"
          title="الإيرادات الشهرية (آخر 6 أشهر)"
          data={data.monthlyRevenue}
          dataKey="total"
          xKey="name"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>آخر المدفوعات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentPayments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا توجد مدفوعات بعد
              </p>
            )}
            {data.recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(p.amount, p.currency as Currency)} —{" "}
                  {formatDate(p.date)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              آخر محاولات الاختبارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentAttempts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا توجد محاولات بعد
              </p>
            )}
            {data.recentAttempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span>
                  {a.studentName} — {a.quizTitle}
                </span>
                <span className="font-semibold" dir="ltr">
                  {a.score} / {a.maxScore}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
