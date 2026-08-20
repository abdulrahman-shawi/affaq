"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  BarChart3,
  Pencil,
  Globe,
  EyeOff,
  ClipboardList,
  Percent,
  CheckCircle2,
  Search,
} from "lucide-react";
import DataTable, { type Column } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuizForm from "@/components/forms/QuizForm";
import QuizResultsDialog from "@/components/forms/QuizResultsDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { useToast } from "@/components/ui/toaster";
import { useQuizzes } from "@/hooks/useQuizzes";
import { useStudents } from "@/hooks/useStudents";
import { formatDate } from "@/app/lib/utils";
import type { ClassLevelDTO, QuizDTO } from "@/types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-44";

export default function TeacherQuizzesPage() {
  const { quizzes, loading, refetch } = useQuizzes();
  const { students } = useStudents();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  // نحتاج ترتيب الصفوف لحساب نسبة الإنجاز (Quiz.grade يقابل ClassLevel.order)
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/classes");
      if (res.ok) setClasses(await res.json());
    })();
  }, []);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في حذف الاختبار");
    }
    toast({ variant: "success", title: "تم حذف الاختبار" });
    refetch();
  }

  async function handleTogglePublish(q: QuizDTO) {
    const res = await fetch(`/api/quizzes/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !(q.published !== false) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast({
        variant: "destructive",
        title: body?.error ?? "فشل في تغيير حالة النشر",
      });
      return;
    }
    toast({
      variant: "success",
      title: q.published !== false ? "تم إيقاف النشر (مسودة)" : "تم نشر الاختبار",
    });
    refetch();
  }

  // خيارات الفلاتر من البيانات نفسها
  const subjectOptions = useMemo(
    () => Array.from(new Set(quizzes.map((q) => q.subject))),
    [quizzes]
  );
  const gradeOptions = useMemo(
    () =>
      Array.from(new Set(quizzes.map((q) => q.grade))).sort((a, b) => a - b),
    [quizzes]
  );

  const filtered = useMemo(
    () =>
      quizzes.filter(
        (q) =>
          (!search || q.title.includes(search)) &&
          (!subjectFilter || q.subject === subjectFilter) &&
          (!gradeFilter || q.grade === Number(gradeFilter))
      ),
    [quizzes, search, subjectFilter, gradeFilter]
  );

  const stats = useMemo(() => {
    const attempts = quizzes.flatMap((q) => q.attempts ?? []);
    // متوسط الدرجات كنسبة مئوية من الدرجات العظمى
    const avgScore =
      attempts.length === 0
        ? 0
        : attempts.reduce(
            (sum, a) => sum + (a.maxScore > 0 ? a.score / a.maxScore : 0),
            0
          ) / attempts.length;
    // نسبة الإنجاز = المحاولات ÷ عدد الطلاب المستهدفين بالاختبارات المنشورة
    const orderByClassId = new Map(classes.map((c) => [c.id, c.order]));
    const expected = quizzes
      .filter((q) => q.published !== false)
      .reduce(
        (sum, q) =>
          sum +
          students.filter((s) => orderByClassId.get(s.classId ?? "") === q.grade)
            .length,
        0
      );
    const completion =
      expected > 0 ? Math.min(1, attempts.length / expected) : 0;
    return {
      total: quizzes.length,
      avgScore: `${Math.round(avgScore * 100)}%`,
      completion: `${Math.round(completion * 100)}%`,
    };
  }, [quizzes, students, classes]);

  const columns: Column<QuizDTO>[] = [
    { header: "العنوان", cell: (q) => q.title },
    { header: "المادة", cell: (q) => q.subject },
    { header: "الصف", cell: (q) => `الصف ${q.grade}` },
    {
      header: "الحالة",
      cell: (q) =>
        q.published !== false ? (
          <Badge variant="success">منشور</Badge>
        ) : (
          <Badge variant="warning">مسودة</Badge>
        ),
    },
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="عدد الاختبارات"
          value={stats.total}
          icon={ClipboardList}
        />
        <StatCard
          title="متوسط الدرجات"
          value={stats.avgScore}
          icon={Percent}
          iconClassName="text-emerald-500/60"
        />
        <StatCard
          title="نسبة الإنجاز"
          value={stats.completion}
          icon={CheckCircle2}
          iconClassName="text-sky-500/60"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالعنوان..."
              className="pr-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="فلترة بالمادة"
            className={selectClass}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">كل المواد</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            aria-label="فلترة بالصف"
            className={selectClass}
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value="">كل الصفوف</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                الصف {g}
              </option>
            ))}
          </select>
        </div>
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
        data={filtered}
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
            <Button
              variant="ghost"
              size="icon"
              title={q.published !== false ? "إيقاف النشر" : "نشر"}
              onClick={() => handleTogglePublish(q)}
            >
              {q.published !== false ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4 text-emerald-600" />
              )}
            </Button>
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
