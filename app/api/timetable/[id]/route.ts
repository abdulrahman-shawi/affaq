import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_RE = /^https?:\/\/\S+$/i;

/** يعيد الرابط منسّقًا، أو null إذا كان فارغًا (لمسح الرابط)، أو يرمي خطأ إذا كان غير صالح */
function normalizeZoomLink(value: unknown): string | null {
  const link = String(value ?? "").trim();
  if (!link) return null;
  if (!URL_RE.test(link)) {
    throw new Error("رابط زوم غير صالح — يجب أن يبدأ بـ http:// أو https://");
  }
  return link;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const existing = await prisma.timetableSlot.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "الحصة غير موجودة في الجدول" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.subject !== undefined) data.subject = String(body.subject).trim();
    if (body.dayOfWeek !== undefined) data.dayOfWeek = Number(body.dayOfWeek);
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;
    if (body.classId !== undefined) data.classId = body.classId;
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;
    if (body.zoomLink !== undefined) {
      try {
        data.zoomLink = normalizeZoomLink(body.zoomLink);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "رابط زوم غير صالح" },
          { status: 400 }
        );
      }
    }

    const merged = { ...existing, ...data } as {
      subject: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    };
    if (
      !merged.subject ||
      !Number.isInteger(merged.dayOfWeek) ||
      merged.dayOfWeek < 0 ||
      merged.dayOfWeek > 6 ||
      !TIME_RE.test(merged.startTime) ||
      !TIME_RE.test(merged.endTime) ||
      merged.startTime >= merged.endTime
    ) {
      return NextResponse.json(
        { error: "بيانات الحصة غير مكتملة أو غير صالحة" },
        { status: 400 }
      );
    }

    const slot = await prisma.timetableSlot.update({
      where: { id: params.id },
      data,
      include: { teacher: { include: { user: true } }, class: true },
    });
    return NextResponse.json(slot);
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
    return NextResponse.json({ error: "فشل في تعديل الحصة" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const existing = await prisma.timetableSlot.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "الحصة غير موجودة في الجدول" },
        { status: 404 }
      );
    }

    await prisma.timetableSlot.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف الحصة" }, { status: 500 });
  }
}
