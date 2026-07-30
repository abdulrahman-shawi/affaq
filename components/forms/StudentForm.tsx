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
import { useToast } from "@/components/ui/toaster";
import type { CreateStudentInput } from "@/types";

const initialForm: CreateStudentInput = {
  name: "",
  email: "",
  phone: "",
  password: "",
  grade: 1,
  subEndDate: "",
};

export default function StudentForm({
  trigger,
  onSuccess,
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStudentInput>(initialForm);

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
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password || undefined,
          grade: form.grade,
          subEndDate: form.subEndDate || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إضافة الطالب");
      }
      setOpen(false);
      setForm(initialForm);
      toast({ variant: "success", title: "تمت إضافة الطالب بنجاح" });
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
            <Label htmlFor="student-name">اسم الطالب</Label>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-phone">رقم الهاتف</Label>
              <Input
                id="student-phone"
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-grade">الصف (1 - 8)</Label>
              <Input
                id="student-grade"
                type="number"
                min={1}
                max={8}
                required
                value={form.grade}
                onChange={(e) => set("grade", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-subend">نهاية الاشتراك</Label>
              <Input
                id="student-subend"
                type="date"
                dir="ltr"
                value={form.subEndDate}
                onChange={(e) => set("subEndDate", e.target.value)}
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
