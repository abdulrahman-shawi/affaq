"use client";

import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import StudentForm from "@/components/forms/StudentForm";
import AssignParentDialog from "@/components/forms/AssignParentDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useStudents } from "@/hooks/useStudents";
import type { StudentDTO } from "@/types";

export default function AdminStudentsPage() {
  const { students, loading, refetch } = useStudents();
  const { toast } = useToast();

  async function handleDelete(student: StudentDTO) {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف الطالب");
      }
      toast({ variant: "success", title: "تم حذف الطالب بنجاح" });
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
        <StudentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة طالب
            </Button>
          }
        />
      </div>

      <DataTable
        columns={studentColumns()}
        data={students}
        loading={loading}
        emptyTitle="لا يوجد طلاب"
        emptyMessage="ابدأ بإضافة أول طالب"
        searchValue={(s) =>
          [s.user?.name, s.user?.email, s.user?.phone, s.parent?.user?.name]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="ابحث بالاسم أو البريد أو ولي الأمر..."
        selectable
        bulkActions={(selected, clear) => (
          <AssignParentDialog
            studentIds={selected.map((s) => s.id)}
            onSuccess={() => {
              clear();
              refetch();
            }}
            trigger={
              <Button size="sm">
                <UserPlus className="h-4 w-4" />
                تعيين ولي أمر
              </Button>
            }
          />
        )}
        actions={(s) => (
          <>
            <AssignParentDialog
              studentIds={[s.id]}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعيين ولي أمر">
                  <UserPlus className="h-4 w-4" />
                </Button>
              }
            />
            <StudentForm
              student={s}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف الطالب"
              description={`هل أنت متأكد من حذف "${s.user?.name ?? ""}"؟ سيتم حذف جميع بياناته (مدفوعات، حضور، درجات) ولا يمكن التراجع.`}
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
