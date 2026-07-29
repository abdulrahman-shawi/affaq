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
import type { CreateStudentInput } from "@/types";

export default function StudentForm({
  trigger,
  onSuccess,
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStudentInput>({
    name: "",
    email: "",
    password: "",
    phone: "",
    grade: 1,
  });

  const set = (key: keyof CreateStudentInput, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إضافة الطالب");
      }
      setOpen(false);
      setForm({ name: "", email: "", password: "", phone: "", grade: 1 });
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
          <DialogTitle>إضافة طالب جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-name">الاسم</Label>
            <Input
              id="student-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-email">البريد الإلكتروني</Label>
            <Input
              id="student-email"
              type="email"
              required
              dir="ltr"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-password">كلمة المرور</Label>
            <Input
              id="student-password"
              type="password"
              dir="ltr"
              placeholder="123456 افتراضيًا"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-grade">الصف</Label>
              <Input
                id="student-grade"
                type="number"
                min={1}
                max={12}
                required
                value={form.grade}
                onChange={(e) => set("grade", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-phone">رقم الجوال</Label>
              <Input
                id="student-phone"
                dir="ltr"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "إضافة الطالب"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
