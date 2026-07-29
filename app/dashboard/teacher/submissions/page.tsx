"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable, { type Column } from "@/components/tables/DataTable";
import GradeForm from "@/components/forms/GradeForm";
import { formatDate } from "@/app/lib/utils";
import type { SubmissionDTO } from "@/types";

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/submissions");
      setSubmissions(res.ok ? await res.json() : []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const columns: Column<SubmissionDTO>[] = [
    { header: "الطالب", cell: (s) => s.student?.user?.name ?? "—" },
    { header: "الواجب", cell: (s) => s.assignment?.title ?? "—" },
    { header: "تاريخ التسليم", cell: (s) => formatDate(s.submittedAt) },
    {
      header: "الدرجة",
      cell: (s) =>
        s.grade != null ? (
          <Badge variant="success">{s.grade}</Badge>
        ) : (
          <Badge variant="warning">لم يُقيّم</Badge>
        ),
    },
    {
      header: "إجراء",
      cell: (s) => (
        <GradeForm
          submissionId={s.id}
          studentName={s.student?.user?.name}
          onSuccess={refetch}
          trigger={
            <Button variant="outline" size="sm">
              <Star className="h-4 w-4" />
              تقييم
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={submissions}
      loading={loading}
      emptyTitle="لا توجد تسليمات"
      emptyMessage="ستظهر تسليمات الطلاب هنا"
    />
  );
}
