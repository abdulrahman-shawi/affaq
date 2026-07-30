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

interface CreatedCredentials {
  studentEmail: string;
  studentPassword: string;
  parentEmail: string;
  parentPassword: string | null;
}

const initialForm: CreateStudentInput = {
  name: "",
  grade: 1,
  parentPhone: "",
  parentEmail: "",
  subEndDate: "",
};

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
  const [form, setForm] = useState<CreateStudentInput>(initialForm);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(
    null
  );

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
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في إضافة الطالب");
      }
      setCredentials(body.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setForm(initialForm);
    setError(null);
    if (credentials) {
      setCredentials(null);
      onSuccess?.();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {credentials ? "تمت إضافة الطالب" : "إضافة طالب جديد"}
          </DialogTitle>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              احفظ بيانات الدخول التالية وسلّمها للطالب وولي الأمر — لن تظهر
              مرة أخرى:
            </p>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">حساب الطالب</p>
              <p dir="ltr" className="text-left">
                {credentials.studentEmail}
              </p>
              <p dir="ltr" className="text-left">
                {credentials.studentPassword}
              </p>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">حساب ولي الأمر</p>
              <p dir="ltr" className="text-left">
                {credentials.parentEmail}
              </p>
              <p dir="ltr" className="text-left">
                {credentials.parentPassword ?? "لديه حساب مسبق"}
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              تم
            </Button>
          </div>
        ) : (
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
            <div className="space-y-2">
              <Label htmlFor="parent-phone">هاتف ولي الأمر</Label>
              <Input
                id="parent-phone"
                required
                dir="ltr"
                placeholder="05xxxxxxxx"
                value={form.parentPhone}
                onChange={(e) => set("parentPhone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-email">بريد ولي الأمر</Label>
              <Input
                id="parent-email"
                type="email"
                required
                dir="ltr"
                placeholder="parent@example.com"
                value={form.parentEmail}
                onChange={(e) => set("parentEmail", e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "إضافة الطالب"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
