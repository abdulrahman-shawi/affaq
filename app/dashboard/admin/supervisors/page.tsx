"use client";

import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { supervisorColumns } from "@/components/tables/Columns";
import SupervisorForm from "@/components/forms/SupervisorForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { useSupervisors } from "@/hooks/useSupervisors";
import type { SupervisorDTO } from "@/types";

export default function AdminSupervisorsPage() {
  const { supervisors, loading, refetch } = useSupervisors();
  const { toast } = useToast();

  async function handleDelete(supervisor: SupervisorDTO) {
    try {
      const res = await fetch(`/api/supervisors/${supervisor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف المشرف");
      }
      toast({ variant: "success", title: "تم حذف المشرف بنجاح" });
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
          title="إجمالي المشرفين"
          value={supervisors.length}
          icon={UserCog}
          iconClassName="text-cyan-600"
          iconBgClassName="bg-cyan-500/10"
        />
      </div>

      <div className="flex justify-end">
        <SupervisorForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة مشرف
            </Button>
          }
        />
      </div>

      <DataTable
        columns={supervisorColumns()}
        data={supervisors}
        loading={loading}
        emptyTitle="لا يوجد مشرفون"
        emptyMessage="ابدأ بإضافة أول مشرف"
        searchValue={(s) => [s.name, s.email, s.phone].filter(Boolean).join(" ")}
        searchPlaceholder="ابحث باسم المشرف أو بريده..."
        actions={(s) => (
          <>
            <SupervisorForm
              supervisor={s}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف المشرف"
              description={`هل أنت متأكد من حذف "${s.name}"؟ لن يتمكن من تسجيل الدخول بعد الحذف.`}
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
