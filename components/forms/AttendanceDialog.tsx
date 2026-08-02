"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import Loading from "@/components/shared/Loading";
import { formatDate } from "@/app/lib/utils";
import type {
  AttendanceDTO,
  ClassLevelDTO,
  SessionDTO,
  StudentDTO,
} from "@/types";

const statuses = [
  {
    value: "present",
    label: "حاضر",
    icon: CheckCircle2,
    activeClass: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "absent",
    label: "غائب",
    icon: XCircle,
    activeClass: "bg-red-600 text-white border-red-600",
  },
  {
    value: "late",
    label: "متأخر",
    icon: Clock,
    activeClass: "bg-amber-600 text-white border-amber-600",
  },
];

export default function AttendanceDialog({
  session,
  onSuccess,
  trigger,
}: {
  session: SessionDTO;
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});

  // عند الفتح: نجلب طلاب صف الحصة وأي حضور مسجل مسبقًا لنفس الحصة
  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const [classesRes, studentsRes, attendanceRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/students"),
          fetch(`/api/attendance?sessionId=${session.id}`),
        ]);
        const classes: ClassLevelDTO[] = classesRes.ok
          ? await classesRes.json()
          : [];
        // grade في الحصة يطابق order في الصف الدراسي
        const cls = classes.find((c) => c.order === session.grade);
        const all: StudentDTO[] = studentsRes.ok ? await studentsRes.json() : [];
        const classStudents = cls
          ? all.filter((s) => s.classId === cls.id)
          : [];
        setStudents(classStudents);

        const existing: AttendanceDTO[] = attendanceRes.ok
          ? await attendanceRes.json()
          : [];
        const existingMap = Object.fromEntries(
          existing.map((a) => [a.studentId, a.status])
        );
        setMarks(
          Object.fromEntries(
            classStudents.map((s) => [s.id, existingMap[s.id] ?? "present"])
          )
        );
      } catch {
        setStudents([]);
        setMarks({});
        setError("فشل في تحميل طلاب الصف");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, session]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          records: students.map((s) => ({
            studentId: s.id,
            status: marks[s.id] ?? "present",
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في تسجيل الحضور");
      }
      setOpen(false);
      toast({ variant: "success", title: "تم تسجيل الحضور بنجاح" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            تسجيل الحضور — {session.subject} ({formatDate(session.date)})
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loading />
        ) : students.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            لا يوجد طلاب مسجلون في صف هذه الحصة
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pl-1">
            {students.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {s.user?.name ?? "—"}
                </span>
                <div className="flex gap-1">
                  {statuses.map((st) => {
                    const active = (marks[s.id] ?? "present") === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() =>
                          setMarks((m) => ({ ...m, [s.id]: st.value }))
                        }
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                          active
                            ? st.activeClass
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <st.icon className="h-3.5 w-3.5" />
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {students.length > 0 && (
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الحضور"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
