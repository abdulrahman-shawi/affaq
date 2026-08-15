"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import TimetableSlotForm from "@/components/forms/TimetableSlotForm";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTimetable } from "@/hooks/useTimetable";
import type { TeacherDTO } from "@/types";

const selectClass =
  "flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [resolving, setResolving] = useState(true);
  const [classId, setClassId] = useState("");
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

  // اختيار أول صف يدرّسه المعلم تلقائيًا
  useEffect(() => {
    if (!classId && teacher && teacher.classes.length > 0) {
      setClassId(teacher.classes[0].id);
    }
  }, [teacher, classId]);

  if (resolving || (teacher && loading)) {
    return <Loading label="جارٍ تحميل الجدول..." />;
  }
  if (!teacher) {
    return <EmptyState title="لم يتم العثور على ملف المعلم" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">جدولي الأسبوعي</h1>
        {teacher.classes.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              className={selectClass}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {teacher.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {classId && (
              <TimetableSlotForm
                classId={classId}
                fixedTeacherId={teacher.id}
                onSuccess={refetch}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4" />
                    إضافة حصة
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
      <TimetableGrid slots={slots} />
    </div>
  );
}
