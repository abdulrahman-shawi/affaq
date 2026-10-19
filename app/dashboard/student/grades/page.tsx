"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, Star, TrendingUp } from "lucide-react";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import StatCard from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import type { GradeDTO } from "@/types";

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
        columns={gradeColumns()}
        data={myGrades}
        loading={loading}
        emptyTitle="لا توجد درجات بعد"
      />
    </div>
  );
}
