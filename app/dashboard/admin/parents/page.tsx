"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { parentColumns } from "@/components/tables/Columns";
import ParentForm from "@/components/forms/ParentForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import type { ParentDTO } from "@/types";

export default function AdminParentsPage() {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parents");
      setParents(res.ok ? await res.json() : []);
    } catch {
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(
    () => ({
      total: parents.length,
      withChildren: parents.filter((p) => (p.children?.length ?? 0) > 0)
        .length,
      withoutChildren: parents.filter(
        (p) => (p.children?.length ?? 0) === 0
      ).length,
    }),
    [parents]
  );

  async function handleDelete(parent: ParentDTO) {
    try {
      const res = await fetch(`/api/parents/${parent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف ولي الأمر");
      }
      toast({ variant: "success", title: "تم حذف ولي الأمر بنجاح" });
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
          title="إجمالي أولياء الأمور"
          value={stats.total}
          icon={Users}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="لديهم أبناء مسجلون"
          value={stats.withChildren}
          icon={UserCheck}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="بدون أبناء"
          value={stats.withoutChildren}
          icon={UserX}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <div className="flex justify-end">
        <ParentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة ولي أمر
            </Button>
          }
        />
      </div>

      <DataTable
        columns={parentColumns()}
        data={parents}
        loading={loading}
        emptyTitle="لا يوجد أولياء أمور"
        emptyMessage="ابدأ بإضافة أول ولي أمر"
        searchValue={(p) =>
          [p.user?.name, p.user?.email, p.user?.phone].filter(Boolean).join(" ")
        }
        searchPlaceholder="ابحث بالاسم أو البريد أو الهاتف..."
        actions={(p) => (
          <>
            <ParentForm
              parent={p}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف ولي الأمر"
              description={`هل أنت متأكد من حذف "${p.user?.name ?? ""}"؟ لا يمكن التراجع عن هذا الإجراء.`}
              confirmLabel="حذف"
              onConfirm={() => handleDelete(p)}
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
