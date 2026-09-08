import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminAreaRole } from "@/app/lib/roles";
import { getSupervisorClassIds } from "@/app/lib/supervisorScope";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_RE = /^https?:\/\/\S+$/i;

/** يعيد الرابط منسّقًا، أو null إذا كان فارغًا، أو يرمي خطأ إذا كان غير صالح */
function normalizeZoomLink(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const link = String(value).trim();
  if (!link) return null;
  if (!URL_RE.test(link)) {
    throw new Error("رابط زوم غير صالح — يجب أن يبدأ بـ http:// أو https://");
  }
  return link;
}

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
    if (!classId && !teacherId && !isAdminAreaRole(sessionUser.role)) {
      return NextResponse.json(
        { error: "يجب تحديد classId أو teacherId" },
        { status: 400 }
      );
    }
    const scoped = await getSupervisorClassIds(sessionUser);

    const slots = await prisma.timetableSlot.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        // المشرف مقيّد بصفوفه: classId المطلوب خارج نطاقه = بلا نتائج
        ...(scoped
          ? classId
            ? { classId: scoped.includes(classId) ? classId : { in: [] as string[] } }
            : { classId: { in: scoped } }
          : classId
            ? { classId }
            : {}),
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
  if (!isAdminAreaRole(sessionUser?.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const scoped = await getSupervisorClassIds(sessionUser);

  try {
    const body = await req.json();
    const { classId, subject, dayOfWeek, startTime, endTime, teacherId } = body;

    // المشرف يدير جدول صفوفه فقط
    if (scoped && (!classId || !scoped.includes(classId))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    let zoomLink: string | null;
    try {
      zoomLink = normalizeZoomLink(body.zoomLink);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "رابط زوم غير صالح" },
        { status: 400 }
      );
    }

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
        zoomLink,
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
