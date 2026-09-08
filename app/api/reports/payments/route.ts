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
    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "معرّف الطالب مطلوب" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        class: true,
        payments: { orderBy: { date: "asc" } },
      },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    const workbook = newWorkbook();
    const sheet = addSheet(workbook, "كشف مدفوعات");

    sheet.columns = [
      { width: 18 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 10 },
      { width: 30 },
    ];

    sheet.addRow(["كشف حساب المدفوعات"]).font = { bold: true, size: 14 };
    sheet.addRow(["الاسم", student.user.name]);
    sheet.addRow(["الصف", student.class?.name ?? "بدون صف"]);
    sheet.addRow(["تاريخ الإصدار", formatDate(new Date())]);
    sheet.addRow([]);

    const header = sheet.addRow([
      "التاريخ",
      "المبلغ المدفوع",
      "المبلغ المستحق",
      "المتبقي",
      "طريقة الدفع",
      "الفترة",
      "الأشهر",
      "ملاحظة",
    ]);
    styleHeaderRow(header);

    let total = 0;
    let totalRemaining = 0;
    for (const payment of student.payments) {
      total += payment.amount;
      const remaining =
        payment.dueAmount != null
          ? Math.max(0, payment.dueAmount - payment.amount)
          : null;
      if (remaining != null) totalRemaining += remaining;
      sheet.addRow([
        formatDate(payment.date),
        payment.amount,
        payment.dueAmount ?? "",
        remaining ?? "",
        METHOD_LABELS[payment.method] ?? payment.method,
        PERIOD_LABELS[payment.period] ?? payment.period,
        payment.months ?? "",
        payment.note ?? "",
      ]);
    }

    sheet.addRow([]);
    const totalRow = sheet.addRow(["الإجمالي", total, "", totalRemaining]);
    totalRow.font = { bold: true };

    return xlsxResponse(workbook, `كشف-مدفوعات-${student.user.name}.xlsx`);
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
