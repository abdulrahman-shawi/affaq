"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useStudents } from "@/hooks/useStudents";
import { usePayments } from "@/hooks/usePayments";
import { useAttendance } from "@/hooks/useAttendance";
import { useNotifications } from "@/hooks/useNotifications";
import { formatCurrency, formatDate } from "@/app/lib/utils";
import type {
  QuizDTO,
  SubmissionDTO,
  TeacherDTO,
  TimetableSlotDTO,
} from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const monthName = new Intl.DateTimeFormat("ar-EG", { month: "long" });

export default function AdminDashboard() {
  const { students, refetch: refetchStudents } = useStudents();
  const { payments, refetch: refetchPayments } = usePayments();
  const { attendance } = useAttendance();
  const { unreadCount } = useNotifications();
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTeachers)
      .catch(() => setTeachers([]));
    fetch("/api/submissions")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSubmissions)
      .catch(() => setSubmissions([]));
    fetch("/api/timetable")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSlots)
      .catch(() => setSlots([]));
    fetch("/api/quizzes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setQuizzes)
      .catch(() => setQuizzes([]));
  }, []);

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  const gradeDistribution = Object.entries(
    students.reduce<Record<string, number>>((acc, s) => {
      const key = s.class?.name ?? "بدون صف";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  // الإيرادات الشهرية لآخر 6 أشهر
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months: { name: string; total: number; start: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ name: monthName.format(start), total: 0, start });
    }
    for (const payment of payments) {
      const date = new Date(payment.date);
      const bucket = months.find(
        (m) =>
          m.start.getFullYear() === date.getFullYear() &&
          m.start.getMonth() === date.getMonth()
      );
      if (bucket) bucket.total += payment.amount;
    }
    return months.map(({ name, total }) => ({ name, total }));
  }, [payments]);

  // تنبيهات: اشتراكات تنتهي خلال 7 أيام
  const expiringStudents = useMemo(() => {
    const now = Date.now();
    return students
      .filter((s) => {
        if (!s.subEndDate) return false;
        const days = Math.ceil(
          (new Date(s.subEndDate).getTime() - now) / DAY_MS
        );
        return days >= 0 && days <= 7;
      })
      .map((s) => ({
        id: s.id,
        name: s.user?.name ?? "طالب",
        days: Math.ceil(
          (new Date(s.subEndDate!).getTime() - Date.now()) / DAY_MS
        ),
      }))
      .sort((a, b) => a.days - b.days);
  }, [students]);

  // تنبيهات: تسليمات بانتظار التقييم
  const pendingSubmissions = submissions.filter((s) => s.grade == null);

  // تنبيهات: غياب اليوم
  const todayAbsences = useMemo(() => {
    const today = new Date().toDateString();
    return attendance
      .filter(
        (a) =>
          a.status === "absent" &&
          a.session?.date &&
          new Date(a.session.date).toDateString() === today
      )
      .map((a) => ({
        id: a.id,
        name: a.student?.user?.name ?? "طالب",
        subject: a.session?.subject ?? "",
      }));
  }, [attendance]);

  // حصص اليوم من الجدول الأسبوعي
  const todaySlots = useMemo(() => {
    const today = new Date().getDay(); // 0=الأحد — يتوافق مع dayOfWeek
    return slots
      .filter((s) => s.dayOfWeek === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots]);

  // آخر النشاطات
  const recentPayments = payments.slice(0, 5);
  const recentAttempts = useMemo(
    () =>
      quizzes
        .flatMap((q) =>
          (q.attempts ?? []).map((a) => ({
            id: a.id,
            quizTitle: q.title,
            studentName: a.student?.user?.name ?? "طالب",
            score: a.score,
            maxScore: a.maxScore,
            submittedAt: a.submittedAt,
          }))
        )
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .slice(0, 5),
    [quizzes]
  );

  const hasAlerts =
    expiringStudents.length > 0 ||
    pendingSubmissions.length > 0 ||
    todayAbsences.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <StudentForm
          onSuccess={refetchStudents}
          trigger={
            <Button>
              <UserPlus className="h-4 w-4" />
              إضافة طالب
            </Button>
          }
        />
        <PaymentForm
          onSuccess={refetchPayments}
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
          value={students.length}
          icon={GraduationCap}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="المعلمون"
          value={teachers.length}
          icon={Users}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="الإيرادات"
          value={formatCurrency(revenue)}
          icon={CreditCard}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          title="نسبة الحضور"
          value={`${attendanceRate}%`}
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
          {expiringStudents.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                اشتراكات تنتهي خلال 7 أيام ({expiringStudents.length})
              </p>
              {expiringStudents.map((s) => (
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
          {pendingSubmissions.length > 0 && (
            <p className="rounded-md border p-2 text-sm">
              {pendingSubmissions.length}{" "}
              {pendingSubmissions.length === 1
                ? "تسليم بانتظار"
                : "تسليمات بانتظار"}{" "}
              التقييم من المعلمين
            </p>
          )}
          {todayAbsences.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                غياب اليوم ({todayAbsences.length})
              </p>
              {todayAbsences.map((a) => (
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
          {todaySlots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد حصص مجدولة اليوم
            </p>
          )}
          {todaySlots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <span className="font-medium">{slot.subject}</span>
              <span className="text-muted-foreground">
                {slot.teacher?.user?.name} — {slot.class?.name}
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
          data={gradeDistribution}
          dataKey="count"
          xKey="name"
        />
        <StatsChart
          type="line"
          title="الإيرادات الشهرية (آخر 6 أشهر)"
          data={monthlyRevenue}
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
            {recentPayments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا توجد مدفوعات بعد
              </p>
            )}
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span>{p.student?.user?.name ?? "طالب"}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(p.amount)} — {formatDate(p.date)}
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
            {recentAttempts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا توجد محاولات بعد
              </p>
            )}
            {recentAttempts.map((a) => (
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
