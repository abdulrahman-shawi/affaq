"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, CalendarDays, School, Video } from "lucide-react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import ZoomLinkForm from "@/components/forms/ZoomLinkForm";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTimetable } from "@/hooks/useTimetable";
import type { TeacherDTO } from "@/types";

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [resolving, setResolving] = useState(true);
  const { slots, loading, refetch } = useTimetable({
    teacherId: teacher?.id ?? "",
  });

  // إيجاد ملف المعلم المرتبط بالمستخدم الحالي (نفس نمط SessionForm)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/teachers");
        const teachers: TeacherDTO[] = res.ok ? await res.json() : [];
        setTeacher(teachers.find((t) => t.userId === user.id) ?? null);
      } finally {
        setResolving(false);
      }
    })();
  }, [user]);

  const stats = useMemo(
    () => ({
      total: slots.length,
      classes: teacher?.classes.length ?? 0,
      subjects: new Set(slots.map((s) => s.subject)).size,
      days: new Set(slots.map((s) => s.dayOfWeek)).size,
    }),
    [slots, teacher]
  );

  if (resolving || (teacher && loading)) {
    return <Loading label="جارٍ تحميل الجدول..." />;
  }
  if (!teacher) {
    return <EmptyState title="لم يتم العثور على ملف المعلم" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="الحصص الأسبوعية"
          value={stats.total}
          icon={CalendarDays}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="الصفوف التي أدرّسها"
          value={stats.classes}
          icon={School}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="المواد في الجدول"
          value={stats.subjects}
          icon={BookOpen}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
        <StatCard
          title="أيام الدوام"
          value={stats.days}
          icon={CalendarCheck}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">جدولي الأسبوعي</h1>
      </div>
      <TimetableGrid
        slots={slots}
        renderActions={(slot) => (
          <ZoomLinkForm
            slot={slot}
            onSuccess={refetch}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="رابط زوم"
              >
                <Video className="h-3.5 w-3.5 text-sky-700" />
              </Button>
            }
          />
        )}
      />
    </div>
  );
}
