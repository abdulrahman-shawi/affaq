"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Pencil, Percent, Table2, Trash2, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable, { type Column } from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import EditGradeForm from "@/components/forms/EditGradeForm";
import ManualGradesGrid from "@/components/forms/ManualGradesGrid";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { useToast } from "@/components/ui/toaster";
import type { GradeDTO } from "@/types";

export default function TeacherGradesPage() {
  const { toast } = useToast();
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
    { key: "manual", label: "إضافة درجة", icon: Table2 },
  ] as const;

  // زر تعديل لكل صف — لتصحيح درجة محفوظة بعد اكتشاف خطأ فيها لاحقًا
  const columns = useMemo<Column<GradeDTO>[]>(
    () => [
      ...gradeColumns(),
      {
        header: "إجراء",
        cell: (g) => (
          <div className="flex items-center gap-2">
            <EditGradeForm
              grade={g}
              onSuccess={refetch}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف الدرجة"
              description={`سيتم حذف درجة ${g.student?.user?.name ?? "—"} في مادة ${g.subject} نهائيًا ولا يمكن التراجع.`}
              confirmLabel="حذف نهائي"
              onConfirm={async () => {
                const res = await fetch(`/api/grades?id=${g.id}`, {
                  method: "DELETE",
                });
                const body = await res.json().catch(() => null);
                if (!res.ok) {
                  toast({
                    variant: "destructive",
                    title: body?.error ?? "فشل في حذف الدرجة",
                  });
                } else {
                  toast({ variant: "success", title: "تم حذف الدرجة" });
                }
                refetch();
              }}
              trigger={
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  حذف
                </Button>
              }
            />
          </div>
        ),
      },
    ],
    [refetch]
  );

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
            columns={columns}
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
