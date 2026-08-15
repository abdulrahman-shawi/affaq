"use client";

import { useEffect, useState } from "react";
import { Video, CheckCircle2 } from "lucide-react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useTimetable } from "@/hooks/useTimetable";
import type { StudentDTO, TimetableSlotDTO } from "@/types";

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentDTO | null>(null);
  const [resolving, setResolving] = useState(true);
  const { slots, loading } = useTimetable({ classId: student?.classId ?? "" });
  const [joining, setJoining] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({});
  const today = new Date().getDay();

  // إيجاد سجل الطالب المرتبط بالمستخدم الحالي لمعرفة صفّه
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/students");
        const students: StudentDTO[] = res.ok ? await res.json() : [];
        setStudent(students.find((s) => s.userId === user.id) ?? null);
      } finally {
        setResolving(false);
      }
    })();
  }, [user]);

  // دخول حصة اليوم: تسجيل الحضور تلقائياً ثم فتح رابط الزوم
  async function handleJoin(slot: TimetableSlotDTO) {
    setJoining(slot.id);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في تسجيل الحضور");
      }
      setCheckedIn((c) => ({ ...c, [slot.id]: true }));
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

  if (resolving || (student?.classId && loading)) {
    return <Loading label="جارٍ تحميل الجدول..." />;
  }
  if (!student?.classId) {
    return (
      <EmptyState
        title="لم يُسند لك صف بعد"
        message="تواصل مع الإدارة لإسنادك إلى صف"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        جدولي الأسبوعي — {student.class?.name}
      </h1>
      <TimetableGrid
        slots={slots}
        renderActions={(slot) =>
          slot.dayOfWeek !== today ? null : checkedIn[slot.id] ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              تم تسجيل حضورك
            </span>
          ) : (
            <Button
              size="sm"
              onClick={() => handleJoin(slot)}
              disabled={joining === slot.id}
            >
              <Video className="h-3.5 w-3.5" />
              {joining === slot.id ? "جارٍ الدخول..." : "دخول الحصة"}
            </Button>
          )
        }
      />
    </div>
  );
}
