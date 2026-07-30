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
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
    });
    if (!subject) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });
    }

    const body = await req.json();
    const { name, classIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "اسم المادة مطلوب" }, { status: 400 });
    }

    const nameOwner = await prisma.subject.findUnique({
      where: { name: name.trim() },
    });
    if (nameOwner && nameOwner.id !== params.id) {
      return NextResponse.json(
        { error: "اسم المادة مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const updated = await prisma.subject.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        // عند إرسال classIds نستبدل الصفوف المرتبطة بالكامل
        ...(Array.isArray(classIds)
          ? { classes: { set: classIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { classes: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل المادة" }, { status: 500 });
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

    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
    });
    if (!subject) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });
    }

    await prisma.subject.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف المادة" }, { status: 500 });
  }
}
