import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { formatDate } from "@/app/lib/utils";
import { newWorkbook, addSheet, styleHeaderRow, xlsxResponse } from "@/app/lib/excel";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const params = new URL(req.url).searchParams;
    const month = params.get("month");
    const classId = params.get("classId");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "الشهر مطلوب بصيغة YYYY-MM" },
        { status: 400 }
      );
    }

    const [year, monthIndex] = month.split("-").map(Number);
    const from = new Date(year, monthIndex - 1, 1);
    const to = new Date(year, monthIndex, 1);

    const records = await prisma.attendance.findMany({
      where: {
        session: { date: { gte: from, lt: to } },
        ...(classId ? { student: { classId } } : {}),
      },
      include: {
        student: { include: { user: true, class: true } },
        session: true,
      },
      orderBy: { session: { date: "asc" } },
    });

    const workbook = newWorkbook();

    // ورقة الملخص: صف لكل طالب
    const summary = addSheet(workbook, "ملخص");
    summary.columns = [
      { width: 24 },
      { width: 16 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 14 },
    ];
    summary.addRow([`تقرير الحضور الشهري — ${month}`]).font = { bold: true, size: 14 };
    summary.addRow([]);
    const summaryHeader = summary.addRow([
      "الطالب",
      "الصف",
      "حاضر",
      "غائب",
      "متأخر",
      "نسبة الحضور %",
    ]);
    styleHeaderRow(summaryHeader);

    const byStudent = new Map<
      string,
      { name: string; className: string; present: number; absent: number; late: number }
    >();
    for (const record of records) {
      const agg =
        byStudent.get(record.studentId) ?? {
          name: record.student.user.name,
          className: record.student.class?.name ?? "بدون صف",
          present: 0,
          absent: 0,
          late: 0,
        };
      if (record.status === "present") agg.present += 1;
      else if (record.status === "absent") agg.absent += 1;
      else if (record.status === "late") agg.late += 1;
      byStudent.set(record.studentId, agg);
    }

    byStudent.forEach((agg) => {
      const total = agg.present + agg.absent + agg.late;
      summary.addRow([
        agg.name,
        agg.className,
        agg.present,
        agg.absent,
        agg.late,
        total > 0 ? Math.round((agg.present / total) * 100) : 0,
      ]);
    });

    // ورقة التفاصيل: كل سجل حضور
    const details = addSheet(workbook, "تفاصيل");
    details.columns = [
      { width: 18 },
      { width: 24 },
      { width: 16 },
      { width: 16 },
      { width: 10 },
      { width: 30 },
    ];
    const detailsHeader = details.addRow([
      "التاريخ",
      "الطالب",
      "الصف",
      "المادة",
      "الحالة",
      "ملاحظة",
    ]);
    styleHeaderRow(detailsHeader);

    for (const record of records) {
      details.addRow([
        formatDate(record.session.date),
        record.student.user.name,
        record.student.class?.name ?? "بدون صف",
        record.session.subject,
        STATUS_LABELS[record.status] ?? record.status,
        record.note ?? "",
      ]);
    }

    return xlsxResponse(workbook, `تقرير-الحضور-${month}.xlsx`);
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
