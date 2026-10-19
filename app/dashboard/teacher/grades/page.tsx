"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Percent, Table2, Trophy, Users } from "lucide-react";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import ManualGradesGrid from "@/components/forms/ManualGradesGrid";
import StatCard from "@/components/shared/StatCard";
import type { GradeDTO } from "@/types";

export default function TeacherGradesPage() {
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"log" | "manual">("log");

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

  const tabs = [
    { key: "log", label: "سجل الدرجات", icon: ClipboardList },
    { key: "manual", label: "رصد يدوي", icon: Table2 },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "manual" ? (
        <ManualGradesGrid />
      ) : (
        <>
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

          <DataTable
            columns={gradeColumns()}
            data={grades}
            loading={loading}
            emptyTitle="لا توجد درجات"
            emptyMessage="تظهر هنا الدرجات المرسودة يدويًا ودرجات الاختبارات والواجبات"
          />
        </>
      )}
    </div>
  );
}
