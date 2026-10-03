import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, email: true, image: true, phone: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, image, currentPassword, newPassword } = body;

    const current = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { name: true, role: true },
    });
    if (!current) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // الطلاب وأولياء الأمور لا يمكنهم تغيير أسمائهم
    const restrictedRole =
      current.role === "student" || current.role === "parent";
    const finalName = restrictedRole ? current.name : name;

    if (!finalName) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    if (phone) {
      const phoneOwner = await prisma.user.findUnique({ where: { phone } });
      if (phoneOwner && phoneOwner.id !== sessionUser.id) {
        return NextResponse.json(
          { error: "رقم الهاتف مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    if (email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== sessionUser.id) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    // تغيير كلمة المرور يتطلب التحقق من كلمة المرور الحالية
    let hashedPassword: string | undefined;
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف" },
          { status: 400 }
        );
      }
      const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { password: true },
      });
      if (!user) {
        return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
      }
      const valid =
        currentPassword && (await bcrypt.compare(currentPassword, user.password));
      if (!valid) {
        return NextResponse.json(
          { error: "كلمة المرور الحالية غير صحيحة" },
          { status: 400 }
        );
      }
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name: finalName,
        email: email || null,
        phone: phone || null,
        image: image || null,
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
      select: { id: true, name: true, email: true, image: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في حفظ البيانات" }, { status: 500 });
  }
}
