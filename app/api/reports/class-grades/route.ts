import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { newWorkbook, addSheet, styleHeaderRow, xlsxResponse } from "@/app/lib/excel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const classId = new URL(req.url).searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "معرّف الصف مطلوب" }, { status: 400 });
    }

    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classId },
    });
    if (!classLevel) {
      return NextResponse.json({ error: "الصف غير موجود" }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: { classId },
      include: { user: true, grades: true },
      orderBy: { user: { name: "asc" } },
    });

    // المواد التي لها درجات في هذا الصف
    const subjects = Array.from(
      new Set(students.flatMap((s) => s.grades.map((g) => g.subject)))
    ).sort();

    const workbook = newWorkbook();
    const sheet = addSheet(workbook, "درجات الصف");

    sheet.addRow([`تقرير درجات ${classLevel.name}`]).font = { bold: true, size: 14 };
    sheet.addRow([]);

    const header = sheet.addRow([
      "الطالب",
      ...subjects.map((s) => `${s} %`),
      "المتوسط العام %",
    ]);
    styleHeaderRow(header);

    for (const student of students) {
      const subjectAvgs = subjects.map((subject) => {
        const grades = student.grades.filter((g) => g.subject === subject);
        const score = grades.reduce((sum, g) => sum + g.score, 0);
        const max = grades.reduce((sum, g) => sum + g.maxScore, 0);
        return max > 0 ? Math.round((score / max) * 100) : null;
      });
      const totalScore = student.grades.reduce((sum, g) => sum + g.score, 0);
      const totalMax = student.grades.reduce((sum, g) => sum + g.maxScore, 0);
      sheet.addRow([
        student.user.name,
        ...subjectAvgs.map((avg) => (avg === null ? "—" : avg)),
        totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : "—",
      ]);
    }

    sheet.columns.forEach((col) => {
      col.width = 16;
    });
    if (sheet.columns.length > 0) sheet.columns[0].width = 24;

    return xlsxResponse(workbook, `درجات-${classLevel.name}.xlsx`);
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
