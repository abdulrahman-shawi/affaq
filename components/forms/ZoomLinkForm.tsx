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
import type { TimetableSlotDTO } from "@/types";

/** نموذج مبسّط للمعلم: إضافة/تعديل رابط زوم لحصة فقط دون تعديل باقي بياناتها */
export default function ZoomLinkForm({
  trigger,
  slot,
  onSuccess,
}: {
  trigger: React.ReactNode;
  slot: TimetableSlotDTO;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (open) {
      setError(null);
      setLink(slot.zoomLink ?? "");
    }
  }, [open, slot.zoomLink]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/timetable/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomLink: link.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الرابط");
      }
      setOpen(false);
      toast({ variant: "success", title: "تم حفظ رابط زوم" });
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
          <DialogTitle>رابط زوم — {slot.subject}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zoom-link">رابط زوم</Label>
            <Input
              id="zoom-link"
              type="url"
              dir="ltr"
              placeholder="https://zoom.us/j/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              يُحذف الرابط تلقائيًا بعد نصف ساعة من بداية الحصة — اتركه فارغًا
              لمسحه
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ الرابط"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
