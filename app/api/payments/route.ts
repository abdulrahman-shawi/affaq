import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const payments = await prisma.payment.findMany({
      where: studentId ? { studentId } : undefined,
      include: { student: { include: { user: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل المدفوعات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, amount, method, period, months, dueAmount, receiptUrl, note } = body;

    if (!studentId || !amount || !method || !period) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount: Number(amount),
        method,
        period,
        months: months ? Number(months) : null,
        dueAmount: dueAmount ? Number(dueAmount) : null,
        receiptUrl: receiptUrl || null,
        note: note || null,
      },
      include: { student: { include: { user: true } } },
    });

    // تمديد الاشتراك بعدد الأشهر المدفوعة وإعادة تفعيل الطالب
    if (months) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { subEndDate: true },
      });

      const now = new Date();
      // يبدأ التمديد من تاريخ الانتهاء الحالي إن كان ساريًا، وإلا من اليوم
      const base =
        student?.subEndDate && student.subEndDate > now
          ? new Date(student.subEndDate)
          : now;
      base.setMonth(base.getMonth() + Number(months));

      await prisma.student.update({
        where: { id: studentId },
        data: { subEndDate: base, status: "active" },
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في تسجيل الدفعة" }, { status: 500 });
  }
}
