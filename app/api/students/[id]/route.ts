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

    const student = await prisma.student.findUnique({
      where: { id: params.id },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      classId,
      subEndDate,
      monthlyFee,
      address,
      birthDate,
      regGoal,
      fatherName,
      motherName,
      guardianPhones,
      shift,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (classId) {
      const classExists = await prisma.classLevel.findUnique({
        where: { id: classId },
      });
      if (!classExists) {
        return NextResponse.json({ error: "الصف غير موجود" }, { status: 400 });
      }
    }

    if (email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== student.userId) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    if (phone && (await isPhoneTaken(phone, student.userId))) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const updated = await prisma.student.update({
      where: { id: params.id },
      data: {
        class: classId ? { connect: { id: classId } } : { disconnect: true },
        subEndDate: subEndDate ? new Date(subEndDate) : null,
        monthlyFee: monthlyFee ? Number(monthlyFee) : null,
        address: address || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        regGoal: regGoal || null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        guardianPhones: Array.isArray(guardianPhones)
          ? guardianPhones.filter((p): p is string => typeof p === "string" && p.trim() !== "")
          : [],
        shift: shift === "morning" || shift === "evening" ? shift : null,
        user: {
          update: {
            name,
            email: email || null,
            phone: phone || null,
            ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
          },
        },
      },
      include: { user: true, parent: { include: { user: true } }, class: true },
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
      prisma.notification.deleteMany({ where: { userId: student.userId } }),
      prisma.student.delete({ where: { id: params.id } }),
      prisma.user.delete({ where: { id: student.userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف الطالب" }, { status: 500 });
  }
}
