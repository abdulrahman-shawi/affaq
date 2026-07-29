"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import DataTable, { type Column } from "@/components/tables/DataTable";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/app/lib/utils";
import type { SessionDTO, TeacherDTO } from "@/types";

const columns: Column<SessionDTO>[] = [
  { header: "المادة", cell: (s) => s.subject },
  { header: "الصف", cell: (s) => `الصف ${s.grade}` },
  { header: "المعلم", cell: (s) => s.teacher?.user?.name ?? "—" },
  { header: "التاريخ", cell: (s) => formatDate(s.date) },
];

export default function TeacherSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", grade: 1, date: "" });

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      setSessions(res.ok ? await res.json() : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const teachersRes = await fetch("/api/teachers");
      const teachers: TeacherDTO[] = teachersRes.ok ? await teachersRes.json() : [];
      const me = teachers.find((t) => t.userId === user?.id);
      if (!me) throw new Error("لم يتم العثور على ملف المعلم");

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teacherId: me.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إنشاء الحصة");
      }
      setOpen(false);
      setForm({ subject: "", grade: 1, date: "" });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              إنشاء حصة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء حصة جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-subject">المادة</Label>
                <Input
                  id="session-subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-grade">الصف</Label>
                  <Input
                    id="session-grade"
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-date">التاريخ</Label>
                  <Input
                    id="session-date"
                    type="date"
                    required
                    dir="ltr"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جارٍ الحفظ..." : "إنشاء الحصة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        emptyTitle="لا توجد حصص"
        emptyMessage="ابدأ بإنشاء أول حصة"
      />
    </div>
  );
}
