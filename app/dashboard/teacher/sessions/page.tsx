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
import type {
  ClassLevelDTO,
  SessionDTO,
  SubjectDTO,
  TeacherDTO,
} from "@/types";

const columns: Column<SessionDTO>[] = [
  { header: "المادة", cell: (s) => s.subject },
  { header: "الصف", cell: (s) => `الصف ${s.grade}` },
  { header: "المعلم", cell: (s) => s.teacher?.user?.name ?? "—" },
  { header: "التاريخ", cell: (s) => formatDate(s.date) },
];

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  order: number;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function TeacherSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState({ subject: "", classOrder: "", date: "" });

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

  // عند فتح النموذج: نجلب ملف المعلم وقوائم المواد والصفوف من قاعدة البيانات
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      try {
        const teachersRes = await fetch("/api/teachers");
        const teachers: TeacherDTO[] = teachersRes.ok
          ? await teachersRes.json()
          : [];
        const me = teachers.find((t) => t.userId === user.id) ?? null;
        setTeacher(me);

        let subjectOptions: SubjectOption[] = me?.subjects ?? [];
        let classOptions: ClassOption[] = me?.classes ?? [];

        // إن لم تُسند للمعلم مواد أو صفوف بعد، نعرض القوائم الكاملة
        if (subjectOptions.length === 0 || classOptions.length === 0) {
          const [subjectsRes, classesRes] = await Promise.all([
            fetch("/api/subjects"),
            fetch("/api/classes"),
          ]);
          if (subjectOptions.length === 0 && subjectsRes.ok) {
            subjectOptions = (await subjectsRes.json()).map(
              (s: SubjectDTO) => ({ id: s.id, name: s.name })
            );
          }
          if (classOptions.length === 0 && classesRes.ok) {
            classOptions = (await classesRes.json()).map(
              (c: ClassLevelDTO) => ({ id: c.id, name: c.name, order: c.order })
            );
          }
        }

        setSubjects(subjectOptions);
        setClasses(classOptions);
      } catch {
        setSubjects([]);
        setClasses([]);
      }
    })();
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) {
      setError("لم يتم العثور على ملف المعلم");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          subject: form.subject,
          grade: Number(form.classOrder),
          date: form.date,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إنشاء الحصة");
      }
      setOpen(false);
      setForm({ subject: "", classOrder: "", date: "" });
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
                <select
                  id="session-subject"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-class">الصف</Label>
                  <select
                    id="session-class"
                    required
                    className={selectClass}
                    value={form.classOrder}
                    onChange={(e) =>
                      setForm({ ...form, classOrder: e.target.value })
                    }
                  >
                    <option value="">اختر الصف</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.order}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
              {subjects.length === 0 && classes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  لا توجد مواد أو صفوف في النظام بعد — تواصل مع الإدارة لإضافتها.
                </p>
              )}
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
