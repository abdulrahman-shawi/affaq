"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Pencil, Plus, Trash2, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import StudentForm from "@/components/forms/StudentForm";
import AssignParentDialog from "@/components/forms/AssignParentDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatCard from "@/components/shared/StatCard";
import { useStudents } from "@/hooks/useStudents";
import { formatDate } from "@/app/lib/utils";
import type { StudentDTO } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  expired: "منتهي",
  suspended: "موقوف",
};

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AdminStudentsPage() {
  const { students, loading, refetch } = useStudents();
  const { toast } = useToast();
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const classNames = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.class?.name).filter(Boolean))
      ) as string[],
    [students]
  );

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          (classFilter === "all" || s.class?.name === classFilter) &&
          (statusFilter === "all" || s.status === statusFilter)
      ),
    [students, classFilter, statusFilter]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      total: students.length,
      active: students.filter((s) => s.status === "active").length,
      expiringSoon: students.filter((s) => {
        if (!s.subEndDate) return false;
        const end = new Date(s.subEndDate);
        return end >= now && end <= in30Days;
      }).length,
      withoutClass: students.filter((s) => !s.classId).length,
    };
  }, [students]);

  async function handleDelete(student: StudentDTO) {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حذف الطالب");
      }
      toast({ variant: "success", title: "تم حذف الطالب بنجاح" });
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
          title="إجمالي الطلاب"
          value={stats.total}
          icon={Users}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="الطلاب النشطون"
          value={stats.active}
          icon={UserCheck}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="اشتراكات تنتهي قريبًا"
          value={stats.expiringSoon}
          icon={CalendarClock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
          description="خلال 30 يومًا القادمة"
        />
        <StatCard
          title="بدون صف"
          value={stats.withoutClass}
          icon={UserX}
          iconClassName="text-rose-600"
          iconBgClassName="bg-rose-500/10"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClassName}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">كل الصفوف</option>
            {classNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className={selectClassName}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <StudentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة طالب
            </Button>
          }
        />
      </div>

      <DataTable
        columns={studentColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا يوجد طلاب"
        emptyMessage="ابدأ بإضافة أول طالب"
        csv={{
          filename: "الطلاب.csv",
          headers: [
            "الاسم",
            "البريد",
            "الجوال",
            "الصف",
            "الحالة",
            "نهاية الاشتراك",
            "ولي الأمر",
          ],
          row: (s) => [
            s.user?.name,
            s.user?.email,
            s.user?.phone,
            s.class?.name ?? "بدون صف",
            STATUS_LABELS[s.status] ?? s.status,
            formatDate(s.subEndDate),
            s.parent?.user?.name,
          ],
        }}
        searchValue={(s) =>
          [s.user?.name, s.user?.email, s.user?.phone, s.parent?.user?.name]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="ابحث بالاسم أو البريد أو ولي الأمر..."
        selectable
        bulkActions={(selected, clear) => (
          <AssignParentDialog
            studentIds={selected.map((s) => s.id)}
            onSuccess={() => {
              clear();
              refetch();
            }}
            trigger={
              <Button size="sm">
                <UserPlus className="h-4 w-4" />
                تعيين ولي أمر
              </Button>
            }
          />
        )}
        actions={(s) => (
          <>
            <AssignParentDialog
              studentIds={[s.id]}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعيين ولي أمر">
                  <UserPlus className="h-4 w-4" />
                </Button>
              }
            />
            <StudentForm
              student={s}
              onSuccess={refetch}
              trigger={
                <Button size="icon" variant="outline" title="تعديل">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDialog
              title="حذف الطالب"
              description={`هل أنت متأكد من حذف "${s.user?.name ?? ""}"؟ سيتم حذف جميع بياناته (مدفوعات، حضور، درجات) ولا يمكن التراجع.`}
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
