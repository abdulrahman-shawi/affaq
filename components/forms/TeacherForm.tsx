"use client";

import { useState } from "react";
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
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    subjects: "",
    grades: "",
  });

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
          subjects: form.subjects
            .split(/[,،]/)
            .map((s) => s.trim())
            .filter(Boolean),
          grades: form.grades
            .split(/[,،]/)
            .map((g) => Number(g.trim()))
            .filter((g) => !Number.isNaN(g)),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إضافة المعلم");
      }
      setOpen(false);
      setForm({ name: "", email: "", password: "", phone: "", subjects: "", grades: "" });
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
            <Label htmlFor="teacher-subjects">المواد (افصل بفاصلة)</Label>
            <Input
              id="teacher-subjects"
              placeholder="رياضيات، علوم"
              value={form.subjects}
              onChange={(e) => setForm({ ...form, subjects: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-grades">الصفوف (افصل بفاصلة)</Label>
            <Input
              id="teacher-grades"
              placeholder="7، 8، 9"
              dir="ltr"
              value={form.grades}
              onChange={(e) => setForm({ ...form, grades: e.target.value })}
            />
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
