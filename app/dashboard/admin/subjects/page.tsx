"use client";

import { useMemo } from "react";
import { BookOpen, CircleAlert, Pencil, Plus, School, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { subjectColumns } from "@/components/tables/Columns";
import SubjectForm from "@/components/forms/SubjectForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { useSubjects } from "@/hooks/useSubjects";
import type { SubjectDTO } from "@/types";

export default function AdminSubjectsPage() {
  const { subjects, loading, refetch } = useSubjects();
  const { toast } = useToast();

  const stats = useMemo(
    () => ({
      total: subjects.length,
      withClasses: subjects.filter((s) => s.classes.length > 0).length,
      withoutClasses: subjects.filter((s) => s.classes.length === 0).length,
    }),
    [subjects]
  );

  async function handleDelete(subject: SubjectDTO) {
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف المادة");
      }
      toast({ variant: "success", title: "تم حذف المادة بنجاح" });
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
          title="إجمالي المواد"
          value={stats.total}
          icon={BookOpen}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="مواد مرتبطة بصفوف"
          value={stats.withClasses}
          icon={School}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="مواد بدون صفوف"
          value={stats.withoutClasses}
          icon={CircleAlert}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <div className="flex justify-end">
        <SubjectForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة مادة
            </Button>
          }
        />
      </div>

      <DataTable
        columns={subjectColumns()}
        data={subjects}
        loading={loading}
        emptyTitle="لا توجد مواد"
        emptyMessage="ابدأ بإضافة أول مادة"
        searchValue={(s) =>
          [s.name, ...(s.classes ?? []).map((c) => c.name)]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="ابحث باسم المادة أو الصف..."
        actions={(s) => (
          <>
            <SubjectForm
              subject={s}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف المادة"
              description={`هل أنت متأكد من حذف "${s.name}"؟ سيتم فك ارتباطها بالصفوف.`}
              confirmLabel="حذف"
              onConfirm={() => handleDelete(s)}
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
