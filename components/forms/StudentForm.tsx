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
import { CURRENCY_LABELS } from "@/app/lib/utils";
import type { ClassLevelDTO, CreateStudentInput, StudentDTO } from "@/types";

const initialForm: CreateStudentInput = {
  name: "",
  email: "",
  phone: "",
  password: "",
  classId: "",
  subEndDate: "",
  address: "",
  birthDate: "",
  regGoal: "",
  fatherName: "",
  motherName: "",
  guardianPhones: [],
  currency: "SAR",
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
              address: student.address ?? "",
              birthDate: toDateInput(student.birthDate),
              regGoal: student.regGoal ?? "",
              fatherName: student.fatherName ?? "",
              motherName: student.motherName ?? "",
              guardianPhones: student.guardianPhones ?? [],
              shift: student.shift ?? undefined,
              currency: student.currency ?? "SAR",
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
            email: form.email || undefined,
            phone: form.phone || undefined,
            password: form.password || undefined,
            classId: form.classId || undefined,
            subEndDate: form.subEndDate || undefined,
            monthlyFee: form.monthlyFee || undefined,
            address: form.address || undefined,
            birthDate: form.birthDate || undefined,
            regGoal: form.regGoal || undefined,
            fatherName: form.fatherName || undefined,
            motherName: form.motherName || undefined,
            guardianPhones: (form.guardianPhones ?? []).filter(
              (p) => p.trim() !== ""
            ),
            shift: form.shift || undefined,
            currency: form.currency || undefined,
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
            <Label htmlFor="student-email">البريد الإلكتروني (اختياري)</Label>
            <Input
              id="student-email"
              type="email"
              dir="ltr"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-phone">رقم الهاتف</Label>
              <PhoneInput
                id="student-phone"
                value={form.phone}
                onChange={(v) => set("phone", v)}
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
              <Label htmlFor="student-birthdate">المواليد</Label>
              <Input
                id="student-birthdate"
                type="date"
                dir="ltr"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-address">السكن الحالي</Label>
              <Input
                id="student-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-reggoal">هدف التسجيل</Label>
            <Input
              id="student-reggoal"
              placeholder="مثال: تحسين المستوى في الرياضيات"
              value={form.regGoal}
              onChange={(e) => set("regGoal", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-father">اسم الأب</Label>
              <Input
                id="student-father"
                value={form.fatherName}
                onChange={(e) => set("fatherName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-mother">اسم الأم</Label>
              <Input
                id="student-mother"
                value={form.motherName}
                onChange={(e) => set("motherName", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>أرقام هواتف ولي الأمر</Label>
            {(form.guardianPhones ?? []).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <PhoneInput
                    value={p}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        guardianPhones: (f.guardianPhones ?? []).map(
                          (item, idx) => (idx === i ? v : item)
                        ),
                      }))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      guardianPhones: (f.guardianPhones ?? []).filter(
                        (_, idx) => idx !== i
                      ),
                    }))
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
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  guardianPhones: [...(f.guardianPhones ?? []), ""],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              إضافة رقم آخر
            </Button>
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
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-monthly-fee">رسم الاشتراك الشهري</Label>
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
            <div className="space-y-2">
              <Label htmlFor="student-shift">الدوام</Label>
              <select
                id="student-shift"
                value={form.shift ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    shift: (e.target.value || undefined) as CreateStudentInput["shift"],
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">غير محدد</option>
                <option value="morning">صباحي</option>
                <option value="evening">مسائي</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-currency">العملة</Label>
              <select
                id="student-currency"
                required
                value={form.currency ?? "SAR"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currency: e.target.value as CreateStudentInput["currency"],
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
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
                        المبلغ المدفوع ({CURRENCY_LABELS[form.currency ?? "SAR"]})
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
                            المتبقي: {form.monthlyFee - Number(paidAmount)}{" "}
                            {CURRENCY_LABELS[form.currency ?? "SAR"]}
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
