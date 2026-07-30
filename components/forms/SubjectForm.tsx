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

export default function SubjectForm({
  trigger,
  subject,
  onSuccess,
}: {
  trigger: React.ReactNode;
  /** عند تمريره يعمل النموذج في وضع التعديل */
  subject?: SubjectDTO;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(subject);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);

  useEffect(() => {
    if (open) {
      setError(null);
      setName(subject?.name ?? "");
      setClassIds(subject?.classes?.map((c) => c.id) ?? []);
      fetch("/api/classes")
        .then((res) => (res.ok ? res.json() : []))
        .then(setClasses)
        .catch(() => setClasses([]));
    }
  }, [open, subject]);

  const toggleClass = (id: string) =>
    setClassIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/subjects/${subject!.id}` : "/api/subjects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, classIds }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ المادة");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: isEdit ? "تم تعديل المادة بنجاح" : "تمت إضافة المادة بنجاح",
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
          <DialogTitle>{isEdit ? "تعديل المادة" : "إضافة مادة جديدة"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">اسم المادة</Label>
            <Input
              id="subject-name"
              required
              placeholder="مثال: رياضيات"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>الصفوف المرتبطة</Label>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : "إضافة المادة"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
