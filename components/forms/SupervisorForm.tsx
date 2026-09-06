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
import type { CreateSupervisorInput, SupervisorDTO } from "@/types";

const initialForm: CreateSupervisorInput = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

export default function SupervisorForm({
  supervisor,
  trigger,
  onSuccess,
}: {
  /** عند تمريره يعمل النموذج بوضع التعديل */
  supervisor?: SupervisorDTO;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const isEdit = !!supervisor;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSupervisorInput>(initialForm);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      supervisor
        ? {
            name: supervisor.name,
            email: supervisor.email ?? "",
            phone: supervisor.phone ?? "",
            password: "",
          }
        : initialForm
    );
  }, [open, supervisor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/supervisors/${supervisor!.id}` : "/api/supervisors",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          // كلمة المرور تُرسل فقط عند إدخالها
          body: JSON.stringify({
            ...form,
            email: form.email || undefined,
            phone: form.phone || undefined,
            password: form.password || undefined,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ المشرف");
      }
      setOpen(false);
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
          <DialogTitle>{isEdit ? "تعديل المشرف" : "إضافة مشرف جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supervisor-name">الاسم</Label>
            <Input
              id="supervisor-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor-email">البريد الإلكتروني (اختياري)</Label>
            <Input
              id="supervisor-email"
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor-phone">رقم الهاتف (اختياري)</Label>
            <Input
              id="supervisor-phone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor-password">
              {isEdit ? "كلمة المرور (اتركها فارغة لعدم التغيير)" : "كلمة المرور"}
            </Label>
            <Input
              id="supervisor-password"
              type="password"
              dir="ltr"
              placeholder={isEdit ? "" : "123456"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة المشرف"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
