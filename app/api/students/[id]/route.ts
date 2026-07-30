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

    const student = await prisma.student.findUnique({
      where: { id: params.id },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, password, grade, subEndDate } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const gradeNum = Number(grade);
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 8) {
      return NextResponse.json(
        { error: "الصف يجب أن يكون بين 1 و 8" },
        { status: 400 }
      );
    }

    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== student.userId) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const updated = await prisma.student.update({
      where: { id: params.id },
      data: {
        grade: gradeNum,
        subEndDate: subEndDate ? new Date(subEndDate) : null,
        user: {
          update: {
            name,
            email,
            phone: phone || null,
            ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
          },
        },
      },
      include: { user: true, parent: { include: { user: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل الطالب" }, { status: 500 });
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

    const student = await prisma.student.findUnique({
      where: { id: params.id },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { studentId: params.id } }),
      prisma.attendance.deleteMany({ where: { studentId: params.id } }),
      prisma.submission.deleteMany({ where: { studentId: params.id } }),
      prisma.grade.deleteMany({ where: { studentId: params.id } }),
      prisma.message.deleteMany({ where: { studentId: params.id } }),
      prisma.notification.deleteMany({ where: { userId: student.userId } }),
      prisma.student.delete({ where: { id: params.id } }),
      prisma.user.delete({ where: { id: student.userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف الطالب" }, { status: 500 });
  }
}
