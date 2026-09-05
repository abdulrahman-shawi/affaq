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
import { CURRENCY_LABELS } from "@/app/lib/utils";
import type { CreatePaymentInput, StudentDTO } from "@/types";

export default function PaymentForm({
  trigger,
  onSuccess,
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [form, setForm] = useState<CreatePaymentInput>({
    studentId: "",
    amount: 0,
    method: "bank",
    period: "monthly",
    months: 1,
    note: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/students")
      .then((res) => (res.ok ? res.json() : []))
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // رفع صورة الإشعار (إن وُجدت) مباشرة إلى Vercel Blob
      let receiptUrl: string | undefined;
      if (receipt) {
        const blob = await upload(receipt.name, receipt, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        receiptUrl = blob.url;
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, receiptUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في تسجيل الدفعة");
      }
      setOpen(false);
      setForm({ studentId: "", amount: 0, method: "bank", period: "monthly", months: 1, note: "" });
      setReceipt(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const selectedStudent = students.find((s) => s.id === form.studentId);
  const currencyLabel = CURRENCY_LABELS[selectedStudent?.currency ?? "SAR"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-student">الطالب</Label>
            <select
              id="payment-student"
              required
              className={selectClass}
              value={form.studentId}
              onChange={(e) => {
                const studentId = e.target.value;
                const fee = students.find((s) => s.id === studentId)?.monthlyFee;
                // تعبئة المبلغ المستحق تلقائيًا من رسم الاشتراك الشهري للطالب
                setForm({ ...form, studentId, dueAmount: fee ?? undefined });
              }}
            >
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.name ?? s.id}
                </option>
              ))}
            </select>
            {(() => {
              const fee = students.find((s) => s.id === form.studentId)?.monthlyFee;
              return fee != null ? (
                <p className="text-sm text-muted-foreground">
                  المبلغ المترتب شهريًا على الطالب: {fee} {currencyLabel}
                </p>
              ) : null;
            })()}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">المبلغ المدفوع ({currencyLabel})</Label>
              <Input
                id="payment-amount"
                type="number"
                min={0}
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-due-amount">المبلغ المستحق (اختياري)</Label>
              <Input
                id="payment-due-amount"
                type="number"
                min={0}
                value={form.dueAmount ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dueAmount: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          {form.dueAmount !== undefined && form.dueAmount > form.amount && (
            <p className="text-sm text-destructive">
              المتبقي على الطالب: {form.dueAmount - form.amount} {currencyLabel}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-months">عدد الأشهر</Label>
              <Input
                id="payment-months"
                type="number"
                min={1}
                value={form.months ?? 1}
                onChange={(e) => setForm({ ...form, months: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">طريقة الدفع</Label>
              <select
                id="payment-method"
                className={selectClass}
                value={form.method}
                onChange={(e) =>
                  setForm({ ...form, method: e.target.value as "bank" | "cash" })
                }
              >
                <option value="bank">تحويل بنكي</option>
                <option value="cash">نقدي</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-period">الفترة</Label>
              <select
                id="payment-period"
                className={selectClass}
                value={form.period}
                onChange={(e) =>
                  setForm({
                    ...form,
                    period: e.target.value as "year" | "semester" | "monthly",
                  })
                }
              >
                <option value="monthly">شهري</option>
                <option value="semester">فصلي</option>
                <option value="year">سنوي</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-receipt">صورة الإشعار (اختياري)</Label>
            <Input
              id="payment-receipt"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-note">ملاحظة</Label>
            <Input
              id="payment-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
