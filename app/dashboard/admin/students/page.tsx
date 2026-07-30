"use client";

import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import StudentForm from "@/components/forms/StudentForm";
import AssignParentDialog from "@/components/forms/AssignParentDialog";
import { useStudents } from "@/hooks/useStudents";

export default function AdminStudentsPage() {
  const { students, loading, refetch } = useStudents();

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
          <AssignParentDialog
            studentIds={[s.id]}
            onSuccess={refetch}
            trigger={
              <Button size="icon" variant="outline" title="تعيين ولي أمر">
                <UserPlus className="h-4 w-4" />
              </Button>
            }
          />
        )}
      />
    </div>
  );
}
