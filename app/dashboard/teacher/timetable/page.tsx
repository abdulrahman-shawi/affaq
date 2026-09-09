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
  const [classFilter, setClassFilter] = useState("");
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

  // الفلترة بالصف — فارغة تعني كل صفوف المعلم
  const filteredSlots = useMemo(
    () =>
      classFilter ? slots.filter((s) => s.classId === classFilter) : slots,
    [slots, classFilter]
  );

  const stats = useMemo(
    () => ({
      total: filteredSlots.length,
      classes: new Set(filteredSlots.map((s) => s.classId)).size,
      subjects: new Set(filteredSlots.map((s) => s.subject)).size,
      days: new Set(filteredSlots.map((s) => s.dayOfWeek)).size,
    }),
    [filteredSlots]
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
        <select
          aria-label="فلترة بالصف"
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">كل الصفوف</option>
          {teacher.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <TimetableGrid
        slots={filteredSlots}
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
