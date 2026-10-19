"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, Percent, Users } from "lucide-react";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import StatCard from "@/components/shared/StatCard";
import type { GradeDTO } from "@/types";

export default function AdminGradesPage() {
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

  const stats = useMemo(() => {
    const total = grades.length;
    const avg = total
      ? Math.round(
          grades.reduce(
            (sum, g) => sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0),
            0
          ) / total
        )
      : 0;
    return {
      total,
      avg,
      subjects: new Set(grades.map((g) => g.subject)).size,
      students: new Set(grades.map((g) => g.studentId)).size,
    };
  }, [grades]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الدرجات المرصودة"
          value={stats.total}
          icon={ClipboardList}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="متوسط النسبة المئوية"
          value={`${stats.avg}%`}
          icon={Percent}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="عدد الطلاب"
          value={stats.students}
          icon={Users}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
          description="طلاب لديهم درجات مرصودة"
        />
        <StatCard
          title="عدد المواد"
          value={stats.subjects}
          icon={BookOpen}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <DataTable
        columns={gradeColumns()}
        data={grades}
        loading={loading}
        emptyTitle="لا توجد درجات"
        emptyMessage="لم يتم رصد أي درجة بعد"
      />
    </div>
  );
}
