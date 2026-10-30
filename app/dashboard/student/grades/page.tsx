"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, Star, TrendingUp } from "lucide-react";
import DataTable, { type Column } from "@/components/tables/DataTable";
import GradeDetailsDialog, {
  type SubjectReportRow,
} from "@/components/shared/GradeDetailsDialog";
import StatCard from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { formatDate } from "@/app/lib/utils";
import { groupGrades, gradeTypeLabels, type GradeGroup } from "@/app/lib/gradeGroups";
import type { ClassLevelDTO, GradeDTO } from "@/types";

export default function StudentGradesPage() {
  const { user } = useAuth();
  const { students } = useStudents();
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/grades")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGrades)
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  }, []);

  const me = useMemo(
    () => students.find((s) => s.userId === user?.id),
    [students, user]
  );

  const myGrades = useMemo(
    () => grades.filter((g) => g.studentId === me?.id),
    [grades, me]
  );

  // درجات الطالب مجمّعة — الدرجة الواحدة (حتى لو رُصدت لعدة طلاب) تظهر كصف واحد
  const groups = useMemo(() => groupGrades(myGrades), [myGrades]);

  // مواد صف الطالب — تُستخدم لبناء ملف "جميع مواد الصف ودرجاته" في حوار التفاصيل
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  useEffect(() => {
    if (!me?.classId) {
      setClassSubjects([]);
      return;
    }
    let cancelled = false;
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then((classes: ClassLevelDTO[]) => {
        if (cancelled) return;
        const mine = classes.find((c) => c.id === me.classId);
        setClassSubjects(mine?.subjects.map((s) => s.name) ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [me?.classId]);

  // ملف المواد: كل مادة من مواد صفه (مع درجاته فيها) + أي مادة لها درجات غير مرتبطة بالصف
  const subjectsReport = useMemo<SubjectReportRow[]>(() => {
    const build = (subject: string): SubjectReportRow => {
      const gs = myGrades.filter((g) => g.subject === subject);
      const scored = gs.filter((g) => g.maxScore > 0);
      const average = scored.length
        ? Math.round(
            scored.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
              scored.length
          )
        : null;
      return { subject, count: gs.length, average };
    };
    const extras = Array.from(
      new Set(
        myGrades.map((g) => g.subject).filter((s) => !classSubjects.includes(s))
      )
    );
    return [...classSubjects.map(build), ...extras.map(build)];
  }, [classSubjects, myGrades]);

  // أعمدة مختصرة (اسم/نوع/تاريخ) + إجراءات (تفاصيل) + ملاحظة —
  // التفاصيل تعرض درجته ضمن الدرجة + ملف مواد صفه كاملاً
  const columns = useMemo<Column<GradeGroup>[]>(
    () => [
      { header: "اسم الدرجة", cell: (gr) => gr.name },
      { header: "نوع الدرجة", cell: (gr) => gradeTypeLabels[gr.type] ?? gr.type },
      { header: "التاريخ", cell: (gr) => formatDate(gr.date) },
      {
        header: "إجراءات",
        cell: (gr) => (
          <GradeDetailsDialog
            grade={gr.items[0]}
            items={gr.items}
            subjectsReport={subjectsReport}
          />
        ),
      },
      { header: "ملاحظة", cell: (gr) => gr.note ?? "—" },
    ],
    [subjectsReport]
  );

  // ملخص درجات الطالب من قائمة myGrades نفسها (النسب = score / maxScore)
  const stats = useMemo(() => {
    const scoreSum = myGrades.reduce((sum, g) => sum + g.score, 0);
    const maxSum = myGrades.reduce((sum, g) => sum + g.maxScore, 0);
    const average = maxSum > 0 ? Math.round((scoreSum / maxSum) * 100) : 0;
    const best =
      myGrades.length > 0
        ? Math.round(
            Math.max(
              ...myGrades.map((g) =>
                g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0
              )
            )
          )
        : 0;
    return {
      total: myGrades.length,
      average,
      subjects: new Set(myGrades.map((g) => g.subject)).size,
      best,
    };
  }, [myGrades]);

  return (
    <div className="space-y-4">
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي الدرجات"
            value={stats.total}
            icon={ClipboardList}
            iconClassName="text-blue-600"
            iconBgClassName="bg-blue-500/10"
          />
          <StatCard
            title="المعدل العام"
            value={`${stats.average}%`}
            icon={TrendingUp}
            iconClassName="text-emerald-600"
            iconBgClassName="bg-emerald-500/10"
          />
          <StatCard
            title="عدد المواد"
            value={stats.subjects}
            icon={BookOpen}
            iconClassName="text-violet-600"
            iconBgClassName="bg-violet-500/10"
          />
          <StatCard
            title="أفضل نتيجة"
            value={`${stats.best}%`}
            icon={Star}
            iconClassName="text-amber-600"
            iconBgClassName="bg-amber-500/10"
          />
        </div>
      )}
      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        emptyTitle="لا توجد درجات بعد"
      />
    </div>
  );
}
