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
import type { ParentDTO } from "@/types";

export default function AssignParentDialog({
  trigger,
  studentIds,
  onSuccess,
}: {
  trigger: React.ReactNode;
  studentIds: string[];
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parents, setParents] = useState<ParentDTO[]>([]);
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setParentId("");
    fetch("/api/parents")
      .then((res) => (res.ok ? res.json() : []))
      .then(setParents)
      .catch(() => setParents([]));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId) {
      setError("اختر ولي الأمر أولًا");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/students/assign-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds, parentId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في تعيين ولي الأمر");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: "تم تعيين ولي الأمر بنجاح",
        description:
          studentIds.length > 1 ? `${studentIds.length} طلاب` : undefined,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {studentIds.length > 1
              ? `تعيين ولي أمر لـ ${studentIds.length} طلاب`
              : "تعيين ولي الأمر"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-parent">ولي الأمر</Label>
            <select
              id="assign-parent"
              required
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                اختر ولي الأمر...
              </option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user?.name ?? "—"} ({p.user?.email ?? "—"})
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "تعيين"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
