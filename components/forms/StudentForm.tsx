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
import { useToast } from "@/components/ui/toaster";
import type { ClassLevelDTO, CreateStudentInput, StudentDTO } from "@/types";

const initialForm: CreateStudentInput = {
  name: "",
  email: "",
  phone: "",
  password: "",
  classId: "",
  subEndDate: "",
};

function toDateInput(date?: string | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default function StudentForm({
  trigger,
  student,
  onSuccess,
}: {
  trigger: React.ReactNode;
  /** عند تمريره يعمل النموذج في وضع التعديل */
  student?: StudentDTO;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(student);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStudentInput>(initialForm);
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("unpaid");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cash">("bank");

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        student
          ? {
              name: student.user?.name ?? "",
              email: student.user?.email ?? "",
              phone: student.user?.phone ?? "",
              password: "",
              classId: student.classId ?? "",
              subEndDate: toDateInput(student.subEndDate),
              monthlyFee: student.monthlyFee ?? undefined,
            }
          : initialForm
      );
      setPaymentStatus("unpaid");
      setPaidAmount("");
      setPaymentMethod("bank");
      fetch("/api/classes")
        .then((res) => (res.ok ? res.json() : []))
        .then(setClasses)
        .catch(() => setClasses([]));
    }
  }, [open, student]);

  const set = (key: keyof CreateStudentInput, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/students/${student!.id}` : "/api/students",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password || undefined,
            classId: form.classId || undefined,
            subEndDate: form.subEndDate || undefined,
            monthlyFee: form.monthlyFee || undefined,
            ...(!isEdit
              ? {
                  paymentStatus,
                  paidAmount:
                    paymentStatus === "partial" ? Number(paidAmount) : undefined,
                  paymentMethod,
                }
              : {}),
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الطالب");
      }
      setOpen(false);
      if (!isEdit) setForm(initialForm);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل الطالب بنجاح" : "تمت إضافة الطالب بنجاح",
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
          <DialogTitle>{isEdit ? "تعديل الطالب" : "إضافة طالب جديد"}</DialogTitle>
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
                placeholder={
                  isEdit ? "اتركه فارغًا للإبقاء على الحالية" : "123456 افتراضيًا"
                }
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-class">الصف</Label>
              <select
                id="student-class"
                value={form.classId}
                onChange={(e) => set("classId", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">بدون صف</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
            <Label htmlFor="student-monthly-fee">رسم الاشتراك الشهري (ر.س)</Label>
            <Input
              id="student-monthly-fee"
              type="number"
              min={0}
              value={form.monthlyFee ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  monthlyFee:
                    e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
            />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label>حالة دفع الاشتراك</Label>
              <div className="flex gap-4 text-sm">
                {(
                  [
                    ["paid", "تم الدفع"],
                    ["partial", "دفع جزئي"],
                    ["unpaid", "لم يتم الدفع"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="payment-status"
                      checked={paymentStatus === value}
                      onChange={() => setPaymentStatus(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {paymentStatus !== "unpaid" && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {paymentStatus === "partial" && (
                    <div className="space-y-2">
                      <Label htmlFor="student-paid-amount">
                        المبلغ المدفوع (ر.س)
                      </Label>
                      <Input
                        id="student-paid-amount"
                        type="number"
                        min={0}
                        required
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                      />
                      {form.monthlyFee !== undefined &&
                        Number(paidAmount) > 0 &&
                        form.monthlyFee > Number(paidAmount) && (
                          <p className="text-sm text-destructive">
                            المتبقي: {form.monthlyFee - Number(paidAmount)} ر.س
                          </p>
                        )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="student-pay-method">طريقة الدفع</Label>
                    <select
                      id="student-pay-method"
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as "bank" | "cash")
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="bank">تحويل بنكي</option>
                      <option value="cash">نقدي</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة الطالب"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
