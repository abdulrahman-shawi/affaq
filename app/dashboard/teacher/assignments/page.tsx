"use client";

import { useMemo } from "react";
import { CalendarX, Clock, FileText, Inbox, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable, { type Column } from "@/components/tables/DataTable";
import AssignmentForm from "@/components/forms/AssignmentForm";
import StatCard from "@/components/shared/StatCard";
import { useAssignments } from "@/hooks/useAssignments";
import { formatDate } from "@/app/lib/utils";
import type { AssignmentDTO } from "@/types";

const columns: Column<AssignmentDTO>[] = [
  { header: "العنوان", cell: (a) => a.title },
  { header: "المادة", cell: (a) => a.subject },
  { header: "الصف", cell: (a) => `الصف ${a.grade}` },
  { header: "تاريخ التسليم", cell: (a) => formatDate(a.dueDate) },
  {
    header: "الملف",
    cell: (a) =>
      a.fileUrl ? (
        <a
          href={a.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Paperclip className="h-4 w-4" />
          {a.fileName ?? "عرض الملف"}
        </a>
      ) : (
        "—"
      ),
  },
  {
    header: "التسليمات",
    cell: (a) => <Badge variant="secondary">{a.submissions?.length ?? 0}</Badge>,
  },
];

export default function TeacherAssignmentsPage() {
  const { assignments, loading, refetch } = useAssignments();

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: assignments.length,
      open: assignments.filter((a) => new Date(a.dueDate) >= now).length,
      overdue: assignments.filter((a) => new Date(a.dueDate) < now).length,
      submissions: assignments.reduce(
        (sum, a) => sum + (a.submissions?.length ?? 0),
        0
      ),
    };
  }, [assignments]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الواجبات"
          value={stats.total}
          icon={FileText}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="واجبات مفتوحة"
          value={stats.open}
          icon={Clock}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
          description="لم يحن موعد تسليمها بعد"
        />
        <StatCard
          title="انتهى موعدها"
          value={stats.overdue}
          icon={CalendarX}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          title="إجمالي التسليمات"
          value={stats.submissions}
          icon={Inbox}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
      </div>

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
