import type { Column } from "./DataTable";
import { Badge } from "@/components/ui/badge";
import StudentPaymentsDialog from "@/components/shared/StudentPaymentsDialog";
import { formatCurrency, formatDate, getSubscriptionStatus } from "@/app/lib/utils";
import type {
  StudentDTO,
  TeacherDTO,
  ParentDTO,
  AttendanceDTO,
  GradeDTO,
  ClassLevelDTO,
  SubjectDTO,
  StudentPaymentsSummary,
} from "@/types";

const statusLabels: Record<string, string> = {
  active: "نشط",
  warning: "ينتهي قريبًا",
  expired: "منتهي",
  suspended: "موقوف",
};

const statusVariants: Record<string, "success" | "destructive" | "warning"> = {
  active: "success",
  warning: "warning",
  expired: "destructive",
  suspended: "destructive",
};

const shiftLabels: Record<string, string> = {
  morning: "صباحي",
  evening: "مسائي",
};

export function studentColumns(): Column<StudentDTO>[] {
  return [
    { header: "رقم الطالب", cell: (s) => s.studentNumber ?? "—" },
    { header: "الاسم", cell: (s) => s.user?.name ?? "—" },
    { header: "اسم الأب", cell: (s) => s.fatherName ?? "—" },
    { header: "اسم الأم", cell: (s) => s.motherName ?? "—" },
    { header: "البريد الإلكتروني", cell: (s) => s.user?.email ?? "—" },
    { header: "رقم الهاتف", cell: (s) => s.user?.phone ?? "—" },
    {
      header: "هواتف ولي الأمر",
      cell: (s) => (s.guardianPhones?.length ? s.guardianPhones.join("، ") : "—"),
    },
    { header: "الصف", cell: (s) => s.class?.name ?? "—" },
    { header: "الدوام", cell: (s) => (s.shift ? (shiftLabels[s.shift] ?? s.shift) : "—") },
    {
      header: "ولي الأمر",
      cell: (s) => s.parent?.user?.name ?? "—",
    },
    {
      header: "الحالة",
      cell: (s) => {
        const status = getSubscriptionStatus(s.subEndDate) ?? s.status;
        return (
          <Badge variant={statusVariants[status] ?? "secondary"}>
            {statusLabels[status] ?? status}
          </Badge>
        );
      },
    },
    { header: "نهاية الاشتراك", cell: (s) => formatDate(s.subEndDate) },
  ];
}

export function teacherColumns(): Column<TeacherDTO>[] {
  return [
    { header: "الاسم", cell: (t) => t.user?.name ?? "—" },
    { header: "البريد الإلكتروني", cell: (t) => t.user?.email ?? "—" },
    { header: "الدوام", cell: (t) => (t.shift ? (shiftLabels[t.shift] ?? t.shift) : "—") },
    {
      header: "المواد",
      cell: (t) => t.subjects?.map((s) => s.name).join("، ") || "—",
    },
    {
      header: "الصفوف",
      cell: (t) => t.classes?.map((c) => c.name).join("، ") || "—",
    },
  ];
}

export function parentColumns(): Column<ParentDTO>[] {
  return [
    { header: "الاسم", cell: (p) => p.user?.name ?? "—" },
    { header: "البريد الإلكتروني", cell: (p) => p.user?.email ?? "—" },
    {
      header: "أرقام الهاتف",
      cell: (p) =>
        [p.user?.phone, ...(p.phones ?? [])].filter(Boolean).join("، ") || "—",
    },
    {
      header: "الأبناء",
      cell: (p) =>
        p.children?.length
          ? p.children.map((c) => c.user?.name ?? "—").join("، ")
          : "—",
    },
  ];
}

const methodLabels: Record<string, string> = { bank: "تحويل بنكي", cash: "نقدي" };
const periodLabels: Record<string, string> = {
  year: "سنوي",
  semester: "فصلي",
  monthly: "شهري",
};

export function studentPaymentSummaryColumns(): Column<StudentPaymentsSummary>[] {
  return [
    { header: "الطالب", cell: (s) => s.studentName },
    {
      header: "عدد الفواتير",
      cell: (s) => (
        <StudentPaymentsDialog
          studentName={s.studentName}
          payments={s.payments}
          trigger={
            <button
              type="button"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {s.invoiceCount}
            </button>
          }
        />
      ),
    },
    { header: "إجمالي المدفوع", cell: (s) => formatCurrency(s.totalPaid) },
    {
      header: "إجمالي المستحق",
      cell: (s) => (s.totalDue != null ? formatCurrency(s.totalDue) : "—"),
    },
    {
      header: "المتبقي",
      cell: (s) =>
        s.remaining == null ? (
          "—"
        ) : s.remaining > 0 ? (
          <Badge variant="destructive">{formatCurrency(s.remaining)}</Badge>
        ) : (
          <Badge variant="success">مكتمل</Badge>
        ),
    },
  ];
}

const attendanceLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

const attendanceVariants: Record<string, "success" | "destructive" | "warning"> = {
  present: "success",
  absent: "destructive",
  late: "warning",
};

export function attendanceColumns(): Column<AttendanceDTO>[] {
  return [
    { header: "الطالب", cell: (a) => a.student?.user?.name ?? "—" },
    { header: "المادة", cell: (a) => a.session?.subject ?? "—" },
    { header: "التاريخ", cell: (a) => formatDate(a.session?.date) },
    {
      header: "الحالة",
      cell: (a) => (
        <Badge variant={attendanceVariants[a.status] ?? "secondary"}>
          {attendanceLabels[a.status] ?? a.status}
        </Badge>
      ),
    },
    { header: "ملاحظة", cell: (a) => a.note ?? "—" },
  ];
}

const gradeTypeLabels: Record<string, string> = {
  quiz: "اختبار قصير",
  exam: "اختبار",
  homework: "واجب",
};

export function gradeColumns(): Column<GradeDTO>[] {
  return [
    { header: "الطالب", cell: (g) => g.student?.user?.name ?? "—" },
    { header: "المادة", cell: (g) => g.subject },
    { header: "النوع", cell: (g) => gradeTypeLabels[g.type] ?? g.type },
    { header: "الدرجة", cell: (g) => `${g.score} / ${g.maxScore}` },
    { header: "التاريخ", cell: (g) => formatDate(g.date) },
    { header: "ملاحظة", cell: (g) => g.note ?? "—" },
  ];
}

export function classColumns(): Column<ClassLevelDTO>[] {
  return [
    { header: "الاسم", cell: (c) => c.name },
    { header: "الترتيب", cell: (c) => c.order },
    { header: "الدوام", cell: (c) => (c.shift ? (shiftLabels[c.shift] ?? c.shift) : "—") },
    {
      header: "المواد",
      cell: (c) =>
        c.subjects?.length ? (
          <div className="flex flex-wrap gap-1">
            {c.subjects.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
  ];
}

export function subjectColumns(): Column<SubjectDTO>[] {
  return [
    { header: "الاسم", cell: (s) => s.name },
    {
      header: "الصفوف",
      cell: (s) =>
        s.classes?.length ? (
          <div className="flex flex-wrap gap-1">
            {s.classes.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
  ];
}

export { statusLabels, attendanceLabels, gradeTypeLabels, methodLabels, periodLabels };
