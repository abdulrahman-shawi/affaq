"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/app/lib/utils";
import { gradeDisplayName, gradeTypeLabels } from "@/app/lib/gradeGroups";
import EditGradeForm from "@/components/forms/EditGradeForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/toaster";
import type { GradeDTO } from "@/types";

// ملخص مادة واحدة في ملف الطالب — يُمرر من صفحة الطالب
export interface SubjectReportRow {
  subject: string;
  count: number;
  /** متوسط نسب الطالب في المادة — null إن لم توجد درجات مدرجة */
  average: number | null;
}

function PercentBadge({ score, maxScore }: { score: number; maxScore: number }) {
  if (maxScore <= 0) return <>—</>;
  const pct = Math.round((score / maxScore) * 100);
  return (
    <Badge variant={pct >= 75 ? "success" : pct >= 50 ? "warning" : "destructive"}>
      {pct}%
    </Badge>
  );
}

// حوار تفاصيل الدرجة — للمعلم: قائمة طلاب الدرجة ودرجاتهم مع تعديل/حذف لكل طالب،
// وللطالب: درجته ضمن الدرجة + ملف بجميع مواد صفه ودرجاته
export default function GradeDetailsDialog({
  grade,
  items,
  canManage = false,
  subjectsReport,
  onChanged,
  trigger,
}: {
  grade: GradeDTO;
  /** كل سجلات الدرجة (الطلاب) — سجل واحد للدرجات الفردية */
  items: GradeDTO[];
  /** إظهار أزرار تعديل/حذف لكل طالب — للمعلم */
  canManage?: boolean;
  /** ملف مواد الصف ودرجاتها — يُمرر من صفحة الطالب */
  subjectsReport?: SubjectReportRow[];
  onChanged?: () => void;
  trigger?: React.ReactNode;
}) {
  const { toast } = useToast();
  const name = gradeDisplayName(grade);

  async function deleteGrade(id: string) {
    const res = await fetch(`/api/grades?id=${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      toast({ variant: "destructive", title: body?.error ?? "فشل في حذف الدرجة" });
    } else {
      toast({ variant: "success", title: "تم حذف الدرجة" });
    }
    onChanged?.();
  }

  const infoRows: [string, React.ReactNode][] = [
    ["المادة", grade.subject],
    ["نوع الدرجة", gradeTypeLabels[grade.type] ?? grade.type],
    ["التاريخ", formatDate(grade.date)],
    ["ملاحظة", grade.note ?? "—"],
  ];
  // درجة فردية لطالب واحد — نعرض طالبه ودرجته ضمن الملخص
  if (items.length === 1) {
    const only = items[0];
    infoRows.splice(
      1,
      0,
      ["الطالب", only.student?.user?.name ?? "—"],
      [
        "الدرجة",
        <span key="score" className="flex items-center gap-2">
          {only.score} / {only.maxScore}
          <PercentBadge score={only.score} maxScore={only.maxScore} />
        </span>,
      ]
    );
  } else {
    infoRows.splice(1, 0, ["عدد الطلاب", items.length]);
  }

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تفاصيل الدرجة — {name}</DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
          {infoRows.map(([label, value]) => (
            <div key={label} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {items.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">طلاب الدرجة ودرجاتهم</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الصف</TableHead>
                  <TableHead>الدرجة</TableHead>
                  <TableHead>النسبة</TableHead>
                  {canManage && (
                    <TableHead className="w-px">إجراءات</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.student?.user?.name ?? "—"}</TableCell>
                    <TableCell>{item.student?.class?.name ?? "—"}</TableCell>
                    <TableCell>
                      {item.score} / {item.maxScore}
                    </TableCell>
                    <TableCell>
                      <PercentBadge score={item.score} maxScore={item.maxScore} />
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EditGradeForm
                            grade={item}
                            onSuccess={onChanged}
                            trigger={
                              <Button variant="ghost" size="icon" title="تعديل">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            title="حذف درجة الطالب"
                            description={`سيتم حذف درجة ${item.student?.user?.name ?? "—"} من "${name}" نهائيًا.`}
                            confirmLabel="حذف"
                            onConfirm={() => deleteGrade(item.id)}
                            trigger={
                              <Button variant="ghost" size="icon" title="حذف">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {subjectsReport && subjectsReport.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">ملف المواد — جميع مواد صفك ودرجاتك</h4>
            <Table>
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
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
