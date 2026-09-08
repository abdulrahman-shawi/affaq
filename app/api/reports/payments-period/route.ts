import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { formatDate } from "@/app/lib/utils";
import { newWorkbook, addSheet, styleHeaderRow, xlsxResponse } from "@/app/lib/excel";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  bank: "تحويل بنكي",
  cash: "نقدي",
};

const PERIOD_LABELS: Record<string, string> = {
  year: "سنوي",
  semester: "فصلي",
  monthly: "شهري",
};

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const params = new URL(req.url).searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
      return NextResponse.json(
        { error: "يجب تحديد from و to بصيغة YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // نهاية الفترة شاملة ليوم to كاملًا
    const toExclusive = new Date(`${to}T00:00:00`);
    toExclusive.setDate(toExclusive.getDate() + 1);

    const payments = await prisma.payment.findMany({
      where: {
        date: { gte: new Date(`${from}T00:00:00`), lt: toExclusive },
      },
      include: { student: { include: { user: true, class: true } } },
      orderBy: { date: "asc" },
    });

    const workbook = newWorkbook();
    const sheet = addSheet(workbook, "كشف المدفوعات");

    sheet.columns = [
      { width: 18 },
      { width: 24 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 30 },
    ];

    sheet
      .addRow([`كشف المدفوعات من ${formatDate(from)} إلى ${formatDate(to)}`])
      .font = { bold: true, size: 14 };
    sheet.addRow([]);

    const header = sheet.addRow([
      "التاريخ",
      "الطالب",
      "الصف",
      "المبلغ المدفوع",
      "المبلغ المستحق",
      "المتبقي",
      "طريقة الدفع",
      "الفترة",
      "ملاحظة",
    ]);
    styleHeaderRow(header);

    let total = 0;
    let totalRemaining = 0;
    for (const payment of payments) {
      total += payment.amount;
      const remaining =
        payment.dueAmount != null
          ? Math.max(0, payment.dueAmount - payment.amount)
          : null;
      if (remaining != null) totalRemaining += remaining;
      sheet.addRow([
        formatDate(payment.date),
        payment.student.user.name,
        payment.student.class?.name ?? "بدون صف",
        payment.amount,
        payment.dueAmount ?? "",
        remaining ?? "",
        METHOD_LABELS[payment.method] ?? payment.method,
        PERIOD_LABELS[payment.period] ?? payment.period,
        payment.note ?? "",
      ]);
    }

    sheet.addRow([]);
    const summary = sheet.addRow(["عدد الدفعات", payments.length]);
    summary.font = { bold: true };
    const totalRow = sheet.addRow(["الإجمالي", "", "", total, "", totalRemaining]);
    totalRow.font = { bold: true };

    return xlsxResponse(workbook, `كشف-مدفوعات-${from}-إلى-${to}.xlsx`);
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
