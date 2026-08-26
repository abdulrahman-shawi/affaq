"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { attendanceColumns } from "@/components/tables/Columns";
import { useAttendance } from "@/hooks/useAttendance";
import { formatDate } from "@/app/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

const filters = [
  { value: "all", label: "الكل" },
  { value: "present", label: "حاضر" },
  { value: "absent", label: "غائب" },
  { value: "late", label: "متأخر" },
];

export default function AdminAttendancePage() {
  const { attendance, loading } = useAttendance();
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      status === "all"
        ? attendance
        : attendance.filter((a) => a.status === status),
    [attendance, status]
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

      <div className="flex gap-2">
        {filters.map((f) => (
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

      <DataTable
        columns={attendanceColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا توجد سجلات حضور"
        searchValue={(a) =>
          [a.student?.user?.name, a.session?.subject]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="ابحث باسم الطالب أو المادة..."
        csv={{
          filename: "الحضور.csv",
          headers: ["التاريخ", "الطالب", "المادة", "الحالة", "ملاحظة"],
          row: (a) => [
            formatDate(a.session?.date),
            a.student?.user?.name,
            a.session?.subject,
            STATUS_LABELS[a.status] ?? a.status,
            a.note,
          ],
        }}
      />
    </div>
  );
}
