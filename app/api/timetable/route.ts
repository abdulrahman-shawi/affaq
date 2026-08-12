import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidSlot(body: {
  subject?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}) {
  return (
    typeof body.subject === "string" &&
    body.subject.trim().length > 0 &&
    Number.isInteger(body.dayOfWeek) &&
    body.dayOfWeek! >= 0 &&
    body.dayOfWeek! <= 6 &&
    TIME_RE.test(body.startTime ?? "") &&
    TIME_RE.test(body.endTime ?? "") &&
    body.startTime! < body.endTime!
  );
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const params = new URL(req.url).searchParams;
    const classId = params.get("classId");
    const teacherId = params.get("teacherId");
    if (!classId && !teacherId) {
      return NextResponse.json(
        { error: "يجب تحديد classId أو teacherId" },
        { status: 400 }
      );
    }

    const slots = await prisma.timetableSlot.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
      include: { teacher: { include: { user: true } }, class: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(slots);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الجدول" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { classId, teacherId, subject, dayOfWeek, startTime, endTime } = body;
    if (
      !classId ||
      !teacherId ||
      !isValidSlot({ subject, dayOfWeek: Number(dayOfWeek), startTime, endTime })
    ) {
      return NextResponse.json(
        { error: "بيانات الحصة غير مكتملة أو غير صالحة" },
        { status: 400 }
      );
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        classId,
        teacherId,
        subject: subject.trim(),
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      },
      include: { teacher: { include: { user: true } }, class: true },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "يوجد حصة أخرى لهذا الصف في نفس اليوم والوقت" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "فشل في إضافة الحصة" }, { status: 500 });
  }
}
