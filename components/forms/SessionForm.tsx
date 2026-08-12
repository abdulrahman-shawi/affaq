"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  SessionDTO,
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

const emptyForm = {
  subject: "",
  classOrder: "",
  date: "",
  zoomLink: "",
  recordingUrl: "",
};

export default function SessionForm({
  session,
  onSuccess,
  trigger,
}: {
  /** تمرير حصة يفعّل وضع التعديل، وبدونه يكون إنشاء */
  session?: SessionDTO;
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const isEdit = Boolean(session);
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState(emptyForm);

  // عند فتح النموذج: نجلب ملف المعلم وقوائم المواد والصفوف من قاعدة البيانات
  useEffect(() => {
    if (!open || !user) return;
    setError(null);
    setForm(
      session
        ? {
            subject: session.subject,
            classOrder: String(session.grade),
            date: session.date.slice(0, 10),
            zoomLink: session.zoomLink ?? "",
            recordingUrl: session.recordingUrl ?? "",
          }
        : emptyForm
    );
    (async () => {
      try {
        const teachersRes = await fetch("/api/teachers");
        const teachers: TeacherDTO[] = teachersRes.ok
          ? await teachersRes.json()
          : [];
        const me = teachers.find((t) => t.userId === user.id) ?? null;
        setTeacher(me);

        let subjectOptions: SubjectOption[] = me?.subjects ?? [];
        let classOptions: ClassOption[] = me?.classes ?? [];

        // إن لم تُسند للمعلم مواد أو صفوف بعد، نعرض القوائم الكاملة
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
  }, [open, user, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !teacher) {
      setError("لم يتم العثور على ملف المعلم");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/sessions/${session!.id}` : "/api/sessions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isEdit ? {} : { teacherId: teacher!.id }),
            subject: form.subject,
            grade: Number(form.classOrder),
            date: form.date,
            zoomLink: form.zoomLink.trim() || null,
            recordingUrl: form.recordingUrl.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الحصة");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل الحصة بنجاح" : "تم إنشاء الحصة بنجاح",
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الحصة" : "إنشاء حصة جديدة"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-subject">المادة</Label>
            <select
              id="session-subject"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-class">الصف</Label>
              <select
                id="session-class"
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
            <div className="space-y-2">
              <Label htmlFor="session-date">التاريخ</Label>
              <Input
                id="session-date"
                type="date"
                required
                dir="ltr"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-zoom">رابط Zoom (اختياري)</Label>
            <Input
              id="session-zoom"
              type="url"
              dir="ltr"
              placeholder="https://zoom.us/j/..."
              value={form.zoomLink}
              onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-recording">رابط التسجيل (اختياري)</Label>
            <Input
              id="session-recording"
              type="url"
              dir="ltr"
              placeholder="https://..."
              value={form.recordingUrl}
              onChange={(e) =>
                setForm({ ...form, recordingUrl: e.target.value })
              }
            />
          </div>
          {subjects.length === 0 && classes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد مواد أو صفوف في النظام بعد — تواصل مع الإدارة لإضافتها.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إنشاء الحصة"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
