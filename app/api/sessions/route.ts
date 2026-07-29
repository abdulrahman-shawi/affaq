import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      include: { teacher: { include: { user: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الحصص" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { teacherId, grade, subject, date } = body;

    if (!teacherId || !grade || !subject || !date) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const session = await prisma.session.create({
      data: {
        teacherId,
        grade: Number(grade),
        subject,
        date: new Date(date),
      },
      include: { teacher: { include: { user: true } } },
    });

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء الحصة" }, { status: 500 });
  }
}
