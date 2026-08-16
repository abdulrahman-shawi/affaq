import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { formatDate } from "@/app/lib/utils";
import { newWorkbook, addSheet, styleHeaderRow, xlsxResponse } from "@/app/lib/excel";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  expired: "منتهي",
  suspended: "موقوف",
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        class: true,
        parent: { include: { user: true } },
      },
    });

    // الأقرب انتهاءً أولًا
    students.sort((a, b) => {
      const aTime = a.subEndDate?.getTime() ?? Infinity;
      const bTime = b.subEndDate?.getTime() ?? Infinity;
      return aTime - bTime;
    });

    const now = Date.now();

    const workbook = newWorkbook();
    const sheet = addSheet(workbook, "الاشتراكات");

    sheet.columns = [
      { width: 24 },
      { width: 16 },
      { width: 12 },
      { width: 18 },
      { width: 14 },
      { width: 24 },
      { width: 16 },
    ];

    sheet.addRow(["تقرير حالة الاشتراكات"]).font = { bold: true, size: 14 };
    sheet.addRow([]);

    const header = sheet.addRow([
      "الطالب",
      "الصف",
      "الحالة",
      "تاريخ الانتهاء",
      "الأيام المتبقية",
      "ولي الأمر",
      "جوال ولي الأمر",
    ]);
    styleHeaderRow(header);

    for (const student of students) {
      const daysLeft = student.subEndDate
        ? Math.ceil((student.subEndDate.getTime() - now) / DAY_MS)
        : null;
      sheet.addRow([
        student.user.name,
        student.class?.name ?? "بدون صف",
        STATUS_LABELS[student.status] ?? student.status,
        student.subEndDate ? formatDate(student.subEndDate) : "—",
        daysLeft === null ? "—" : daysLeft,
        student.parent?.user.name ?? "—",
        student.parent?.user.phone ?? "—",
      ]);
    }

    return xlsxResponse(workbook, "تقرير-الاشتراكات.xlsx");
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
