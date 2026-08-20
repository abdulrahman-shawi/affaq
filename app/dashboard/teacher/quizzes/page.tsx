"use client";

import { Plus, Trash2, BarChart3, Pencil } from "lucide-react";
import DataTable, { type Column } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuizForm from "@/components/forms/QuizForm";
import QuizResultsDialog from "@/components/forms/QuizResultsDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/toaster";
import { useQuizzes } from "@/hooks/useQuizzes";
import { formatDate } from "@/app/lib/utils";
import type { QuizDTO } from "@/types";

export default function TeacherQuizzesPage() {
  const { quizzes, loading, refetch } = useQuizzes();
  const { toast } = useToast();

  async function handleDelete(id: string) {
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في حذف الاختبار");
    }
    toast({ variant: "success", title: "تم حذف الاختبار" });
    refetch();
  }

  const columns: Column<QuizDTO>[] = [
    { header: "العنوان", cell: (q) => q.title },
    { header: "المادة", cell: (q) => q.subject },
    { header: "الصف", cell: (q) => `الصف ${q.grade}` },
    {
      header: "الأسئلة",
      cell: (q) => (
        <Badge variant="secondary">{q.questions?.length ?? 0}</Badge>
      ),
    },
    {
      header: "المحاولات",
      cell: (q) => (
        <Badge variant="secondary">{q.attempts?.length ?? 0}</Badge>
      ),
    },
    {
      header: "المدة",
      cell: (q) =>
        q.durationMinutes ? (
          <Badge variant="outline">{q.durationMinutes} دقيقة</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { header: "التاريخ", cell: (q) => formatDate(q.createdAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <QuizForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إنشاء اختبار
            </Button>
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={quizzes}
        loading={loading}
        emptyTitle="لا توجد اختبارات"
        emptyMessage="أنشئ أول اختبار إلكتروني لطلابك"
        actions={(q) => (
          <div className="flex gap-1">
            <QuizResultsDialog
              quiz={q}
              trigger={
                <Button variant="ghost" size="icon" title="النتائج">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              }
            />
            <QuizForm
              quiz={q}
              onSuccess={refetch}
              trigger={
                <Button variant="ghost" size="icon" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف الاختبار"
              description={`سيتم حذف اختبار «${q.title}» وأسئلته ومحاولاته. الدرجات المسجلة تبقى في سجل الدرجات.`}
              confirmLabel="حذف"
              onConfirm={() => handleDelete(q.id)}
              trigger={
                <Button variant="ghost" size="icon" title="حذف">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
            />
          </div>
        )}
      />
    </div>
  );
}
