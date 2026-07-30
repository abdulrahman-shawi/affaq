import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    const parent = await prisma.parent.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "ولي الأمر غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== parent.userId) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const updated = await prisma.parent.update({
      where: { id: params.id },
      data: {
        user: {
          update: {
            name,
            email,
            phone: phone || null,
            ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
          },
        },
      },
      include: { user: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل ولي الأمر" }, { status: 500 });
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

    const parent = await prisma.parent.findUnique({
      where: { id: params.id },
      include: { children: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "ولي الأمر غير موجود" }, { status: 404 });
    }

    if (parent.children.length > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف ولي أمر لديه أبناء مرتبطون" },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: parent.userId } }),
      prisma.parent.delete({ where: { id: params.id } }),
      prisma.user.delete({ where: { id: parent.userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف ولي الأمر" }, { status: 500 });
  }
}
