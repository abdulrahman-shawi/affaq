import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { formatDate } from "@/app/lib/utils";
import { newWorkbook, addSheet, styleHeaderRow, xlsxResponse } from "@/app/lib/excel";

export const dynamic = "force-dynamic";

const PASS_THRESHOLD = 50;

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const quizId = new URL(req.url).searchParams.get("quizId");
    if (!quizId) {
      return NextResponse.json({ error: "معرّف الاختبار مطلوب" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: { include: { student: { include: { user: true } } } },
      },
    });
    if (!quiz) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const workbook = newWorkbook();
    const sheet = addSheet(workbook, "نتائج الاختبار");

    sheet.columns = [
      { width: 24 },
      { width: 10 },
      { width: 10 },
      { width: 12 },
      { width: 10 },
      { width: 18 },
    ];

    sheet.addRow([`نتائج اختبار: ${quiz.title}`]).font = { bold: true, size: 14 };
    sheet.addRow(["المادة", quiz.subject]);
    sheet.addRow([]);

    const header = sheet.addRow([
      "الطالب",
      "الدرجة",
      "من",
      "النسبة %",
      "النتيجة",
      "التاريخ",
    ]);
    styleHeaderRow(header);

    let passed = 0;
    let percentSum = 0;
    for (const attempt of quiz.attempts) {
      const percent =
        attempt.maxScore > 0
          ? Math.round((attempt.score / attempt.maxScore) * 100)
          : 0;
      const isPass = percent >= PASS_THRESHOLD;
      if (isPass) passed += 1;
      percentSum += percent;
      sheet.addRow([
        attempt.student.user.name,
        attempt.score,
        attempt.maxScore,
        percent,
        isPass ? "ناجح" : "راسب",
        formatDate(attempt.submittedAt),
      ]);
    }

    sheet.addRow([]);
    const total = quiz.attempts.length;
    const stats = [
      ["عدد المحاولات", total],
      ["متوسط النسبة %", total > 0 ? Math.round(percentSum / total) : 0],
      ["نسبة النجاح %", total > 0 ? Math.round((passed / total) * 100) : 0],
    ];
    for (const [label, value] of stats) {
      const row = sheet.addRow([label, value]);
      row.font = { bold: true };
    }

    return xlsxResponse(workbook, `نتائج-اختبار-${quiz.title}.xlsx`);
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
