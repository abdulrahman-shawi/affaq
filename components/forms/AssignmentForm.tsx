"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
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
import { useAuth } from "@/hooks/useAuth";
import type { ClassLevelDTO, SubjectDTO, TeacherDTO } from "@/types";

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

const emptyForm = { title: "", subject: "", classOrder: "", dueDate: "" };

export default function AssignmentForm({
  trigger,
  onSuccess,
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);

  // عند فتح النموذج: نجلب المواد والصفوف من قاعدة البيانات
  // للمعلم نعرض ما أُسند إليه فقط، وإن لم يُسند له شيء نعرض القوائم الكاملة
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      try {
        let subjectOptions: SubjectOption[] = [];
        let classOptions: ClassOption[] = [];

        if (user.role === "teacher") {
          const teachersRes = await fetch("/api/teachers");
          const teachers: TeacherDTO[] = teachersRes.ok
            ? await teachersRes.json()
            : [];
          const me = teachers.find((t) => t.userId === user.id);
          subjectOptions = me?.subjects ?? [];
          classOptions = me?.classes ?? [];
        }

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
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // رفع الملف (إن وُجد) مباشرة إلى Vercel Blob
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (file) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        fileUrl = blob.url;
        fileName = file.name;
      }

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subject: form.subject,
          grade: Number(form.classOrder),
          dueDate: form.dueDate,
          fileUrl,
          fileName,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إنشاء الواجب");
      }
      setOpen(false);
      setForm(emptyForm);
      setFile(null);
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
          <DialogTitle>إنشاء واجب جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignment-title">عنوان الواجب</Label>
            <Input
              id="assignment-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignment-subject">المادة</Label>
              <select
                id="assignment-subject"
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
              <Label htmlFor="assignment-class">الصف</Label>
              <select
                id="assignment-class"
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
            <Label htmlFor="assignment-due">تاريخ التسليم</Label>
            <Input
              id="assignment-due"
              type="date"
              required
              dir="ltr"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignment-file">ملف مرفق (اختياري)</Label>
            <Input
              id="assignment-file"
              type="file"
              dir="ltr"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              صور، PDF، Word، Excel، أو فيديو
            </p>
          </div>
          {subjects.length === 0 && classes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد مواد أو صفوف في النظام بعد — تواصل مع الإدارة لإضافتها.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "إنشاء الواجب"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
