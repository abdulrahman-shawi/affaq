"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, BookOpen, Users } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import TimetableGrid from "@/components/shared/TimetableGrid";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useTimetable } from "@/hooks/useTimetable";

const selectClass =
  "flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function ParentTimetablePage() {
  const { user } = useAuth();
  const { students, loading: studentsLoading } = useStudents();

  // أبناء ولي الأمر الحالي (نفس مصدر صفحة «أبنائي»)
  const children = useMemo(
    () => students.filter((s) => s.parent?.userId === user?.id),
    [students, user]
  );

  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    if (!selectedId && children.length > 0) {
      setSelectedId(children[0].id);
    }
  }, [children, selectedId]);

  const selected = children.find((s) => s.id === selectedId);
  const { slots, loading } = useTimetable({
    classId: selected?.classId ?? "",
  });

  const stats = useMemo(() => {
    const today = new Date().getDay(); // 0 = الأحد (مطابق لترميز dayOfWeek)
    return {
      weeklySlots: slots.length,
      todaySlots: slots.filter((s) => s.dayOfWeek === today).length,
      subjects: new Set(slots.map((s) => s.subject)).size,
      teachers: new Set(slots.map((s) => s.teacherId)).size,
    };
  }, [slots]);

  if (studentsLoading) {
    return <Loading label="جارٍ التحميل..." />;
  }
  if (children.length === 0) {
    return <EmptyState title="لا يوجد أبناء مسجلون" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {children.map((s) => (
            <option key={s.id} value={s.id}>
              {s.user?.name ?? s.id}
            </option>
          ))}
        </select>
        {selected?.class?.name && (
          <span className="text-sm text-muted-foreground">
            {selected.class.name}
          </span>
        )}
      </div>

      {selected && !selected.classId ? (
        <EmptyState
          title="لم يُسند صف لهذا الابن بعد"
          message="تواصل مع الإدارة لإسناده إلى صف"
        />
      ) : loading ? (
        <Loading label="جارٍ تحميل الجدول..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="الحصص الأسبوعية"
              value={stats.weeklySlots}
              icon={CalendarDays}
              iconClassName="text-blue-600"
              iconBgClassName="bg-blue-500/10"
            />
            <StatCard
              title="حصص اليوم"
              value={stats.todaySlots}
              icon={Clock}
              iconClassName="text-emerald-600"
              iconBgClassName="bg-emerald-500/10"
            />
            <StatCard
              title="المواد الدراسية"
              value={stats.subjects}
              icon={BookOpen}
              iconClassName="text-violet-600"
              iconBgClassName="bg-violet-500/10"
            />
            <StatCard
              title="المعلمون"
              value={stats.teachers}
              icon={Users}
              iconClassName="text-amber-600"
              iconBgClassName="bg-amber-500/10"
            />
          </div>

          <TimetableGrid slots={slots} />
        </>
      )}
    </div>
  );
}
