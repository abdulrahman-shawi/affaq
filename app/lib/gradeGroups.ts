import type { GradeDTO } from "@/types";

export const gradeTypeLabels: Record<string, string> = {
  quiz: "اختبار قصير",
  exam: "اختبار",
  homework: "واجب",
  manual: "تسميع",
  dictation: "إملاء",
  memorization: "مذاكرة",
};

// اسم الدرجة المعروض — للدرجات القديمة بلا اسم يُشتق اسم من نوعها ومادتها
// كي لا تظهر بشرطة وتبدو خالية
export function gradeDisplayName(g: GradeDTO): string {
  if (g.name?.trim()) return g.name;
  const typeLabel = gradeTypeLabels[g.type];
  return typeLabel ? `${typeLabel} ${g.subject}` : `درجة ${g.subject}`;
}

// مجمّع درجات — الدرجات المرسودة جماعيًا تحت اسم واحد (رصد الشبكة) تظهر في
// سجل الدرجات كصف واحد، وحوار التفاصيل يعرض طلابها ودرجاتهم
export interface GradeGroup {
  key: string;
  /** اسم الدرجة المعروض — المخزن أو المشتق للدرجات بلا اسم */
  name: string;
  type: string;
  subject: string;
  /** أحدث تاريخ ضمن المجموعة */
  date: string;
  note: string | null;
  items: GradeDTO[];
}

export function groupGrades(grades: GradeDTO[]): GradeGroup[] {
  const map = new Map<string, GradeGroup>();
  for (const g of grades) {
    const storedName = g.name?.trim();
    const key = storedName ? `name:${storedName}` : `id:${g.id}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        key,
        name: storedName ?? gradeDisplayName(g),
        type: g.type,
        subject: g.subject,
        date: g.date,
        note: g.note?.trim() ? g.note : null,
        items: [g],
      });
    } else {
      current.items.push(g);
      if (new Date(g.date) > new Date(current.date)) current.date = g.date;
      if (!current.note && g.note?.trim()) current.note = g.note;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
