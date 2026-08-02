"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClassLevelDTO, StudentDTO } from "@/types";

/**
 * Two modes:
 * - default: records a grade via POST /api/grades (needs a student select)
 * - submission mode (submissionId + fixedStudentName): grades a submission
 *   via PATCH /api/submissions
 */
export default function GradeForm({
  trigger,
  onSuccess,
  submissionId,
  studentName,
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
  submissionId?: string;
  studentName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [form, setForm] = useState({
    classId: "",
    studentId: "",
    subject: "",
    type: "quiz" as "quiz" | "exam" | "homework",
    score: 0,
    maxScore: 100,
    note: "",
  });

  useEffect(() => {
    if (!open || submissionId) return;
    Promise.all([fetch("/api/classes"), fetch("/api/students")])
      .then(async ([classesRes, studentsRes]) => {
        setClasses(classesRes.ok ? await classesRes.json() : []);
        setStudents(studentsRes.ok ? await studentsRes.json() : []);
      })
      .catch(() => {
        setClasses([]);
        setStudents([]);
      });
  }, [open, submissionId]);

  // مواد الصف المختار وطلابه
  const selectedClass = classes.find((c) => c.id === form.classId);
  const classSubjects = selectedClass?.subjects ?? [];
  const classStudents = form.classId
    ? students.filter((s) => s.classId === form.classId)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = submissionId
        ? await fetch("/api/submissions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: submissionId,
              grade: form.score,
              feedback: form.note || undefined,
            }),
          })
        : await fetch("/api/grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: form.studentId,
              subject: form.subject,
              type: form.type,
              score: form.score,
              maxScore: form.maxScore,
              note: form.note,
            }),
          });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الدرجة");
      }
      setOpen(false);
      setForm({ classId: "", studentId: "", subject: "", type: "quiz", score: 0, maxScore: 100, note: "" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{submissionId ? "تقييم التسليم" : "رصد درجة"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {submissionId ? (
            <div className="space-y-2">
              <Label>الطالب</Label>
              <Input value={studentName ?? ""} disabled />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="grade-class">الصف</Label>
                <select
                  id="grade-class"
                  required
                  className={selectClass}
                  value={form.classId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      classId: e.target.value,
                      studentId: "",
                      subject: "",
                    })
                  }
                >
                  <option value="">اختر الصف</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-student">الطالب</Label>
                <select
                  id="grade-student"
                  required
                  className={selectClass}
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  disabled={!form.classId}
                >
                  <option value="">
                    {form.classId ? "اختر الطالب" : "اختر الصف أولًا"}
                  </option>
                  {classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.name ?? s.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade-subject">المادة</Label>
                  <select
                    id="grade-subject"
                    required
                    className={selectClass}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    disabled={!form.classId}
                  >
                    <option value="">
                      {form.classId ? "اختر المادة" : "اختر الصف أولًا"}
                    </option>
                    {classSubjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade-type">النوع</Label>
                  <select
                    id="grade-type"
                    className={selectClass}
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as "quiz" | "exam" | "homework",
                      })
                    }
                  >
                    <option value="quiz">اختبار قصير</option>
                    <option value="exam">اختبار</option>
                    <option value="homework">واجب</option>
                  </select>
                </div>
              </div>
              {form.classId && classSubjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  لا توجد مواد مرتبطة بهذا الصف — تواصل مع الإدارة لربط المواد.
                </p>
              )}
              {form.classId && classStudents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  لا يوجد طلاب مسجلون في هذا الصف.
                </p>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade-score">الدرجة</Label>
              <Input
                id="grade-score"
                type="number"
                min={0}
                required
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              />
            </div>
            {!submissionId && (
              <div className="space-y-2">
                <Label htmlFor="grade-max">الدرجة العظمى</Label>
                <Input
                  id="grade-max"
                  type="number"
                  min={1}
                  required
                  value={form.maxScore}
                  onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade-note">{submissionId ? "ملاحظات التقييم" : "ملاحظة"}</Label>
            <Input
              id="grade-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ الدرجة"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
