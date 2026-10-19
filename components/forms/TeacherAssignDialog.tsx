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
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import type { ClassLevelDTO, SubjectDTO, TeacherDTO } from "@/types";

export default function TeacherAssignDialog({
  trigger,
  teacher,
  onSuccess,
}: {
  trigger: React.ReactNode;
  teacher: TeacherDTO;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubjectIds(teacher.subjects?.map((s) => s.id) ?? []);
    setClassIds(teacher.classes?.map((c) => c.id) ?? []);
    fetch("/api/subjects")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSubjects)
      .catch(() => setSubjects([]));
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [open, teacher]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (id: string) =>
      setter((ids) =>
        ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
      );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectIds, classIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في ربط المواد والصفوف");
      }
      setOpen(false);
      toast({ variant: "success", title: "تم ربط المواد والصفوف بنجاح" });
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
            ربط المواد والصفوف — {teacher.user?.name ?? ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>المواد</Label>
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
                      onChange={() => toggle(setSubjectIds)(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>الصفوف</Label>
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
                      onChange={() => toggle(setClassIds)(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ الربط"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
