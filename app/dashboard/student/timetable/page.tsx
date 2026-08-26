"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, CalendarDays } from "lucide-react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useTimetable } from "@/hooks/useTimetable";
import type { StudentDTO } from "@/types";

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentDTO | null>(null);
  const [resolving, setResolving] = useState(true);
  const { slots, loading } = useTimetable({ classId: student?.classId ?? "" });

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

  // ملخص الجدول من حصص slots نفسها
  const stats = useMemo(
    () => ({
      total: slots.length,
      subjects: new Set(slots.map((s) => s.subject)).size,
      days: new Set(slots.map((s) => s.dayOfWeek)).size,
    }),
    [slots]
  );

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حصص الأسبوع"
          value={stats.total}
          icon={CalendarDays}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="المواد"
          value={stats.subjects}
          icon={BookOpen}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="أيام الدراسة"
          value={stats.days}
          icon={CalendarCheck}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
      </div>
      <TimetableGrid slots={slots} />
    </div>
  );
}
