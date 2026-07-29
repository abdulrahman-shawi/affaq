import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, grade, parentId } = body;

    if (!name || !email || !grade) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password || "123456", 10);
    const student = await prisma.student.create({
      data: {
        grade: Number(grade),
        parentId: parentId || null,
        user: {
          create: {
            name,
            email,
            phone: phone || null,
            password: hashed,
            role: "student",
          },
        },
      },
      include: { user: true },
    });

    return NextResponse.json(student, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة الطالب" }, { status: 500 });
  }
}
