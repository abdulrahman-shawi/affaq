"use client";

import { useMemo } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/app/lib/utils";
import { gradeDisplayName, gradeTypeLabels } from "@/app/lib/gradeGroups";
import type { GradeDTO } from "@/types";

// ملخص مادة واحدة في ملف الطالب — يُمرر من صفحة الطالب
export interface SubjectReportRow {
  subject: string;
  count: number;
  /** متوسط نسب الطالب في المادة — null إن لم توجد درجات مدرجة */
  average: number | null;
}

// عرض ملف الدرجة بنفس تصميم شبكة الرصد (إضافة درجة) لكن للقراءة فقط:
// الصفوف طلاب الملف، والأعمدة موادّه مع الدرجة العظمى في رأس كل مادة،
// والخلايا درجات الطلاب، وعمود أخير للملاحظات — بلا أزرار إجراءات.
// للطالب: يُعرض صفّه وحده — المادة والدرجة فقط
export default function GradeDetailsDialog({
  grade,
  items,
  subjectsReport,
  trigger,
}: {
  grade: GradeDTO;
  /** كل سجلات ملف الدرجة — سجل واحد للدرجات الفردية */
  items: GradeDTO[];
  /** ملف مواد الصف ودرجاتها — يُمرر من صفحة الطالب */
  subjectsReport?: SubjectReportRow[];
  trigger?: React.ReactNode;
}) {
  const name = gradeDisplayName(grade);
  // ملف جماعي (عدة طلاب) — نعرض سطر معلومات مختصرًا فوق الشبكة
  const multi = items.length > 1;

  // أعمدة الشبكة = مواد الملف بترتيب ظهورها، مع الدرجة العظمى لكل مادة
  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of items) {
      if (!map.has(g.subject)) map.set(g.subject, g.maxScore);
    }
    return Array.from(map, ([subject, maxScore]) => ({ subject, maxScore }));
  }, [items]);

  // صفوف الشبكة = طلاب الملف — خلايا كل طالب: مادة → درجة، مع ملاحظته
  const rows = useMemo(() => {
    const map = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        className: string | null;
        cells: Map<string, number>;
        note: string | null;
      }
    >();
    for (const g of items) {
      let row = map.get(g.studentId);
      if (!row) {
        row = {
          studentId: g.studentId,
          studentName: g.student?.user?.name ?? "—",
          className: g.student?.class?.name ?? null,
          cells: new Map(),
          note: null,
        };
        map.set(g.studentId, row);
      }
      row.cells.set(g.subject, g.score);
      if (!row.note && g.note?.trim()) row.note = g.note;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName, "ar")
    );
  }, [items]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" />
            تفاصيل
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>ملف الدرجة — {name}</DialogTitle>
          {multi && (
            <p className="text-sm text-muted-foreground">
              {gradeTypeLabels[grade.type] ?? grade.type} · {formatDate(grade.date)}{" "}
              · {rows.length} {rows.length === 1 ? "طالب" : "طلاب"}
            </p>
          )}
        </DialogHeader>

        <div className="overflow-auto rounded-md border max-h-[70vh]">
          {/* table مباشرة بدل مكوّن Table كي لا يتداخل غلافاه مع التمرير،
              وborder-separate لأن border-collapse الافتراضي يعطّل sticky —
              نفس بنية شبكة الرصد في إضافة الدرجة */}
          <table className="w-full caption-bottom text-sm border-separate border-spacing-0 min-w-max">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky right-0 top-0 z-20 bg-background min-w-40">
                  الطالب
                </TableHead>
                {subjects.map((s) => (
                  <TableHead
                    key={s.subject}
                    className="sticky top-0 z-10 min-w-32 border-s border-border bg-background text-center"
                  >
                    <div className="space-y-1">
                      <div>{s.subject}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        من {s.maxScore}
                      </div>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="top-0 z-20 min-w-32 border-s border-border bg-background text-center lg:sticky lg:left-0 lg:min-w-44">
                  ملاحظات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId} className="hover:bg-transparent">
                  <TableCell className="sticky right-0 z-10 min-w-40 bg-background font-medium">
                    {row.studentName}
                    {row.className && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {row.className}
                      </span>
                    )}
                  </TableCell>
                  {subjects.map((s) => (
                    <TableCell
                      key={s.subject}
                      className="border-s border-border p-1 text-center"
                    >
                      {row.cells.has(s.subject) ? (
                        row.cells.get(s.subject)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="z-10 min-w-32 border-s border-border bg-background p-1 lg:sticky lg:left-0 lg:min-w-44">
                    {row.note ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>

        {subjectsReport && subjectsReport.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">ملف المواد — جميع مواد صفك ودرجاتك</h4>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead>عدد الدرجات</TableHead>
                    <TableHead>المعدل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectsReport.map((row) => (
                    <TableRow key={row.subject}>
                      <TableCell className="font-medium">{row.subject}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>
                        {row.average !== null ? `${row.average}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
