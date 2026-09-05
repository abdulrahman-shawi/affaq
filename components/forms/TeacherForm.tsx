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
import PhoneInput from "@/components/ui/phone-input";
import { useToast } from "@/components/ui/toaster";
import type { TeacherDTO } from "@/types";

const initialForm = { name: "", email: "", phone: "", password: "", shift: "" };

export default function TeacherForm({
  trigger,
  teacher,
  onSuccess,
}: {
  trigger: React.ReactNode;
  /** عند تمريره يعمل النموذج في وضع التعديل */
  teacher?: TeacherDTO;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(teacher);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        teacher
          ? {
              name: teacher.user?.name ?? "",
              email: teacher.user?.email ?? "",
              phone: teacher.user?.phone ?? "",
              password: "",
              shift: teacher.shift ?? "",
            }
          : initialForm
      );
    }
  }, [open, teacher]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/teachers/${teacher!.id}` : "/api/teachers",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password || undefined,
            shift: form.shift || null,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ المعلم");
      }
      setOpen(false);
      if (!isEdit) setForm(initialForm);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل المعلم بنجاح" : "تمت إضافة المعلم بنجاح",
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
          <DialogTitle>{isEdit ? "تعديل المعلم" : "إضافة معلم جديد"}</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-phone">رقم الهاتف</Label>
              <PhoneInput
                id="teacher-phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-password">كلمة المرور</Label>
              <Input
                id="teacher-password"
                type="password"
                dir="ltr"
                placeholder={
                  isEdit ? "اتركه فارغًا للإبقاء على الحالية" : "123456 افتراضيًا"
                }
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-shift">الدوام</Label>
              <select
                id="teacher-shift"
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">غير محدد</option>
                <option value="morning">صباحي</option>
                <option value="evening">مسائي</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة المعلم"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
