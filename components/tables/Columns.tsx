import type { Column } from "./DataTable";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/app/lib/utils";
import type {
  StudentDTO,
  TeacherDTO,
  ParentDTO,
  PaymentDTO,
  AttendanceDTO,
  GradeDTO,
} from "@/types";

const statusLabels: Record<string, string> = {
  active: "نشط",
  expired: "منتهي",
  suspended: "موقوف",
};

const statusVariants: Record<string, "success" | "destructive" | "warning"> = {
  active: "success",
  expired: "destructive",
  suspended: "warning",
};

export function studentColumns(): Column<StudentDTO>[] {
  return [
    { header: "الاسم", cell: (s) => s.user?.name ?? "—" },
    { header: "البريد الإلكتروني", cell: (s) => s.user?.email ?? "—" },
    { header: "الصف", cell: (s) => `الصف ${s.grade}` },
    {
      header: "الحالة",
      cell: (s) => (
        <Badge variant={statusVariants[s.status] ?? "secondary"}>
          {statusLabels[s.status] ?? s.status}
        </Badge>
      ),
    },
    { header: "نهاية الاشتراك", cell: (s) => formatDate(s.subEndDate) },
  ];
}

export function teacherColumns(): Column<TeacherDTO>[] {
  return [
    { header: "الاسم", cell: (t) => t.user?.name ?? "—" },
    { header: "البريد الإلكتروني", cell: (t) => t.user?.email ?? "—" },
    { header: "المواد", cell: (t) => t.subjects.join("، ") || "—" },
    {
      header: "الصفوف",
      cell: (t) => t.grades.map((g) => `الصف ${g}`).join("، ") || "—",
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
    { header: "المبلغ", cell: (p) => formatCurrency(p.amount) },
    { header: "التاريخ", cell: (p) => formatDate(p.date) },
    { header: "طريقة الدفع", cell: (p) => methodLabels[p.method] ?? p.method },
    { header: "الفترة", cell: (p) => periodLabels[p.period] ?? p.period },
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

export { statusLabels, attendanceLabels, gradeTypeLabels, methodLabels, periodLabels };
