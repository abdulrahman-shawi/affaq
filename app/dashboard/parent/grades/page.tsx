"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, TrendingUp, GraduationCap, BookOpen } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import type { GradeDTO } from "@/types";

export default function ParentGradesPage() {
  const { user } = useAuth();
  const { students } = useStudents();
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grades");
      setGrades(res.ok ? await res.json() : []);
    } catch {
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const childrenIds = useMemo(
    () =>
      students
        .filter((s) => s.parent?.userId === user?.id)
        .map((s) => s.id),
    [students, user]
  );

  const childrenGrades = useMemo(
    () => grades.filter((g) => childrenIds.includes(g.studentId)),
    [grades, childrenIds]
  );

  const stats = useMemo(() => {
    const average =
      childrenGrades.length > 0
        ? Math.round(
            (childrenGrades.reduce(
              (sum, g) => sum + (g.maxScore > 0 ? g.score / g.maxScore : 0),
              0
            ) /
              childrenGrades.length) *
              100
          )
        : 0;
    return {
      average,
      exams: childrenGrades.filter((g) => g.type === "exam").length,
      subjects: new Set(childrenGrades.map((g) => g.subject)).size,
    };
  }, [childrenGrades]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الدرجات"
          value={childrenGrades.length}
          icon={ClipboardList}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="المتوسط العام"
          value={`${stats.average}%`}
          icon={TrendingUp}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="درجات الاختبارات"
          value={stats.exams}
          icon={GraduationCap}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          title="المواد الدراسية"
          value={stats.subjects}
          icon={BookOpen}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
      </div>

      <DataTable
        columns={gradeColumns()}
        data={childrenGrades}
        loading={loading}
        emptyTitle="لا توجد درجات"
      />
    </div>
  );
}
