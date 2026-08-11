import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { formatDate } from "@/app/lib/utils";
import { newWorkbook, addSheet, styleHeaderRow, xlsxResponse } from "@/app/lib/excel";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  quiz: "اختبار قصير",
  exam: "امتحان",
  homework: "واجب",
};

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "معرّف الطالب مطلوب" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        class: true,
        grades: { orderBy: { date: "asc" } },
      },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    const workbook = newWorkbook();
    const sheet = addSheet(workbook, "بطاقة درجات");

    sheet.columns = [
      { width: 20 },
      { width: 14 },
      { width: 10 },
      { width: 10 },
      { width: 18 },
      { width: 30 },
    ];

    sheet.addRow(["بطاقة درجات الطالب"]).font = { bold: true, size: 14 };
    sheet.addRow(["الاسم", student.user.name]);
    sheet.addRow(["الصف", student.class?.name ?? "بدون صف"]);
    sheet.addRow(["تاريخ الإصدار", formatDate(new Date())]);
    sheet.addRow([]);

    const header = sheet.addRow(["المادة", "النوع", "الدرجة", "من", "التاريخ", "ملاحظة"]);
    styleHeaderRow(header);

    for (const grade of student.grades) {
      sheet.addRow([
        grade.subject,
        TYPE_LABELS[grade.type] ?? grade.type,
        grade.score,
        grade.maxScore,
        formatDate(grade.date),
        grade.note ?? "",
      ]);
    }

    sheet.addRow([]);

    const bySubject = new Map<string, { score: number; max: number }>();
    for (const grade of student.grades) {
      const agg = bySubject.get(grade.subject) ?? { score: 0, max: 0 };
      agg.score += grade.score;
      agg.max += grade.maxScore;
      bySubject.set(grade.subject, agg);
    }

    const summaryHeader = sheet.addRow(["المادة", "المتوسط %"]);
    styleHeaderRow(summaryHeader);

    let totalScore = 0;
    let totalMax = 0;
    bySubject.forEach((agg, subject) => {
      totalScore += agg.score;
      totalMax += agg.max;
      sheet.addRow([
        subject,
        agg.max > 0 ? Math.round((agg.score / agg.max) * 100) : 0,
      ]);
    });

    const overallRow = sheet.addRow([
      "المتوسط العام",
      totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    ]);
    overallRow.font = { bold: true };

    return xlsxResponse(workbook, `بطاقة-درجات-${student.user.name}.xlsx`);
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
