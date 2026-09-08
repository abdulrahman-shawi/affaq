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

const supervisorSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true,
  supervisedClasses: {
    select: { id: true, name: true },
    orderBy: { order: "asc" as const },
  },
};

function toDTO<T extends { supervisedClasses: { id: string; name: string }[] }>(
  supervisor: T
) {
  const { supervisedClasses, ...rest } = supervisor;
  return { ...rest, classes: supervisedClasses };
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supervisors = await prisma.user.findMany({
      where: { role: "supervisor" },
      select: supervisorSelect,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(supervisors.map(toDTO));
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
    const { name, email, phone, password, classIds } = body;

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
        ...(Array.isArray(classIds) && classIds.length > 0
          ? {
              supervisedClasses: {
                connect: classIds.map((id: string) => ({ id })),
              },
            }
          : {}),
      },
      select: supervisorSelect,
    });

    return NextResponse.json(toDTO(supervisor), { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة المشرف" }, { status: 500 });
  }
}
