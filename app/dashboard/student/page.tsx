"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ClipboardList, CalendarCheck, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useAssignments } from "@/hooks/useAssignments";
import { useAttendance } from "@/hooks/useAttendance";
import { formatCurrency, formatDate } from "@/app/lib/utils";
import type { GradeDTO, PaymentDTO } from "@/types";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { students } = useStudents();
  const { assignments } = useAssignments();
  const { attendance } = useAttendance();
  const [grades, setGrades] = useState<GradeDTO[]>([]);

  useEffect(() => {
    fetch("/api/grades")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGrades)
      .catch(() => setGrades([]));
  }, []);

  const me = useMemo(
    () => students.find((s) => s.userId === user?.id),
    [students, user]
  );

  // فواتير الطالب الحالي — لحساب إجمالي المدفوع والمتبقي
  const [payments, setPayments] = useState<PaymentDTO[]>([]);

  useEffect(() => {
    if (!me?.id) return;
    fetch(`/api/payments?studentId=${me.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPayments)
      .catch(() => setPayments([]));
  }, [me?.id]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = payments.reduce(
    (sum: number | null, p) =>
      p.dueAmount != null ? (sum ?? 0) + p.dueAmount : sum,
    null
  );
  const remaining = totalDue != null ? Math.max(0, totalDue - totalPaid) : null;

  const myGrades = useMemo(
    () => grades.filter((g) => g.studentId === me?.id).slice(0, 5),
    [grades, me]
  );

  const upcoming = useMemo(
    () =>
      assignments
        .filter((a) => new Date(a.dueDate) >= new Date())
        .slice(0, 5),
    [assignments]
  );

  const myAttendance = useMemo(
    () => attendance.filter((a) => a.studentId === me?.id),
    [attendance, me]
  );

  const attendanceRate =
    myAttendance.length > 0
      ? Math.round(
          (myAttendance.filter((a) => a.status === "present").length /
            myAttendance.length) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="واجبات قادمة"
          value={upcoming.length}
          icon={FileText}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
        <StatCard
          title="درجات مرصودة"
          value={myGrades.length}
          icon={ClipboardList}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="نسبة حضوري"
          value={`${attendanceRate}%`}
          icon={CalendarCheck}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="إجمالي مدفوعاتي"
          value={formatCurrency(totalPaid, me?.currency)}
          icon={CreditCard}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="المتبقي عليّ"
          value={remaining != null ? formatCurrency(remaining, me?.currency) : "—"}
          icon={Wallet}
          iconClassName="text-red-600"
          iconBgClassName="bg-red-500/10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الواجبات القادمة</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState icon={FileText} title="لا توجد واجبات قادمة" />
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-sm text-muted-foreground">{a.subject}</p>
                    </div>
                    <Badge variant="secondary">{formatDate(a.dueDate)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">أحدث الدرجات</CardTitle>
          </CardHeader>
          <CardContent>
            {myGrades.length === 0 ? (
              <EmptyState icon={ClipboardList} title="لا توجد درجات بعد" />
            ) : (
              <div className="space-y-2">
                {myGrades.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{g.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(g.date)}
                      </p>
                    </div>
                    <Badge variant="success">
                      {g.score} / {g.maxScore}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button asChild variant="outline">
        <Link href="/dashboard/student/assignments">
          <FileText className="h-4 w-4" />
          عرض كل الواجبات
        </Link>
      </Button>
    </div>
  );
}
