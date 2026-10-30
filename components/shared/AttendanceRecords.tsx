"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { attendanceColumns } from "@/components/tables/Columns";
import { useClassNames, formatGrade } from "@/hooks/useClassNames";
import { formatDate } from "@/app/lib/utils";
import type { AttendanceDTO } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

const statusFilters = [
  { value: "all", label: "الكل" },
  { value: "present", label: "حاضر" },
  { value: "absent", label: "غائب" },
  { value: "late", label: "متأخر" },
];

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// سجلات حضور مع فلاتر: الحالة + الصف + المادة — تُستخدم في لوحة الأدمن والمعلم
export default function AttendanceRecords({
  attendance,
  loading,
}: {
  attendance: AttendanceDTO[];
  loading?: boolean;
}) {
  const classNames = useClassNames();
  const [status, setStatus] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // قيم الفلاتر تُشتق من البيانات نفسها — لا تظهر إلا الصفوف والمواد الموجودة فعلًا
  const grades = useMemo(
    () =>
      Array.from(
        new Set(
          attendance
            .map((a) => a.session?.grade)
            .filter((g): g is number => g !== undefined && g !== null)
        )
      ).sort((x, y) => x - y),
    [attendance]
  );

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(attendance.map((a) => a.session?.subject).filter(Boolean))
      ) as string[],
    [attendance]
  );

  const filtered = useMemo(
    () =>
      attendance.filter(
        (a) =>
          (status === "all" || a.status === status) &&
          (gradeFilter === "all" || a.session?.grade === Number(gradeFilter)) &&
          (subjectFilter === "all" || a.session?.subject === subjectFilter)
      ),
    [attendance, status, gradeFilter, subjectFilter]
  );

  const count = (s: string) => attendance.filter((a) => a.status === s).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حاضر"
          value={count("present")}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="غائب"
          value={count("absent")}
          icon={XCircle}
          iconClassName="text-red-600"
          iconBgClassName="bg-red-500/10"
        />
        <StatCard
          title="متأخر"
          value={count("late")}
          icon={Clock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                status === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex flex-wrap gap-2">
          <select
            className={selectClassName}
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="فلترة حسب الصف"
          >
            <option value="all">كل الصفوف</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {formatGrade(g, classNames)}
              </option>
            ))}
          </select>
          <select
            className={selectClassName}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="فلترة حسب المادة"
          >
            <option value="all">كل المواد</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={attendanceColumns({ classNames })}
        data={filtered}
        loading={loading}
        emptyTitle="لا توجد سجلات حضور"
        searchValue={(a) =>
          [
            a.student?.user?.name,
            a.session?.subject,
            a.session?.grade !== undefined && a.session?.grade !== null
              ? formatGrade(a.session.grade, classNames)
              : null,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="ابحث باسم الطالب أو المادة..."
        csv={{
          filename: "الحضور.xlsx",
          headers: ["التاريخ", "الطالب", "الصف", "المادة", "الحالة", "ملاحظة"],
          row: (a) => [
            formatDate(a.session?.date),
            a.student?.user?.name,
            a.session?.grade !== undefined && a.session?.grade !== null
              ? formatGrade(a.session.grade, classNames)
              : null,
            a.session?.subject,
            STATUS_LABELS[a.status] ?? a.status,
            a.note,
          ],
        }}
      />
    </div>
  );
}
