"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, CalendarDays, ClipboardCheck, Play, School, Video } from "lucide-react";
import TimetableGrid from "@/components/shared/TimetableGrid";
import ZoomLinkForm from "@/components/forms/ZoomLinkForm";
import AttendanceDialog from "@/components/forms/AttendanceDialog";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useTimetable } from "@/hooks/useTimetable";
import type { SessionDTO, TeacherDTO, TimetableSlotDTO } from "@/types";

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [resolving, setResolving] = useState(true);
  const [classFilter, setClassFilter] = useState("");
  const [todaySessions, setTodaySessions] = useState<SessionDTO[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const { slots, loading, refetch } = useTimetable({
    teacherId: teacher?.id ?? "",
  });

  // إيجاد ملف المعلم المرتبط بالمستخدم الحالي (نفس نمط SessionForm)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/teachers");
        const teachers: TeacherDTO[] = res.ok ? await res.json() : [];
        setTeacher(teachers.find((t) => t.userId === user.id) ?? null);
      } finally {
        setResolving(false);
      }
    })();
  }, [user]);

  // حصص اليوم — /api/sessions مقيّدة بحصص المعلم الحالي
  const refetchTodaySessions = useCallback(async () => {
    if (!teacher) return;
    try {
      const res = await fetch("/api/sessions");
      const all: SessionDTO[] = res.ok ? await res.json() : [];
      const today = new Date().toDateString();
      setTodaySessions(
        all.filter((s) => new Date(s.date).toDateString() === today)
      );
    } catch {
      setTodaySessions([]);
    }
  }, [teacher]);

  useEffect(() => {
    refetchTodaySessions();
  }, [refetchTodaySessions]);

  // بدء حصة اليوم من المرة: تُنشأ بالمادة والصف ورابط زوم تلقائيًا
  async function startSession(slot: TimetableSlotDTO) {
    if (!teacher || slot.class?.order === undefined) return;
    setStarting(slot.id);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          grade: slot.class.order,
          subject: slot.subject,
          date: new Date().toISOString(),
          zoomLink: slot.zoomLink || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في بدء الحصة");
      }
      toast({
        variant: "success",
        title: "بدأت الحصة",
        description: "يمكنك الآن تسجيل الحضور",
      });
      await refetchTodaySessions();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل بدء الحصة",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setStarting(null);
    }
  }

  const todayDow = new Date().getDay();

  // الفلترة بالصف — فارغة تعني كل صفوف المعلم
  const filteredSlots = useMemo(
    () =>
      classFilter ? slots.filter((s) => s.classId === classFilter) : slots,
    [slots, classFilter]
  );

  const stats = useMemo(
    () => ({
      total: filteredSlots.length,
      classes: new Set(filteredSlots.map((s) => s.classId)).size,
      subjects: new Set(filteredSlots.map((s) => s.subject)).size,
      days: new Set(filteredSlots.map((s) => s.dayOfWeek)).size,
    }),
    [filteredSlots]
  );

  if (resolving || (teacher && loading)) {
    return <Loading label="جارٍ تحميل الجدول..." />;
  }
  if (!teacher) {
    return <EmptyState title="لم يتم العثور على ملف المعلم" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="الحصص الأسبوعية"
          value={stats.total}
          icon={CalendarDays}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="الصفوف التي أدرّسها"
          value={stats.classes}
          icon={School}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="المواد في الجدول"
          value={stats.subjects}
          icon={BookOpen}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
        <StatCard
          title="أيام الدوام"
          value={stats.days}
          icon={CalendarCheck}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">جدولي الأسبوعي</h1>
        <select
          aria-label="فلترة بالصف"
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">كل الصفوف</option>
          {teacher.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <TimetableGrid
        slots={filteredSlots}
        renderActions={(slot) => {
          // حصة اليوم المطابقة للمرة (نفس المادة والصف) إن وُجدت
          const todaySession =
            slot.dayOfWeek === todayDow
              ? todaySessions.find(
                  (s) =>
                    s.subject === slot.subject &&
                    s.grade === slot.class?.order
                )
              : undefined;
          return (
            <>
              {slot.dayOfWeek === todayDow &&
                (todaySession ? (
                  <AttendanceDialog
                    session={todaySession}
                    onSuccess={refetchTodaySessions}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="تسجيل الحضور"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 text-emerald-700" />
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="بدء الحصة"
                    disabled={starting === slot.id}
                    onClick={() => startSession(slot)}
                  >
                    <Play className="h-3.5 w-3.5 text-emerald-700" />
                  </Button>
                ))}
              <ZoomLinkForm
                slot={slot}
                onSuccess={refetch}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="رابط زوم"
                  >
                    <Video className="h-3.5 w-3.5 text-sky-700" />
                  </Button>
                }
              />
            </>
          );
        }}
      />
    </div>
  );
}
