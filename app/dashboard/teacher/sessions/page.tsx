"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarClock, CalendarDays, ClipboardCheck, ExternalLink, Pencil, Plus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable, { type Column } from "@/components/tables/DataTable";
import SessionForm from "@/components/forms/SessionForm";
import AttendanceDialog from "@/components/forms/AttendanceDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { formatDate } from "@/app/lib/utils";
import type { SessionDTO } from "@/types";

const columns: Column<SessionDTO>[] = [
  { header: "المادة", cell: (s) => s.subject },
  { header: "الصف", cell: (s) => `الصف ${s.grade}` },
  { header: "المعلم", cell: (s) => s.teacher?.user?.name ?? "—" },
  { header: "التاريخ", cell: (s) => formatDate(s.date) },
  {
    header: "Zoom",
    cell: (s) =>
      s.zoomLink ? (
        <a
          href={s.zoomLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          حضور الجلسة
        </a>
      ) : (
        "—"
      ),
  },
];

export default function TeacherSessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    return {
      total: sessions.length,
      today: sessions.filter(
        (s) => new Date(s.date).toDateString() === today
      ).length,
      upcoming: sessions.filter((s) => new Date(s.date) > now).length,
      withZoom: sessions.filter((s) => s.zoomLink).length,
    };
  }, [sessions]);

  async function handleDelete(session: SessionDTO) {
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف الحصة");
      }
      toast({ variant: "success", title: "تم حذف الحصة بنجاح" });
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل الحذف",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الحصص"
          value={stats.total}
          icon={BookOpen}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="حصص اليوم"
          value={stats.today}
          icon={CalendarDays}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="حصص قادمة"
          value={stats.upcoming}
          icon={CalendarClock}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
        />
        <StatCard
          title="حصص برابط Zoom"
          value={stats.withZoom}
          icon={Video}
          iconClassName="text-sky-600"
          iconBgClassName="bg-sky-500/10"
        />
      </div>

      <div className="flex justify-end">
        <SessionForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إنشاء حصة
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        emptyTitle="لا توجد حصص"
        emptyMessage="ابدأ بإنشاء أول حصة"
        actions={(s) => (
          <>
            <AttendanceDialog
              session={s}
              trigger={
                <Button size="icon" variant="outline" title="تسجيل الحضور">
                  <ClipboardCheck className="h-4 w-4" />
                </Button>
              }
            />
            <SessionForm
              session={s}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف الحصة"
              description={`هل أنت متأكد من حذف حصة "${s.subject}" بتاريخ ${formatDate(s.date)}؟ سيتم حذف سجلات حضورها ولا يمكن التراجع.`}
              confirmLabel="حذف"
              onConfirm={() => handleDelete(s)}
              trigger={
                <Button size="icon" variant="destructive" title="حذف">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </>
        )}
      />
    </div>
  );
}
