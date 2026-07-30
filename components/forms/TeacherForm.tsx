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
import type { ClassLevelDTO, SubjectDTO } from "@/types";

const initialForm = { name: "", email: "", password: "", phone: "" };

export default function TeacherForm({
  trigger,
  onSuccess,
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);

  useEffect(() => {
    if (open) {
      setError(null);
      fetch("/api/subjects")
        .then((res) => (res.ok ? res.json() : []))
        .then(setSubjects)
        .catch(() => setSubjects([]));
      fetch("/api/classes")
        .then((res) => (res.ok ? res.json() : []))
        .then(setClasses)
        .catch(() => setClasses([]));
    }
  }, [open]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (id: string) =>
      setter((ids) =>
        ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
      );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          phone: form.phone || undefined,
          subjectIds,
          classIds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إضافة المعلم");
      }
      setOpen(false);
      setForm(initialForm);
      setSubjectIds([]);
      setClassIds([]);
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
          <DialogTitle>إضافة معلم جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher-name">الاسم</Label>
            <Input
              id="teacher-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-email">البريد الإلكتروني</Label>
            <Input
              id="teacher-email"
              type="email"
              required
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-password">كلمة المرور</Label>
            <Input
              id="teacher-password"
              type="password"
              dir="ltr"
              placeholder="123456 افتراضيًا"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>المواد</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد مواد بعد — أضفها من صفحة المواد
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(s.id)}
                      onChange={() => toggle(setSubjectIds)(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>الصفوف</Label>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد صفوف بعد — أضفها من صفحة الصفوف
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {classes.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={classIds.includes(c.id)}
                      onChange={() => toggle(setClassIds)(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "إضافة المعلم"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
