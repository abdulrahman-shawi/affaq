"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Inbox, Paperclip, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable, { type Column } from "@/components/tables/DataTable";
import GradeForm from "@/components/forms/GradeForm";
import StatCard from "@/components/shared/StatCard";
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

  const stats = useMemo(() => {
    const graded = submissions.filter((s) => s.grade != null);
    const avg = graded.length
      ? Math.round(
          (graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length) *
            10
        ) / 10
      : null;
    return {
      total: submissions.length,
      graded: graded.length,
      pending: submissions.length - graded.length,
      avg,
    };
  }, [submissions]);

  const columns: Column<SubmissionDTO>[] = [
    { header: "الطالب", cell: (s) => s.student?.user?.name ?? "—" },
    { header: "الواجب", cell: (s) => s.assignment?.title ?? "—" },
    { header: "تاريخ التسليم", cell: (s) => formatDate(s.submittedAt) },
    {
      header: "الملف",
      cell: (s) =>
        s.fileUrl ? (
          <a
            href={s.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Paperclip className="h-4 w-4" />
            عرض الملف
          </a>
        ) : (
          "—"
        ),
    },
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
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي التسليمات"
          value={stats.total}
          icon={Inbox}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="تم تقييمها"
          value={stats.graded}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="بانتظار التقييم"
          value={stats.pending}
          icon={Clock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
          description={stats.pending > 0 ? "تسليمات تحتاج مراجعة" : undefined}
        />
        <StatCard
          title="متوسط الدرجات"
          value={stats.avg ?? "—"}
          icon={Star}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
      </div>

      <DataTable
        columns={columns}
        data={submissions}
        loading={loading}
        emptyTitle="لا توجد تسليمات"
        emptyMessage="ستظهر تسليمات الطلاب هنا"
      />
    </div>
  );
}
