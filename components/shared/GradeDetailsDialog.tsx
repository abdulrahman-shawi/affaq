"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/app/lib/utils";
import { gradeDisplayName } from "@/components/tables/Columns";
import type { GradeDTO } from "@/types";

const gradeTypeLabels: Record<string, string> = {
  quiz: "اختبار قصير",
  exam: "اختبار",
  homework: "واجب",
  manual: "تسميع",
  dictation: "إملاء",
  memorization: "مذاكرة",
};

// حوار تفاصيل الدرجة — يفتح من زر "تفاصيل" في سجل درجات المعلم والطالب
// ويعرض ما أُخفي من الأعمدة: الطالب والصف والمادة والدرجة
export default function GradeDetailsDialog({
  grade,
  trigger,
}: {
  grade: GradeDTO;
  trigger?: React.ReactNode;
}) {
  const percentage =
    grade.maxScore > 0 ? Math.round((grade.score / grade.maxScore) * 100) : null;

  const rows: [string, React.ReactNode][] = [
    ["الطالب", grade.student?.user?.name ?? "—"],
    ["الصف", grade.student?.class?.name ?? "—"],
    ["المادة", grade.subject],
    ["اسم الدرجة", gradeDisplayName(grade)],
    ["نوع الدرجة", gradeTypeLabels[grade.type] ?? grade.type],
    [
      "الدرجة",
      <span key="score" className="flex items-center gap-2">
        <span>
          {grade.score} / {grade.maxScore}
        </span>
        {percentage !== null && (
          <Badge
            variant={
              percentage >= 75 ? "success" : percentage >= 50 ? "warning" : "destructive"
            }
          >
            {percentage}%
          </Badge>
        )}
      </span>,
    ],
    ["التاريخ", formatDate(grade.date)],
    ["ملاحظة", grade.note ?? "—"],
  ];

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تفاصيل الدرجة</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
