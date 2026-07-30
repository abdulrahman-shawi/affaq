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
import type { ClassLevelDTO, SubjectDTO } from "@/types";

export default function ClassForm({
  trigger,
  classLevel,
  onSuccess,
}: {
  trigger: React.ReactNode;
  /** عند تمريره يعمل النموذج في وضع التعديل */
  classLevel?: ClassLevelDTO;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(classLevel);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(0);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);

  useEffect(() => {
    if (open) {
      setError(null);
      setName(classLevel?.name ?? "");
      setOrder(classLevel?.order ?? 0);
      setSubjectIds(classLevel?.subjects?.map((s) => s.id) ?? []);
      fetch("/api/subjects")
        .then((res) => (res.ok ? res.json() : []))
        .then(setSubjects)
        .catch(() => setSubjects([]));
    }
  }, [open, classLevel]);

  const toggleSubject = (id: string) =>
    setSubjectIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/classes/${classLevel!.id}` : "/api/classes",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, order, subjectIds }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الصف");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل الصف بنجاح" : "تمت إضافة الصف بنجاح",
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
          <DialogTitle>{isEdit ? "تعديل الصف" : "إضافة صف جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">اسم الصف</Label>
              <Input
                id="class-name"
                required
                placeholder="مثال: الصف الأول"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-order">الترتيب</Label>
              <Input
                id="class-order"
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>المواد المرتبطة</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد مواد بعد — أضفها من صفحة المواد
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة الصف"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
