import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الإشعارات" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(notification);
  } catch {
    return NextResponse.json({ error: "فشل في تحديث الإشعار" }, { status: 500 });
  }
}
