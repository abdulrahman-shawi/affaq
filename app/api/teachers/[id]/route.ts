import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isPhoneTaken } from "@/app/lib/phone";

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

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
    });
    if (!teacher) {
      return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, password, subjectIds, classIds } = body;

    const hasProfileUpdate =
      name !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      password !== undefined;

    if (hasProfileUpdate) {
      if (!name || !email) {
        return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
      }

      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== teacher.userId) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم مسبقًا" },
          { status: 409 }
        );
      }

      if (phone && (await isPhoneTaken(phone, teacher.userId))) {
        return NextResponse.json(
          { error: "رقم الهاتف مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.teacher.update({
      where: { id: params.id },
      data: {
        ...(Array.isArray(subjectIds)
          ? { subjects: { set: subjectIds.map((id: string) => ({ id })) } }
          : {}),
        ...(Array.isArray(classIds)
          ? { classes: { set: classIds.map((id: string) => ({ id })) } }
          : {}),
        ...(hasProfileUpdate
          ? {
              user: {
                update: {
                  name,
                  email,
                  phone: phone || null,
                  ...(password
                    ? { password: await bcrypt.hash(password, 10) }
                    : {}),
                },
              },
            }
          : {}),
      },
      include: { user: true, subjects: true, classes: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل المعلم" }, { status: 500 });
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

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
    });
    if (!teacher) {
      return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.message.deleteMany({
        where: {
          OR: [
            { teacherId: params.id },
            { session: { teacherId: params.id } },
          ],
        },
      }),
      prisma.attendance.deleteMany({
        where: { session: { teacherId: params.id } },
      }),
      prisma.session.deleteMany({ where: { teacherId: params.id } }),
      prisma.notification.deleteMany({ where: { userId: teacher.userId } }),
      prisma.teacher.delete({ where: { id: params.id } }),
      prisma.user.delete({ where: { id: teacher.userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف المعلم" }, { status: 500 });
  }
}
