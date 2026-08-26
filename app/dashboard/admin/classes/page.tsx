"use client";

import { useMemo } from "react";
import { BookOpen, CircleAlert, Pencil, Plus, School, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { classColumns } from "@/components/tables/Columns";
import ClassForm from "@/components/forms/ClassForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { useClasses } from "@/hooks/useClasses";
import type { ClassLevelDTO } from "@/types";

export default function AdminClassesPage() {
  const { classes, loading, refetch } = useClasses();
  const { toast } = useToast();

  const stats = useMemo(
    () => ({
      total: classes.length,
      totalSubjects: classes.reduce((sum, c) => sum + c.subjects.length, 0),
      withoutSubjects: classes.filter((c) => c.subjects.length === 0).length,
    }),
    [classes]
  );

  async function handleDelete(classLevel: ClassLevelDTO) {
    try {
      const res = await fetch(`/api/classes/${classLevel.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف الصف");
      }
      toast({ variant: "success", title: "تم حذف الصف بنجاح" });
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل الحذف",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="إجمالي الصفوف"
          value={stats.total}
          icon={School}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="المواد المرتبطة"
          value={stats.totalSubjects}
          icon={BookOpen}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
          description="إجمالي ارتباطات المواد بالصفوف"
        />
        <StatCard
          title="صفوف بدون مواد"
          value={stats.withoutSubjects}
          icon={CircleAlert}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <div className="flex justify-end">
        <ClassForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة صف
            </Button>
          }
        />
      </div>

      <DataTable
        columns={classColumns()}
        data={classes}
        loading={loading}
        emptyTitle="لا توجد صفوف"
        emptyMessage="ابدأ بإضافة أول صف"
        searchValue={(c) =>
          [c.name, ...(c.subjects ?? []).map((s) => s.name)]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="ابحث باسم الصف أو المادة..."
        actions={(c) => (
          <>
            <ClassForm
              classLevel={c}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف الصف"
              description={`هل أنت متأكد من حذف "${c.name}"؟ سيتم فك ارتباطه بالمواد.`}
              confirmLabel="حذف"
              onConfirm={() => handleDelete(c)}
              trigger={
                <Button size="icon" variant="destructive" title="حذف">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </>
        )}
      />
    </div>
  );
}
