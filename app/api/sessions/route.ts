import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorClassIds } from "@/app/lib/supervisorScope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const scoped = await getSupervisorClassIds(sessionUser);

    const sessions = await prisma.session.findMany({
      where: scoped
        ? { teacher: { classes: { some: { id: { in: scoped } } } } }
        : undefined,
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
    const { teacherId, grade, subject, date, zoomLink, recordingUrl } = body;

    if (!teacherId || !grade || !subject || !date) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const session = await prisma.session.create({
      data: {
        teacherId,
        grade: Number(grade),
        subject,
        date: new Date(date),
        zoomLink: zoomLink || null,
        recordingUrl: recordingUrl || null,
      },
      include: { teacher: { include: { user: true } } },
    });

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء الحصة" }, { status: 500 });
  }
}
