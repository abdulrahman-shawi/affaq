"use client";

import { useEffect, useState } from "react";
import { CalendarSync, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TimetableGrid, { DAY_LABELS } from "@/components/shared/TimetableGrid";
import TimetableSlotForm from "@/components/forms/TimetableSlotForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import Loading from "@/components/shared/Loading";
import { useToast } from "@/components/ui/toaster";
import { useClasses } from "@/hooks/useClasses";
import { useTimetable } from "@/hooks/useTimetable";

const selectClass =
  "flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AdminTimetablePage() {
  const { classes, loading: classesLoading } = useClasses();
  const [classId, setClassId] = useState("");
  const { slots, loading, refetch } = useTimetable({ classId });
  const { toast } = useToast();
  const [genDate, setGenDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/timetable/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: genDate }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في توليد الحصص");
      }
      toast({
        variant: "success",
        title: `تم توليد ${body.created} حصة لأسبوع ${body.weekStart}`,
        description:
          body.skipped > 0 ? `تم تخطي ${body.skipped} حصة موجودة مسبقًا` : undefined,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: e instanceof Error ? e.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setGenerating(false);
    }
  }

  // اختيار أول صف تلقائيًا عند تحميل القائمة
  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في حذف الحصة");
    }
    toast({ variant: "success", title: "تم حذف الحصة من الجدول" });
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className={selectClass}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          disabled={classesLoading}
        >
          {classes.length === 0 && <option value="">لا توجد صفوف</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {classId && (
          <TimetableSlotForm
            classId={classId}
            onSuccess={refetch}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                إضافة حصة
              </Button>
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <span className="text-sm font-medium">
          توليد حصص فعلية من الجدول (للحضور وروابط Zoom):
        </span>
        <Input
          type="date"
          dir="ltr"
          className="w-auto"
          value={genDate}
          onChange={(e) => setGenDate(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={!genDate || generating}
          onClick={handleGenerate}
        >
          <CalendarSync className="h-4 w-4" />
          {generating ? "جارٍ التوليد..." : "توليد حصص الأسبوع"}
        </Button>
        <span className="text-xs text-muted-foreground">
          اختر أي يوم داخل الأسبوع المطلوب — الحصص الموجودة مسبقًا تُتخطّى
          تلقائيًا
        </span>
      </div>

      {classId && loading ? (
        <Loading label="جارٍ تحميل الجدول..." />
      ) : (
        <TimetableGrid
          slots={slots}
          renderActions={(slot) => (
            <>
              <TimetableSlotForm
                slot={slot}
                classId={classId}
                onSuccess={refetch}
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <ConfirmDialog
                title="حذف الحصة"
                description={`سيتم حذف حصة ${slot.subject} يوم ${DAY_LABELS[slot.dayOfWeek]} من الجدول.`}
                confirmLabel="حذف"
                onConfirm={() => handleDelete(slot.id)}
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                }
              />
            </>
          )}
        />
      )}
    </div>
  );
}
