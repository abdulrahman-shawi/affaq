import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isPhoneTaken } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// إدارة المشرفين خاصة بالأدمن وحده — المشرف نفسه لا يصل إليها
async function requireAdmin() {
  const sessionUser = await getSessionUser();
  return sessionUser?.role === "admin" ? sessionUser : null;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supervisors = await prisma.user.findMany({
      where: { role: "supervisor" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(supervisors);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل المشرفين" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
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

    const supervisor = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        password: hashed,
        role: "supervisor",
      },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    return NextResponse.json(supervisor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة المشرف" }, { status: 500 });
  }
}
