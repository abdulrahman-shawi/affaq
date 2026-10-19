"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import type {
  AttendanceDTO,
  ClassLevelDTO,
  SessionDTO,
  StudentDTO,
} from "@/types";

function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** حصص اليوم لصف الطالب الحالي + تسجيل الحضور والدخول للحصة */
export function useTodaySessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
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
        if (cancelled) return;
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
          if (cancelled) return;
          // لا نعتبر "غائب" حضورًا — زر الدخول يجب أن يبقى متاحًا لتسجيل الحضور
          setAttendedIds(
            new Set(
              attendance
                .filter((a) => a.status === "present" || a.status === "late")
                .map((a) => a.sessionId)
            )
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // تسجيل الحضور تلقائياً ثم فتح رابط الزوم
  async function join(session: SessionDTO) {
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

  return { sessions, attendedIds, loading, joining, join };
}
