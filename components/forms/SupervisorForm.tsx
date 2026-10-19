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
import type { ClassLevelDTO, CreateSupervisorInput, SupervisorDTO, TeacherDTO } from "@/types";

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
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  // معرّف الصف → معرّفات المعلمات المعيّنات له
  const [teacherAssignments, setTeacherAssignments] = useState<
    Record<string, string[]>
  >({});

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
    setClassIds(supervisor?.classes?.map((c) => c.id) ?? []);
    // تجميع التعيينات الحالية حسب الصف
    const grouped: Record<string, string[]> = {};
    for (const a of supervisor?.teacherAssignments ?? []) {
      (grouped[a.classId] ??= []).push(a.teacherId);
    }
    setTeacherAssignments(grouped);
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setClasses)
      .catch(() => setClasses([]));
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, [open, supervisor]);

  function toggleClass(id: string) {
    setClassIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
    // إلغاء تحديد الصف يسقط تعييناته
    setTeacherAssignments((map) => {
      if (!(id in map)) return map;
      const next = { ...map };
      delete next[id];
      return next;
    });
  }

  function toggleTeacherAssignment(classId: string, teacherId: string) {
    setTeacherAssignments((map) => {
      const ids = map[classId] ?? [];
      return {
        ...map,
        [classId]: ids.includes(teacherId)
          ? ids.filter((i) => i !== teacherId)
          : [...ids, teacherId],
      };
    });
  }

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
            classIds,
            teacherAssignments: Object.entries(teacherAssignments).flatMap(
              ([classId, ids]) => ids.map((teacherId) => ({ classId, teacherId }))
            ),
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
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
          <div className="space-y-2">
            <Label>الصفوف التي يشرف عليها</Label>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد صفوف بعد — أضفها من صفحة الصفوف
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {classes.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={classIds.includes(c.id)}
                      onChange={() => toggleClass(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {classIds.length > 0 && (
            <div className="space-y-2">
              <Label>تعيين معلمات محددات (اختياري)</Label>
              <p className="text-sm text-muted-foreground">
                إن لم تختر معلمات لصف ما، يشرف المشرف على كل معلمات ذلك الصف
              </p>
              {classes
                .filter((c) => classIds.includes(c.id))
                .map((c) => {
                  const classTeachers = teachers.filter((t) =>
                    t.classes.some((tc) => tc.id === c.id)
                  );
                  return (
                    <div key={c.id} className="space-y-2">
                      <p className="text-sm font-medium">{c.name}</p>
                      {classTeachers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          لا توجد معلمات لهذا الصف
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {classTeachers.map((t) => (
                            <label
                              key={t.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                            >
                              <input
                                type="checkbox"
                                checked={(
                                  teacherAssignments[c.id] ?? []
                                ).includes(t.id)}
                                onChange={() =>
                                  toggleTeacherAssignment(c.id, t.id)
                                }
                              />
                              {t.user?.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة المشرف"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
