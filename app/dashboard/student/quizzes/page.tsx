"use client";

import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import DataTable, { type Column } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TakeQuizDialog from "@/components/forms/TakeQuizDialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuizzes } from "@/hooks/useQuizzes";
import { useStudents } from "@/hooks/useStudents";
import { formatDate } from "@/app/lib/utils";
import type { ClassLevelDTO, QuizDTO } from "@/types";

export default function StudentQuizzesPage() {
  const { user } = useAuth();
  const { students } = useStudents();
  const { quizzes, loading, refetch } = useQuizzes();
  const [classOrder, setClassOrder] = useState<number | null>(null);

  const me = useMemo(
    () => students.find((s) => s.userId === user?.id),
    [students, user]
  );

  // Quiz.grade يقابل ClassLevel.order (نفس اتفاق Session/Assignment)
  useEffect(() => {
    if (!me?.classId) return;
    (async () => {
      const res = await fetch("/api/classes");
      const classes: ClassLevelDTO[] = res.ok ? await res.json() : [];
      setClassOrder(classes.find((c) => c.id === me.classId)?.order ?? null);
    })();
  }, [me?.classId]);

  const myQuizzes = useMemo(
    () =>
      classOrder === null
        ? []
        : quizzes.filter((q) => q.grade === classOrder),
    [quizzes, classOrder]
  );

  function myAttempt(quiz: QuizDTO) {
    // الخادم يرجع للطالب محاولاته فقط
    return quiz.attempts?.find((a) => a.studentId === me?.id);
  }

  const columns: Column<QuizDTO>[] = [
    { header: "العنوان", cell: (q) => q.title },
    { header: "المادة", cell: (q) => q.subject },
    { header: "المعلم", cell: (q) => q.teacher?.user?.name ?? "—" },
    {
      header: "الأسئلة",
      cell: (q) => (
        <Badge variant="secondary">{q.questions?.length ?? 0}</Badge>
      ),
    },
    { header: "التاريخ", cell: (q) => formatDate(q.createdAt) },
    {
      header: "الحالة",
      cell: (q) => {
        const attempt = myAttempt(q);
        return attempt ? (
          <Badge variant="success">
            {attempt.score} / {attempt.maxScore}
          </Badge>
        ) : (
          <Badge variant="warning">لم يُؤدَّ</Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">اختباراتي</h1>
      <DataTable
        columns={columns}
        data={myQuizzes}
        loading={loading}
        emptyTitle="لا توجد اختبارات"
        emptyMessage="ستظهر اختبارات صفّك هنا عند إضافتها من قبل المعلم"
        actions={(q) => {
          const attempt = myAttempt(q);
          if (attempt || !me) return null;
          return (
            <TakeQuizDialog
              quiz={q}
              studentId={me.id}
              onSuccess={refetch}
              trigger={
                <Button size="sm">
                  <Play className="h-4 w-4" />
                  بدء الاختبار
                </Button>
              }
            />
          );
        }}
      />
    </div>
  );
}
