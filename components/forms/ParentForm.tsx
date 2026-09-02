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
import { Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import type { ParentDTO } from "@/types";

const emptyForm = { name: "", email: "", password: "", phone: "" };

export default function ParentForm({
  trigger,
  parent,
  onSuccess,
}: {
  trigger: React.ReactNode;
  /** عند تمريره يعمل النموذج في وضع التعديل */
  parent?: ParentDTO;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(parent);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraPhones, setExtraPhones] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        parent
          ? {
              name: parent.user?.name ?? "",
              email: parent.user?.email ?? "",
              password: "",
              phone: parent.user?.phone ?? "",
            }
          : emptyForm
      );
      setExtraPhones(parent?.phones ?? []);
    }
  }, [open, parent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/parents/${parent!.id}` : "/api/parents",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            phone: form.phone || undefined,
            phones: extraPhones.filter((p) => p.trim() !== ""),
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? (isEdit ? "فشل في تعديل ولي الأمر" : "فشل في إضافة ولي الأمر")
        );
      }
      setOpen(false);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل ولي الأمر بنجاح" : "تمت إضافة ولي الأمر بنجاح",
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
          <DialogTitle>
            {isEdit ? "تعديل ولي الأمر" : "إضافة ولي أمر جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parent-name">الاسم</Label>
            <Input
              id="parent-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent-email">البريد الإلكتروني</Label>
            <Input
              id="parent-email"
              type="email"
              required
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent-password">كلمة المرور</Label>
            <Input
              id="parent-password"
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
            <Label htmlFor="parent-phone">رقم الهاتف الأساسي</Label>
            <PhoneInput
              id="parent-phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>أرقام هواتف إضافية</Label>
            {extraPhones.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <PhoneInput
                    value={p}
                    onChange={(v) =>
                      setExtraPhones((list) =>
                        list.map((item, idx) => (idx === i ? v : item))
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setExtraPhones((list) => list.filter((_, idx) => idx !== i))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExtraPhones((list) => [...list, ""])}
            >
              <Plus className="h-4 w-4" />
              إضافة رقم آخر
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة ولي الأمر"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
