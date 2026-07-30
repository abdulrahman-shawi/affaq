import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function generatePassword() {
  return randomBytes(4).toString("hex");
}

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: { user: true, parent: { include: { user: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json(students);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الطلاب" }, { status: 500 });
  }
}

// F-003: إضافة طالب — المدخلات: name, grade, parentPhone, parentEmail, subEndDate
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, grade, parentPhone, parentEmail, subEndDate } = body;

    if (!name || !parentPhone || !parentEmail) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // القيود: الصف من 1 إلى 8
    const gradeNum = Number(grade);
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 8) {
      return NextResponse.json(
        { error: "الصف يجب أن يكون بين 1 و 8" },
        { status: 400 }
      );
    }

    const existingParentUser = await prisma.user.findUnique({
      where: { email: parentEmail },
      include: { parent: true },
    });

    // القيود: رقم الهاتف فريد
    const phoneOwner = await prisma.user.findFirst({
      where: { phone: parentPhone },
    });
    if (phoneOwner && phoneOwner.id !== existingParentUser?.id) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    // ولي الأمر: استخدام الحساب الموجود أو إنشاء حساب جديد
    let parentId: string;
    let parentPassword: string | null = null;

    if (existingParentUser?.parent) {
      parentId = existingParentUser.parent.id;
    } else if (existingParentUser) {
      const parent = await prisma.parent.create({
        data: { userId: existingParentUser.id },
      });
      parentId = parent.id;
    } else {
      parentPassword = generatePassword();
      const parent = await prisma.parent.create({
        data: {
          user: {
            create: {
              name: `ولي أمر ${name}`,
              email: parentEmail,
              phone: parentPhone,
              password: await bcrypt.hash(parentPassword, 10),
              role: "parent",
            },
          },
        },
      });
      parentId = parent.id;
    }

    // حساب الطالب: بريد وكلمة مرور مولّدة تلقائيًا تُسلَّم للمديرة
    const studentPassword = generatePassword();
    const studentEmail = `student.${randomBytes(4).toString("hex")}@affaq.academy`;

    const student = await prisma.student.create({
      data: {
        grade: gradeNum,
        subEndDate: subEndDate ? new Date(subEndDate) : null,
        parent: { connect: { id: parentId } },
        user: {
          create: {
            name,
            email: studentEmail,
            password: await bcrypt.hash(studentPassword, 10),
            role: "student",
          },
        },
      },
      include: { user: true, parent: { include: { user: true } } },
    });

    return NextResponse.json(
      {
        student,
        credentials: {
          studentEmail,
          studentPassword,
          parentEmail,
          parentPassword, // null إذا كان حساب ولي الأمر موجودًا مسبقًا
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "فشل في إضافة الطالب" }, { status: 500 });
  }
}
