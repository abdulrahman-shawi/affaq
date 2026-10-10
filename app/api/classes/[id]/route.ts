import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { storedOrder, displayOrder } from "@/app/lib/classOrder";


export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const classLevel = await prisma.classLevel.findUnique({
      where: { id: params.id },
    });
    if (!classLevel) {
      return NextResponse.json({ error: "الصف غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { name, order, shift, subjectIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "اسم الصف مطلوب" }, { status: 400 });
    }

    const nameOwner = await prisma.classLevel.findUnique({
      where: { name: name.trim() },
    });
    if (nameOwner && nameOwner.id !== params.id) {
      return NextResponse.json(
        { error: "اسم الصف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const nextShift =
      shift === "morning" || shift === "evening" || shift === null
        ? shift
        : classLevel.shift;

    // نسترجع الترتيب الأساسي (بدون فرق المسائي) ثم نطبّقه على الدوام الجديد،
    // حتى يبقى ترتيب المسائي مميزًا حتى لو غيّر المدير الدوام فقط
    const baseOrder =
      order !== undefined && Number.isInteger(Number(order))
        ? Number(order)
        : displayOrder(classLevel.order, classLevel.shift);
    const finalOrder = storedOrder(baseOrder, nextShift);

    if (finalOrder !== classLevel.order) {
      const orderOwner = await prisma.classLevel.findFirst({
        where: { order: finalOrder, NOT: { id: params.id } },
      });
      if (orderOwner) {
        return NextResponse.json(
          { error: "يوجد صف آخر بنفس الترتيب — اختر رقمًا مختلفًا" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.classLevel.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        ...(nextShift !== classLevel.shift ? { shift: nextShift } : {}),
        ...(finalOrder !== classLevel.order ? { order: finalOrder } : {}),
        // عند إرسال subjectIds نستبدل المواد المرتبطة بالكامل
        ...(Array.isArray(subjectIds)
          ? { subjects: { set: subjectIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { subjects: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل الصف" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const classLevel = await prisma.classLevel.findUnique({
      where: { id: params.id },
    });
    if (!classLevel) {
      return NextResponse.json({ error: "الصف غير موجود" }, { status: 404 });
    }

    await prisma.classLevel.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف الصف" }, { status: 500 });
  }
}
