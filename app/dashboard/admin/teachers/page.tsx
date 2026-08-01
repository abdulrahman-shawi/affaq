"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { teacherColumns } from "@/components/tables/Columns";
import TeacherForm from "@/components/forms/TeacherForm";
import TeacherAssignDialog from "@/components/forms/TeacherAssignDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import type { TeacherDTO } from "@/types";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      setTeachers(res.ok ? await res.json() : []);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleDelete(teacher: TeacherDTO) {
    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف المعلم");
      }
      toast({ variant: "success", title: "تم حذف المعلم بنجاح" });
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
      <div className="flex justify-end">
        <TeacherForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة معلم
            </Button>
          }
        />
      </div>

      <DataTable
        columns={teacherColumns()}
        data={teachers}
        loading={loading}
        emptyTitle="لا يوجد معلمون"
        emptyMessage="ابدأ بإضافة أول معلم"
        actions={(t) => (
          <>
            <TeacherAssignDialog
              teacher={t}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="ربط المواد والصفوف">
                  <Link2 className="h-4 w-4" />
                </Button>
              }
            />
            <TeacherForm
              teacher={t}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف المعلم"
              description={`هل أنت متأكد من حذف "${t.user?.name ?? ""}"؟ سيتم حذف جميع بياناته (حصص، رسائل) ولا يمكن التراجع.`}
              confirmLabel="حذف"
              onConfirm={() => handleDelete(t)}
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
