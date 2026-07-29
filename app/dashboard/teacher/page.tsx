"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Inbox, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { useAssignments } from "@/hooks/useAssignments";
import { formatDate } from "@/app/lib/utils";
import type { SessionDTO } from "@/types";

export default function TeacherDashboard() {
  const { assignments } = useAssignments();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);

  useEffect(() => {
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  const today = new Date().toDateString();
  const todaysSessions = sessions.filter(
    (s) => new Date(s.date).toDateString() === today
  );

  const totalSubmissions = assignments.reduce(
    (sum, a) => sum + (a.submissions?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حصص اليوم"
          value={todaysSessions.length}
          icon={BookOpen}
          iconClassName="text-emerald-600"
        />
        <StatCard
          title="الواجبات النشطة"
          value={assignments.length}
          icon={FileText}
          iconClassName="text-emerald-600"
        />
        <StatCard
          title="التسليمات المستلمة"
          value={totalSubmissions}
          icon={Inbox}
          iconClassName="text-emerald-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حصص اليوم</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysSessions.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="لا توجد حصص اليوم"
              message="ستظهر حصص اليوم هنا"
            />
          ) : (
            <div className="space-y-2">
              {todaysSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-sm text-muted-foreground">
                    الصف {s.grade} — {formatDate(s.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/sessions">
              <BookOpen className="h-4 w-4" />
              إنشاء حصة
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/assignments">
              <FileText className="h-4 w-4" />
              إنشاء واجب
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/submissions">
              <Inbox className="h-4 w-4" />
              مراجعة التسليمات
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/teacher/grades">
              <ClipboardList className="h-4 w-4" />
              رصد الدرجات
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
