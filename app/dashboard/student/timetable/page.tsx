"use client";

import { useEffect, useState } from "react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
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
      <TimetableGrid slots={slots} />
    </div>
  );
}
