"use client";

import { useEffect, useState } from "react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useTimetable } from "@/hooks/useTimetable";
import type { TeacherDTO } from "@/types";

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const [teacherId, setTeacherId] = useState("");
  const [resolving, setResolving] = useState(true);
  const { slots, loading } = useTimetable({ teacherId });

  // إيجاد ملف المعلم المرتبط بالمستخدم الحالي (نفس نمط SessionForm)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/teachers");
        const teachers: TeacherDTO[] = res.ok ? await res.json() : [];
        setTeacherId(teachers.find((t) => t.userId === user.id)?.id ?? "");
      } finally {
        setResolving(false);
      }
    })();
  }, [user]);

  if (resolving || (teacherId && loading)) {
    return <Loading label="جارٍ تحميل الجدول..." />;
  }
  if (!teacherId) {
    return <EmptyState title="لم يتم العثور على ملف المعلم" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">جدولي الأسبوعي</h1>
      <TimetableGrid slots={slots} />
    </div>
  );
}
