"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  XCircle,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import Loading from "@/components/shared/Loading";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClassNames, formatGrade } from "@/hooks/useClassNames";
import { downloadXlsx } from "@/app/lib/exportXlsx";
import { cn } from "@/app/lib/utils";
import type { AttendanceDTO } from "@/types";

// أيام دوام الأكاديمية — من الأحد إلى الخميس كجدول الحضور الورقي
const WEEK_DAYS = [
  { label: "الأحد", offset: 0 },
  { label: "الاثنين", offset: 1 },
  { label: "الثلاثاء", offset: 2 },
  { label: "الأربعاء", offset: 3 },
  { label: "الخميس", offset: 4 },
];

// علامة كل حالة — كما تُدوَّن في الجدول الورقي: ح، غ، م
const MARKS: Record<
  string,
  { mark: string; label: string; className: string }
> = {
  present: {
    mark: "ح",
    label: "حاضر",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  absent: {
    mark: "غ",
    label: "غائب",
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
  late: {
    mark: "م",
    label: "متأخر",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  },
};

const UNKNOWN_MARK = {
  mark: "؟",
  label: "حالة غير معروفة",
  className: "bg-muted text-muted-foreground",
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // بداية الأسبوع = الأحد
  return d;
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const dayNumFmt = new Intl.DateTimeFormat("ar", { day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("ar", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4);
  const startPart = new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "long",
  }).format(weekStart);
  const endPart = new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(end);
  return `${startPart} — ${endPart}`;
}

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface StudentRow {
  student: AttendanceDTO["student"];
  cells: Map<string, AttendanceDTO>; // مفتاح اليوم → أول جلسة حضور فيه
}

// جدول الحضور الأسبوعي: صف لكل طالب وعمود لكل يوم دوام،
// وعلامة اليوم تُؤخذ من أول جلسة حضور للطالب فيه (كالجدول الورقي)
export default function WeeklyAttendanceGrid({
  attendance,
  loading,
}: {
  attendance: AttendanceDTO[];
  loading?: boolean;
}) {
  const classNames = useClassNames();
  const [weekOffset, setWeekOffset] = useState(0);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const days = useMemo(
    () =>
      WEEK_DAYS.map(({ label, offset }) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + offset);
        return { label, date, key: dayKey(date) };
      }),
    [weekStart]
  );

  const todayKey = dayKey(new Date());

  // قيم الفلاتر تُشتق من البيانات نفسها
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

  // بناء الشبكة: لكل طالب أول جلسة حضور لكل يوم من أيام الأسبوع المحدد
  const { rows, counts, firstSessions } = useMemo(() => {
    const weekKeys = new Set(days.map((d) => d.key));
    const filtered = attendance.filter(
      (a) =>
        a.session &&
        (gradeFilter === "all" || a.session.grade === Number(gradeFilter)) &&
        (subjectFilter === "all" || a.session.subject === subjectFilter)
    );

    const byStudent = new Map<string, StudentRow>();
    for (const record of filtered) {
      const sessionDate = new Date(record.session!.date);
      const key = dayKey(sessionDate);
      if (!weekKeys.has(key)) continue;

      let entry = byStudent.get(record.studentId);
      if (!entry) {
        entry = { student: record.student, cells: new Map() };
        byStudent.set(record.studentId, entry);
      }
      // علامة اليوم من أول جلسة — إن تعددت حصصه في اليوم نفسه
      const existing = entry.cells.get(key);
      if (
        !existing ||
        sessionDate.getTime() < new Date(existing.session!.date).getTime()
      ) {
        entry.cells.set(key, record);
      }
    }

    const rows = Array.from(byStudent.values()).sort((a, b) =>
      (a.student?.user?.name ?? "").localeCompare(
        b.student?.user?.name ?? "",
        "ar"
      )
    );

    const counts: Record<string, number> = {
      present: 0,
      absent: 0,
      late: 0,
    };
    rows.forEach((row) => {
      row.cells.forEach((record) => {
        counts[record.status] = (counts[record.status] ?? 0) + 1;
      });
    });

    // أول جلسة في كل يوم (مادتها ومعلمها) — تُعرض في سطر الجلسات أسفل الجدول
    const firstSessions = new Map<string, AttendanceDTO>();
    rows.forEach((row) => {
      row.cells.forEach((record, key) => {
        const existing = firstSessions.get(key);
        if (
          !existing ||
          new Date(record.session!.date).getTime() <
            new Date(existing.session!.date).getTime()
        ) {
          firstSessions.set(key, record);
        }
      });
    });

    return { rows, counts, firstSessions };
  }, [attendance, days, gradeFilter, subjectFilter]);

  // إظهار عمود الصف ضمن الاسم فقط عند امتزاج أكثر من صف في العرض
  const showGrade = grades.length > 1;

  if (loading) return <Loading />;
  if (attendance.length === 0)
    return <EmptyState title="لا توجد سجلات حضور" />;

  const exportGrid = () => {
    downloadXlsx(
      `حضور ${formatWeekRange(weekStart)}.xlsx`,
      [
        "ت",
        "الطالب",
        ...days.map((d) => `${d.label} (${dayNumFmt.format(d.date)})`),
      ],
      rows.map((row, i) => [
        i + 1,
        row.student?.user?.name ?? "—",
        ...days.map(
          (d) => MARKS[row.cells.get(d.key)?.status ?? ""]?.mark ?? ""
        ),
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حاضر"
          value={counts.present}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
          description={formatWeekRange(weekStart)}
        />
        <StatCard
          title="غائب"
          value={counts.absent}
          icon={XCircle}
          iconClassName="text-red-600"
          iconBgClassName="bg-red-500/10"
          description={formatWeekRange(weekStart)}
        />
        <StatCard
          title="متأخر"
          value={counts.late}
          icon={Clock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
          description={formatWeekRange(weekStart)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="الأسبوع السابق"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="الأسبوع التالي"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              العودة للحالي
            </Button>
          )}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          أسبوع: {formatWeekRange(weekStart)}
        </p>
        <div className="ms-auto flex flex-wrap items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={exportGrid}>
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="لا يوجد حضور مسجّل هذا الأسبوع"
          message="جرّب أسبوعًا آخر أو غيّر الفلاتر"
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">ت</TableHead>
                <TableHead>الطالب</TableHead>
                {days.map((d) => (
                  <TableHead
                    key={d.key}
                    className={cn(
                      "text-center",
                      d.key === todayKey && "bg-blue-50 dark:bg-blue-500/10"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span>{d.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {dayNumFmt.format(d.date)}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.student?.id ?? i}>
                  <TableCell className="text-center text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {row.student?.user?.name ?? "—"}
                    </p>
                    {showGrade &&
                      row.cells.size > 0 &&
                      (() => {
                        const first = row.cells.values().next().value;
                        const grade = first?.session?.grade;
                        return grade !== undefined && grade !== null ? (
                          <p className="text-xs text-muted-foreground">
                            {formatGrade(grade, classNames)}
                          </p>
                        ) : null;
                      })()}
                  </TableCell>
                  {days.map((d) => {
                    const record = row.cells.get(d.key);
                    if (!record) {
                      return (
                        <TableCell
                          key={d.key}
                          className={cn(
                            "text-center",
                            d.key === todayKey &&
                              "bg-blue-50/50 dark:bg-blue-500/5"
                          )}
                        >
                          <span className="text-muted-foreground/40">—</span>
                        </TableCell>
                      );
                    }
                    const info = MARKS[record.status] ?? {
                      ...UNKNOWN_MARK,
                      label: record.status,
                    };
                    return (
                      <TableCell
                        key={d.key}
                        className={cn(
                          "text-center",
                          d.key === todayKey && "bg-blue-50/50 dark:bg-blue-500/5"
                        )}
                      >
                        <span
                          title={`${info.label} — ${record.session?.subject ?? ""} · ${timeFmt.format(new Date(record.session!.date))}`}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                            info.className
                          )}
                        >
                          {info.mark}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {/* الجلسة الأولى المُحتسبة منها علامة كل يوم — كسطر المواد أسفل الجدول الورقي */}
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={2} className="font-medium">
                  الجلسة الأولى
                </TableCell>
                {days.map((d) => {
                  const record = firstSessions.get(d.key);
                  return (
                    <TableCell key={d.key} className="text-center">
                      {record ? (
                        <div className="flex flex-col items-center text-[11px] leading-tight">
                          <span className="font-medium">
                            {record.session?.subject}
                          </span>
                          <span className="text-muted-foreground">
                            {record.session?.teacher?.user?.name ?? ""}
                          </span>
                          <span className="text-muted-foreground/70">
                            {timeFmt.format(new Date(record.session!.date))}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          ح = حاضر · غ = غائب · م = متأخر — علامة كل يوم تُحتسب من أول جلسة
          حضور للطالب فيه، ومرّر على العلامة لعرض المادة والوقت.
        </p>
      </div>
    </div>
  );
}
