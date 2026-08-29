import type { Column } from "./DataTable";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getSubscriptionStatus } from "@/app/lib/utils";
import type {
  StudentDTO,
  TeacherDTO,
  ParentDTO,
  PaymentDTO,
  AttendanceDTO,
  GradeDTO,
  ClassLevelDTO,
  SubjectDTO,
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

export function studentColumns(): Column<StudentDTO>[] {
  return [
    { header: "الاسم", cell: (s) => s.user?.name ?? "—" },
    { header: "البريد الإلكتروني", cell: (s) => s.user?.email ?? "—" },
    { header: "رقم الهاتف", cell: (s) => s.user?.phone ?? "—" },
    { header: "الصف", cell: (s) => s.class?.name ?? "—" },
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
    { header: "رقم الهاتف", cell: (p) => p.user?.phone ?? "—" },
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

export function paymentColumns(): Column<PaymentDTO>[] {
  return [
    { header: "الطالب", cell: (p) => p.student?.user?.name ?? "—" },
    { header: "المبلغ المدفوع", cell: (p) => formatCurrency(p.amount) },
    {
      header: "المبلغ المستحق",
      cell: (p) => (p.dueAmount != null ? formatCurrency(p.dueAmount) : "—"),
    },
    {
      header: "المتبقي",
      cell: (p) => {
        if (p.dueAmount == null) return "—";
        const remaining = p.dueAmount - p.amount;
        return remaining > 0 ? (
          <Badge variant="destructive">{formatCurrency(remaining)}</Badge>
        ) : (
          <Badge variant="success">مكتمل</Badge>
        );
      },
    },
    { header: "التاريخ", cell: (p) => formatDate(p.date) },
    { header: "طريقة الدفع", cell: (p) => methodLabels[p.method] ?? p.method },
    { header: "الفترة", cell: (p) => periodLabels[p.period] ?? p.period },
    {
      header: "الإشعار",
      cell: (p) =>
        p.receiptUrl ? (
          <a
            href={p.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            عرض
          </a>
        ) : (
          "—"
        ),
    },
    { header: "ملاحظة", cell: (p) => p.note ?? "—" },
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
