import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isPhoneTaken } from "@/app/lib/phone";

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

async function findSupervisor(id: string) {
  const supervisor = await prisma.user.findFirst({
    where: { id, role: "supervisor" },
  });
  return supervisor;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supervisor = await findSupervisor(params.id);
    if (!supervisor) {
      return NextResponse.json({ error: "المشرف غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, password, classIds } = body;

    if (!name) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== supervisor.id) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    if (phone && (await isPhoneTaken(phone, supervisor.id))) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
        ...(Array.isArray(classIds)
          ? {
              supervisedClasses: {
                set: classIds.map((id: string) => ({ id })),
              },
            }
          : {}),
      },
      select: supervisorSelect,
    });

    return NextResponse.json(toDTO(updated));
  } catch {
    return NextResponse.json({ error: "فشل في تعديل المشرف" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supervisor = await findSupervisor(params.id);
    if (!supervisor) {
      return NextResponse.json({ error: "المشرف غير موجود" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: params.id } }),
      prisma.user.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف المشرف" }, { status: 500 });
  }
}
