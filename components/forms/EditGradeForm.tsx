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
import type { GradeDTO } from "@/types";

/**
 * نافذة تعديل درجة محفوظة (الدرجة/الدرجة العظمى/الملاحظة) عبر PATCH /api/grades
 * — للتصحيح بعد الحفظ. درجات التسليمات ترفضها الـ API وتُعدّل من صفحة
 * التسليمات كي تبقى متزامنة مع درجة التسليم نفسه.
 */
export default function EditGradeForm({
  grade,
  trigger,
  onSuccess,
}: {
  grade: GradeDTO;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(String(grade.score));
  const [maxScore, setMaxScore] = useState(String(grade.maxScore));
  const [note, setNote] = useState(grade.note ?? "");

  // إعادة تعبئة الحقول عند كل فتح — قد تكون الدرجة تغيّرت منذ آخر عرض
  useEffect(() => {
    if (!open) return;
    setScore(String(grade.score));
    setMaxScore(String(grade.maxScore));
    setNote(grade.note ?? "");
    setError(null);
  }, [open, grade]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/grades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: grade.id,
          score: Number(score),
          maxScore: Number(maxScore),
          note,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في تعديل الدرجة");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            تعديل درجة — {grade.student?.user?.name ?? "—"} ({grade.subject})
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-grade-score">الدرجة</Label>
              <Input
                id="edit-grade-score"
                type="number"
                min={0}
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-grade-max">الدرجة العظمى</Label>
              <Input
                id="edit-grade-max"
                type="number"
                min={1}
                required
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-grade-note">ملاحظة</Label>
            <Input
              id="edit-grade-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ التعديل"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
