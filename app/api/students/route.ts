import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminAreaRole } from "@/app/lib/roles";
import { getSupervisorClassIds } from "@/app/lib/supervisorScope";
import { getTeacherClassIds } from "@/app/lib/teacherScope";
import { isPhoneTaken } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    // المشرف يُحصر بصفوف الإشراف، والمعلم بصفوفه
    const scoped =
      (await getSupervisorClassIds(sessionUser)) ??
      (await getTeacherClassIds(sessionUser));

    const students = await prisma.student.findMany({
      where: scoped ? { classId: { in: scoped } } : undefined,
      include: { user: true, parent: { include: { user: true } }, class: true },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json(students);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الطلاب" }, { status: 500 });
  }
}

// إضافة طالب — ينشئ حساب user بدور student وسجل student مرتبطًا به
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!isAdminAreaRole(sessionUser?.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const scoped = await getSupervisorClassIds(sessionUser);

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
    } = body;

    // المشرف يضيف طلابًا في صفوفه فقط
    if (scoped && (!classId || !scoped.includes(classId))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (!name) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const fee = monthlyFee ? Number(monthlyFee) : null;
    if (
      (paymentStatus === "paid" || paymentStatus === "partial") &&
      (!fee || fee <= 0)
    ) {
      return NextResponse.json(
        { error: "يجب إدخال رسم الاشتراك الشهري عند تسجيل دفعة" },
        { status: 400 }
      );
    }
    if (
      paymentStatus === "partial" &&
      (!paidAmount || Number(paidAmount) <= 0)
    ) {
      return NextResponse.json(
        { error: "يجب إدخال المبلغ المدفوع عند الدفع الجزئي" },
        { status: 400 }
      );
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
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    if (phone && (await isPhoneTaken(phone))) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password || "123456", 10);

    // أرقام هواتف ولي الأمر — يُحتفظ بالقيم غير الفارغة فقط
    const guardianPhoneList: string[] = Array.isArray(guardianPhones)
      ? guardianPhones.filter((p): p is string => typeof p === "string" && p.trim() !== "")
      : [];

    // ربط ولي أمر موجود بنفس الرقم أو اسم الأب، أو إنشاء حساب جديد له تلقائيًا
    let parentId: string | null = null;
    const parentName = (fatherName || motherName || "").trim() || null;
    if (parentName || guardianPhoneList.length) {
      const byPhone = guardianPhoneList.length
        ? await prisma.parent.findFirst({
            where: {
              OR: [
                { user: { phone: { in: guardianPhoneList } } },
                { phones: { hasSome: guardianPhoneList } },
              ],
            },
          })
        : null;
      const existing =
        byPhone ??
        (fatherName?.trim()
          ? await prisma.parent.findFirst({
              where: { user: { name: fatherName.trim() } },
            })
          : null);

      if (existing) {
        parentId = existing.id;
      } else if (parentName) {
        // الرقم الأساسي يُسند فقط إذا لم يكن مستخدمًا لمستخدم آخر
        const primaryPhone = guardianPhoneList[0] ?? null;
        const primaryFree = primaryPhone && !(await isPhoneTaken(primaryPhone));
        const parent = await prisma.parent.create({
          data: {
            phones: primaryFree ? guardianPhoneList.slice(1) : guardianPhoneList,
            user: {
              create: {
                name: parentName,
                phone: primaryFree ? primaryPhone : null,
                password: hashed,
                role: "parent",
              },
            },
          },
        });
        parentId = parent.id;
      }
    }

    // عند الدفع (كلي أو جزئي) تُنشأ دفعة أولى في جدول المدفوعات
    const payment =
      paymentStatus === "paid"
        ? {
            amount: fee!,
            dueAmount: fee,
            method: paymentMethod === "cash" ? "cash" : "bank",
            period: "monthly",
            months: 1,
            note: "الدفعة الأولى عند التسجيل",
          }
        : paymentStatus === "partial"
          ? {
              amount: Number(paidAmount),
              dueAmount: fee,
              method: paymentMethod === "cash" ? "cash" : "bank",
              period: "monthly",
              months: 1,
              note: "دفعة جزئية عند التسجيل",
            }
          : null;

    const student = await prisma.student.create({
      data: {
        class: classId ? { connect: { id: classId } } : undefined,
        parent: parentId ? { connect: { id: parentId } } : undefined,
        subEndDate: subEndDate ? new Date(subEndDate) : null,
        monthlyFee: fee,
        address: address || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        regGoal: regGoal || null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        guardianPhones: guardianPhoneList,
        shift: shift === "morning" || shift === "evening" ? shift : null,
        currency: ["SYP", "USD", "SAR", "AED"].includes(currency) ? currency : null,
        user: {
          create: {
            name,
            email: email || null,
            phone: phone || null,
            password: hashed,
            role: "student",
          },
        },
        payments: payment ? { create: payment } : undefined,
      },
      include: { user: true, parent: { include: { user: true } }, class: true },
    });

    return NextResponse.json(student, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة الطالب" }, { status: 500 });
  }
}
