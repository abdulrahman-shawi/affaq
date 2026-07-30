import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isPhoneTaken } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json(teachers);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل المعلمين" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, subjects, grades } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    if (phone && (await isPhoneTaken(phone))) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password || "123456", 10);
    const teacher = await prisma.teacher.create({
      data: {
        subjects: Array.isArray(subjects) ? subjects : [],
        grades: Array.isArray(grades) ? grades.map(Number) : [],
        user: {
          create: {
            name,
            email,
            phone: phone || null,
            password: hashed,
            role: "teacher",
          },
        },
      },
      include: { user: true },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة المعلم" }, { status: 500 });
  }
}
