"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable, { type Column } from "@/components/tables/DataTable";
import AssignmentForm from "@/components/forms/AssignmentForm";
import { useAssignments } from "@/hooks/useAssignments";
import { formatDate } from "@/app/lib/utils";
import type { AssignmentDTO } from "@/types";

const columns: Column<AssignmentDTO>[] = [
  { header: "العنوان", cell: (a) => a.title },
  { header: "المادة", cell: (a) => a.subject },
  { header: "الصف", cell: (a) => `الصف ${a.grade}` },
  { header: "تاريخ التسليم", cell: (a) => formatDate(a.dueDate) },
  {
    header: "التسليمات",
    cell: (a) => <Badge variant="secondary">{a.submissions?.length ?? 0}</Badge>,
  },
];

export default function TeacherAssignmentsPage() {
  const { assignments, loading, refetch } = useAssignments();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AssignmentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إنشاء واجب
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        loading={loading}
        emptyTitle="لا توجد واجبات"
        emptyMessage="ابدأ بإنشاء أول واجب"
      />
    </div>
  );
}
