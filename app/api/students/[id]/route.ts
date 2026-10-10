import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminAreaRole } from "@/app/lib/roles";
import { getSupervisorClassIds } from "@/app/lib/supervisorScope";
import { isPhoneTaken } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!isAdminAreaRole(sessionUser?.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const scoped = await getSupervisorClassIds(sessionUser);

    const student = await prisma.student.findUnique({
      where: { id: params.id },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    // المشرف يدير طلاب صفوفه فقط
    if (scoped && (!student.classId || !scoped.includes(student.classId))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
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
      currency,
      paymentStatus,
      paidAmount,
      paymentMethod,
      status,
    } = body;

    if (!name && status === undefined) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (status !== undefined && !["active", "expired", "suspended"].includes(status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    // تعديل سريع للحالة فقط (من الجدول) — دون المساس بباقي البيانات
    if (!name) {
      const updated = await prisma.student.update({
        where: { id: params.id },
        data: { status },
        include: { user: true, parent: { include: { user: true } }, class: true },
      });
      return NextResponse.json(updated);
    }

    if (classId) {
      const classExists = await prisma.classLevel.findUnique({
        where: { id: classId },
      });
      if (!classExists) {
        return NextResponse.json({ error: "الصف غير موجود" }, { status: 400 });
      }
    }

    // المشرف لا يستطيع نقل الطالب إلى صف خارج نطاقه
    if (scoped && classId && !scoped.includes(classId)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
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

    // تسجيل دفعة جديدة عند التعديل (اختياري) — تُنشأ سجلًا في جدول المدفوعات
    const wantsPayment =
      paymentStatus === "paid" || paymentStatus === "partial";
    const fee = monthlyFee ? Number(monthlyFee) : student.monthlyFee;
    if (wantsPayment) {
      const amount = paymentStatus === "paid" && fee ? fee : Number(paidAmount);
      if (!(amount > 0)) {
        return NextResponse.json(
          { error: "أدخل المبلغ المدفوع" },
          { status: 400 }
        );
      }
    }

    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const [updated] = await prisma.$transaction([
      prisma.student.update({
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
        currency: ["SYP", "USD", "SAR", "AED"].includes(currency) ? currency : null,
        user: {
          update: {
            name,
            email: email || null,
            phone: phone || null,
            ...(hashed ? { password: hashed } : {}),
          },
        },
      },
      include: { user: true, parent: { include: { user: true } }, class: true },
      }),
      ...(wantsPayment
        ? [
            prisma.payment.create({
              data: {
                studentId: student.id,
                amount:
                  paymentStatus === "paid" && fee ? fee : Number(paidAmount),
                dueAmount: fee,
                method: paymentMethod === "cash" ? "cash" : "bank",
                period: "monthly",
                months: 1,
                note:
                  paymentStatus === "paid"
                    ? "دفعة مسجلة عند تعديل بيانات الطالب"
                    : "دفعة جزئية عند تعديل بيانات الطالب",
              },
            }),
          ]
        : []),
    ]);

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
    if (!isAdminAreaRole(sessionUser?.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const scoped = await getSupervisorClassIds(sessionUser);

    const student = await prisma.student.findUnique({
      where: { id: params.id },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    // المشرف يحذف طلاب صفوفه فقط
    if (scoped && (!student.classId || !scoped.includes(student.classId))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
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
