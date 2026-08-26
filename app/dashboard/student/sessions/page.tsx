"use client";

import { useEffect, useMemo, useState } from "react";
import { Video, CheckCircle2, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import type {
  AttendanceDTO,
  ClassLevelDTO,
  SessionDTO,
  StudentDTO,
} from "@/types";

function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function StudentSessionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [studentsRes, classesRes, sessionsRes] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/classes"),
          fetch("/api/sessions"),
        ]);
        const students: StudentDTO[] = studentsRes.ok
          ? await studentsRes.json()
          : [];
        const classes: ClassLevelDTO[] = classesRes.ok
          ? await classesRes.json()
          : [];
        const me = students.find((s) => s.userId === user.id);
        // Session.grade يقابل ClassLevel.order (نفس اتفاق SessionForm)
        const order = classes.find((c) => c.id === me?.classId)?.order ?? null;
        const all: SessionDTO[] = sessionsRes.ok ? await sessionsRes.json() : [];
        setSessions(
          all.filter(
            (s) => order !== null && s.grade === order && isToday(s.date)
          )
        );

        if (me) {
          const attendanceRes = await fetch(
            `/api/attendance?studentId=${me.id}`
          );
          const attendance: AttendanceDTO[] = attendanceRes.ok
            ? await attendanceRes.json()
            : [];
          setAttendedIds(new Set(attendance.map((a) => a.sessionId)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // تسجيل الحضور تلقائياً ثم فتح رابط الزوم
  async function handleJoin(session: SessionDTO) {
    setJoining(session.id);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في تسجيل الحضور");
      }
      setAttendedIds((prev) => new Set(prev).add(session.id));
      toast({ variant: "success", title: "تم تسجيل حضورك" });
      window.open(body.zoomLink, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({
        variant: "destructive",
        title: e instanceof Error ? e.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setJoining(null);
    }
  }

  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [sessions]
  );

  // عدد حصص اليوم التي سجّل الطالب حضوره فيها
  const attendedCount = useMemo(
    () => sorted.filter((s) => attendedIds.has(s.id)).length,
    [sorted, attendedIds]
  );

  if (loading) {
    return <Loading label="جارٍ تحميل حصص اليوم..." />;
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Video}
        title="لا توجد حصص اليوم"
        message="ستظهر حصص صفّك المجدولة اليوم هنا عند إنشائها من قبل المعلم"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">حصصي — اليوم</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حصص اليوم"
          value={sorted.length}
          icon={Video}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="سجّلت حضوري"
          value={attendedCount}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="لم أسجّل بعد"
          value={sorted.length - attendedCount}
          icon={Clock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((session) => {
          const attended = attendedIds.has(session.id);
          return (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{session.subject}</CardTitle>
                  {attended && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      حاضر
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{session.teacher?.user?.name ?? "—"}</p>
                  <p dir="ltr" className="text-right">
                    {formatTime(session.date)}
                  </p>
                </div>
                {attended ? (
                  session.zoomLink && (
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={session.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Video className="h-4 w-4" />
                        إعادة الدخول للحصة
                      </a>
                    </Button>
                  )
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleJoin(session)}
                    disabled={joining === session.id}
                  >
                    <Video className="h-4 w-4" />
                    {joining === session.id ? "جارٍ الدخول..." : "دخول الحصة"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
