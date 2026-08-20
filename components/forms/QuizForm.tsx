"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import type {
  ClassLevelDTO,
  CreateQuizQuestionInput,
  QuizDTO,
  SubjectDTO,
  TeacherDTO,
} from "@/types";

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  order: number;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const emptyQuestion = (): CreateQuizQuestionInput => ({
  type: "mcq",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
});

const emptyForm = {
  title: "",
  subject: "",
  classOrder: "",
  duration: "",
  publishNow: true,
};

export default function QuizForm({
  quiz,
  onSuccess,
  trigger,
}: {
  quiz?: QuizDTO; // عند تمريره يعمل النموذج في وضع التعديل
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const isEdit = Boolean(quiz);
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState<CreateQuizQuestionInput[]>([
    emptyQuestion(),
  ]);

  // عند فتح النموذج: نجلب ملف المعلم وقوائم المواد والصفوف (نفس نمط AssignmentForm)
  // وفي وضع التعديل نعبّئ الحقول من الاختبار الحالي
  useEffect(() => {
    if (!open || !user) return;
    setError(null);
    setForm(
      quiz
        ? {
            title: quiz.title,
            subject: quiz.subject,
            classOrder: String(quiz.grade),
            duration: quiz.durationMinutes ? String(quiz.durationMinutes) : "",
            publishNow: quiz.published !== false,
          }
        : emptyForm
    );
    setQuestions(
      quiz?.questions?.length
        ? quiz.questions.map((q) => ({
            type: q.type === "truefalse" ? "truefalse" : "mcq",
            text: q.text,
            options: [...q.options],
            correctIndex: q.correctIndex ?? 0,
            points: q.points,
          }))
        : [emptyQuestion()]
    );
    (async () => {
      try {
        let me: TeacherDTO | null = null;
        if (user.role === "teacher") {
          const teachersRes = await fetch("/api/teachers");
          const teachers: TeacherDTO[] = teachersRes.ok
            ? await teachersRes.json()
            : [];
          me = teachers.find((t) => t.userId === user.id) ?? null;
        } else if (user.role === "admin") {
          // المدير ينشئ باسم أول معلم متاح إن لم يختر — نجلب القائمة للعرض
          const teachersRes = await fetch("/api/teachers");
          const teachers: TeacherDTO[] = teachersRes.ok
            ? await teachersRes.json()
            : [];
          me = teachers[0] ?? null;
        }
        setTeacher(me);

        let subjectOptions: SubjectOption[] = me?.subjects ?? [];
        let classOptions: ClassOption[] = me?.classes ?? [];

        if (subjectOptions.length === 0 || classOptions.length === 0) {
          const [subjectsRes, classesRes] = await Promise.all([
            fetch("/api/subjects"),
            fetch("/api/classes"),
          ]);
          if (subjectOptions.length === 0 && subjectsRes.ok) {
            subjectOptions = (await subjectsRes.json()).map(
              (s: SubjectDTO) => ({ id: s.id, name: s.name })
            );
          }
          if (classOptions.length === 0 && classesRes.ok) {
            classOptions = (await classesRes.json()).map(
              (c: ClassLevelDTO) => ({ id: c.id, name: c.name, order: c.order })
            );
          }
        }

        setSubjects(subjectOptions);
        setClasses(classOptions);
      } catch {
        setSubjects([]);
        setClasses([]);
      }
    })();
  }, [open, user, quiz]);

  function updateQuestion(
    index: number,
    patch: Partial<CreateQuizQuestionInput>
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) => (j === oIndex ? value : o)),
            }
          : q
      )
    );
  }

  // تبديل نوع السؤال يعيد ضبط خياراته: صح/خطأ بخيارين ثابتين
  function changeQuestionType(index: number, type: "mcq" | "truefalse") {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
              ...q,
              type,
              options:
                type === "truefalse" ? ["صح", "خطأ"] : ["", "", "", ""],
              correctIndex: 0,
            }
          : q
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !teacher) {
      setError("لم يتم العثور على ملف المعلم");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        subject: form.subject,
        grade: Number(form.classOrder),
        durationMinutes: form.duration ? Number(form.duration) : null,
        published: form.publishNow,
        questions,
      };
      const res = await fetch(
        isEdit ? `/api/quizzes/${quiz!.id}` : "/api/quizzes",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit ? payload : { ...payload, teacherId: teacher!.id }
          ),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ??
            (isEdit ? "فشل في تعديل الاختبار" : "فشل في إنشاء الاختبار")
        );
      }
      setOpen(false);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل الاختبار بنجاح" : "تم إنشاء الاختبار بنجاح",
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل الاختبار" : "إنشاء اختبار جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quiz-title">عنوان الاختبار</Label>
            <Input
              id="quiz-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-subject">المادة</Label>
              <select
                id="quiz-subject"
                required
                className={selectClass}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">اختر المادة</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiz-class">الصف</Label>
              <select
                id="quiz-class"
                required
                className={selectClass}
                value={form.classOrder}
                onChange={(e) =>
                  setForm({ ...form, classOrder: e.target.value })
                }
              >
                <option value="">اختر الصف</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.order}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-duration">المدة بالدقائق (اختياري)</Label>
            <Input
              id="quiz-duration"
              type="number"
              min={1}
              step={1}
              placeholder="اتركه فارغًا لاختبار بلا مؤقت"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.publishNow}
              onChange={(e) =>
                setForm({ ...form, publishNow: e.target.checked })
              }
            />
            نشر الاختبار للطلاب فورًا (أوقفه لحفظه كمسودة)
          </label>
          {isEdit && (quiz?.attempts?.length ?? 0) > 0 && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              تنبيه: لهذا الاختبار {quiz!.attempts!.length} محاولة مسجلة.
              تعديل الأسئلة لا يغيّر درجات المحاولات السابقة.
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>الأسئلة</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuestions((prev) => [...prev, emptyQuestion()])
                }
              >
                <Plus className="h-4 w-4" />
                إضافة سؤال
              </Button>
            </div>
            {questions.map((q, qi) => (
              <div key={qi} className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">سؤال {qi + 1}</span>
                    <select
                      aria-label="نوع السؤال"
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={q.type ?? "mcq"}
                      onChange={(e) =>
                        changeQuestionType(
                          qi,
                          e.target.value as "mcq" | "truefalse"
                        )
                      }
                    >
                      <option value="mcq">اختيار من متعدد</option>
                      <option value="truefalse">صح / خطأ</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`points-${qi}`} className="text-xs">
                      الدرجة
                    </Label>
                    <Input
                      id={`points-${qi}`}
                      type="number"
                      min={1}
                      step="any"
                      className="h-8 w-20"
                      value={q.points ?? 1}
                      onChange={(e) =>
                        updateQuestion(qi, { points: Number(e.target.value) })
                      }
                    />
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setQuestions((prev) =>
                            prev.filter((_, i) => i !== qi)
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  required
                  placeholder="نص السؤال"
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                />
                <div className="space-y-2">
                  {(q.type ?? "mcq") === "truefalse" ? (
                    <div className="flex gap-4">
                      {q.options.map((option, oi) => (
                        <label
                          key={oi}
                          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correctIndex === oi}
                            onChange={() =>
                              updateQuestion(qi, { correctIndex: oi })
                            }
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <>
                      {q.options.map((option, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            title="الإجابة الصحيحة"
                            checked={q.correctIndex === oi}
                            onChange={() =>
                              updateQuestion(qi, { correctIndex: oi })
                            }
                          />
                          <Input
                            required
                            placeholder={`الخيار ${oi + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qi, oi, e.target.value)}
                          />
                        </div>
                      ))}
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {(q.type ?? "mcq") === "truefalse"
                      ? "حدّد الإجابة الصحيحة: صح أم خطأ"
                      : "حدّد الدائرة بجانب الإجابة الصحيحة"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إنشاء الاختبار"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
