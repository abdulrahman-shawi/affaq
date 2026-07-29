import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: marks students whose subscription ended as "expired"
 * and notifies all admins. Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
      }
    }

    const now = new Date();

    const expiredStudents = await prisma.student.findMany({
      where: {
        status: "active",
        subEndDate: { lt: now },
      },
      include: { user: true },
    });

    if (expiredStudents.length === 0) {
      return NextResponse.json({ expired: 0, notified: 0 });
    }

    await prisma.student.updateMany({
      where: { id: { in: expiredStudents.map((s) => s.id) } },
      data: { status: "expired" },
    });

    const admins = await prisma.user.findMany({ where: { role: "admin" } });

    await prisma.notification.createMany({
      data: admins.flatMap((admin) =>
        expiredStudents.map((student) => ({
          userId: admin.id,
          title: "انتهاء اشتراك",
          body: `انتهى اشتراك الطالب ${student.user.name}`,
          type: "subscription",
          link: "/dashboard/admin/students",
        }))
      ),
    });

    return NextResponse.json({
      expired: expiredStudents.length,
      notified: admins.length,
    });
  } catch {
    return NextResponse.json(
      { error: "فشل في فحص الاشتراكات" },
      { status: 500 }
    );
  }
}
