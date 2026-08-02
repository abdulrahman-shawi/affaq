import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const existing = await prisma.session.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });
    }

    const body = await req.json();
    const { grade, subject, date } = body;

    if (!grade || !subject || !date) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const updated = await prisma.session.update({
      where: { id: params.id },
      data: {
        grade: Number(grade),
        subject,
        date: new Date(date),
      },
      include: { teacher: { include: { user: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل الحصة" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const existing = await prisma.session.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { sessionId: params.id } }),
      prisma.message.deleteMany({ where: { sessionId: params.id } }),
      prisma.session.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف الحصة" }, { status: 500 });
  }
}
