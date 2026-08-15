"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { DAY_LABELS } from "@/components/shared/TimetableGrid";
import type { SubjectDTO, TeacherDTO, TimetableSlotDTO } from "@/types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const SCHOOL_DAYS = [0, 1, 2, 3, 4];

const emptyForm = {
  teacherId: "",
  subject: "",
  dayOfWeek: "",
  startTime: "",
  endTime: "",
};

export default function TimetableSlotForm({
  slot,
  classId,
  fixedTeacherId,
  onSuccess,
  trigger,
}: {
  /** تمرير حصة يفعّل وضع التعديل، وبدونه يكون إنشاء */
  slot?: TimetableSlotDTO;
  /** الصف الذي تُضاف إليه الحصة (إلزامي في وضع الإنشاء) */
  classId: string;
  /** تثبيت المعلم (للمعلم نفسه) — يُخفى حقل اختيار المعلم */
  fixedTeacherId?: string;
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const isEdit = Boolean(slot);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      slot
        ? {
            teacherId: slot.teacherId,
            subject: slot.subject,
            dayOfWeek: String(slot.dayOfWeek),
            startTime: slot.startTime,
            endTime: slot.endTime,
          }
        : { ...emptyForm, teacherId: fixedTeacherId ?? "" }
    );
    (async () => {
      try {
        const [teachersRes, subjectsRes] = await Promise.all([
          fetch("/api/teachers"),
          fetch("/api/subjects"),
        ]);
        setTeachers(teachersRes.ok ? await teachersRes.json() : []);
        setSubjects(subjectsRes.ok ? await subjectsRes.json() : []);
      } catch {
        setTeachers([]);
        setSubjects([]);
      }
    })();
  }, [open, slot, fixedTeacherId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/timetable/${slot!.id}` : "/api/timetable",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isEdit ? {} : { classId }),
            teacherId: form.teacherId,
            subject: form.subject,
            dayOfWeek: Number(form.dayOfWeek),
            startTime: form.startTime,
            endTime: form.endTime,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الحصة");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل الحصة بنجاح" : "تمت إضافة الحصة للجدول",
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
            {isEdit ? "تعديل الحصة" : "إضافة حصة للجدول"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedTeacherId && (
            <div className="space-y-2">
              <Label htmlFor="slot-teacher">المعلم</Label>
              <select
                id="slot-teacher"
                required
                className={selectClass}
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">اختر المعلم</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user?.name ?? t.id}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot-subject">المادة</Label>
              <select
                id="slot-subject"
                required
                className={selectClass}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">اختر المادة</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-day">اليوم</Label>
              <select
                id="slot-day"
                required
                className={selectClass}
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              >
                <option value="">اختر اليوم</option>
                {SCHOOL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot-start">من</Label>
              <Input
                id="slot-start"
                type="time"
                required
                dir="ltr"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end">إلى</Label>
              <Input
                id="slot-end"
                type="time"
                required
                dir="ltr"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة الحصة"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
