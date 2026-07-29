import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
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
    const { studentId, amount, method, period, months, note } = body;

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
        note: note || null,
      },
      include: { student: { include: { user: true } } },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في تسجيل الدفعة" }, { status: 500 });
  }
}
