"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Percent, Plus, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import GradeForm from "@/components/forms/GradeForm";
import StatCard from "@/components/shared/StatCard";
import type { GradeDTO } from "@/types";

export default function TeacherGradesPage() {
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
    const percentages = grades
      .filter((g) => g.maxScore > 0)
      .map((g) => (g.score / g.maxScore) * 100);
    const avg = percentages.length
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : null;
    const top = grades.length ? Math.max(...grades.map((g) => g.score)) : null;
    return {
      total: grades.length,
      avg,
      top,
      students: new Set(grades.map((g) => g.studentId)).size,
    };
  }, [grades]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="الدرجات المرصودة"
          value={stats.total}
          icon={ClipboardList}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="متوسط النسبة"
          value={stats.avg != null ? `${stats.avg}%` : "—"}
          icon={Percent}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
          description="نسبة الدرجة إلى الدرجة العظمى"
        />
        <StatCard
          title="أعلى درجة"
          value={stats.top ?? "—"}
          icon={Trophy}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          title="الطلاب المقيّمون"
          value={stats.students}
          icon={Users}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
      </div>

      <div className="flex justify-end">
        <GradeForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              رصد درجة
            </Button>
          }
        />
      </div>

      <DataTable
        columns={gradeColumns()}
        data={grades}
        loading={loading}
        emptyTitle="لا توجد درجات"
        emptyMessage="ابدأ برصد أول درجة"
      />
    </div>
  );
}
