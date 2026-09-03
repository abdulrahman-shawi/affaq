import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isPhoneTaken } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const parents = await prisma.parent.findMany({
      include: {
        user: true,
        children: { include: { user: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json(parents);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل أولياء الأمور" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, phones } = body;

    if (!name) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // أرقام إضافية لولي الأمر — يُحتفظ بالقيم غير الفارغة فقط
    const extraPhones: string[] = Array.isArray(phones)
      ? phones.filter((p): p is string => typeof p === "string" && p.trim() !== "")
      : [];

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
    const parent = await prisma.parent.create({
      data: {
        phones: extraPhones,
        user: {
          create: {
            name,
            email: email || null,
            phone: phone || null,
            password: hashed,
            role: "parent",
          },
        },
      },
      include: { user: true },
    });

    return NextResponse.json(parent, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة ولي الأمر" }, { status: 500 });
  }
}
