import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: يحذف الحصص (Session) نهائيًا بعد مرور ساعتين على بدايتها،
 * بنفس فكرة انتهاء صلاحية روابط زوم.
 *
 * مهم: سجلات الحضور لا تُفقد — تُؤرشف أولًا في جدول AttendanceArchive
 * (لقطة كاملة: المادة، الصف، التاريخ، المعلم، الحالة، الملاحظة)، ثم تُحذف
 * سجلات الحضور والحصة داخل معاملة واحدة. الأرشفة idempotent عبر
 * @@unique([sessionId, studentId]) فإعادة التشغيل لا تُكرر سجلات.
 *
 * شغّله كل 5–10 دقائق. Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */
const SESSION_TTL_MINUTES = 2 * 60;

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
      }
    }

    const cutoff = new Date(Date.now() - SESSION_TTL_MINUTES * 60 * 1000);

    const expiredSessions = await prisma.session.findMany({
      where: { date: { lte: cutoff } },
      select: {
        id: true,
        subject: true,
        grade: true,
        date: true,
        teacherId: true,
        attendance: { select: { studentId: true, status: true, note: true } },
      },
    });

    if (expiredSessions.length === 0) {
      return NextResponse.json({
        deletedSessions: 0,
        deletedAttendance: 0,
        archived: 0,
      });
    }

    const sessionIds = expiredSessions.map((s) => s.id);
    const archives = expiredSessions.flatMap((s) =>
      s.attendance.map((a) => ({
        sessionId: s.id,
        studentId: a.studentId,
        subject: s.subject,
        grade: s.grade,
        date: s.date,
        teacherId: s.teacherId,
        status: a.status,
        note: a.note,
      }))
    );

    let archived = 0;
    let deletedAttendance = 0;
    let deletedSessions = 0;

    if (archives.length > 0) {
      // الأرشفة أولًا داخل نفس المعاملة — أي فشل لاحق يلغي الحذف كله
      const [a, att, sess] = await prisma.$transaction([
        prisma.attendanceArchive.createMany({
          data: archives,
          skipDuplicates: true,
        }),
        prisma.attendance.deleteMany({
          where: { sessionId: { in: sessionIds } },
        }),
        prisma.session.deleteMany({ where: { id: { in: sessionIds } } }),
      ]);
      archived = a.count;
      deletedAttendance = att.count;
      deletedSessions = sess.count;
    } else {
      const [att, sess] = await prisma.$transaction([
        prisma.attendance.deleteMany({
          where: { sessionId: { in: sessionIds } },
        }),
        prisma.session.deleteMany({ where: { id: { in: sessionIds } } }),
      ]);
      deletedAttendance = att.count;
      deletedSessions = sess.count;
    }

    return NextResponse.json({ deletedSessions, deletedAttendance, archived });
  } catch {
    return NextResponse.json(
      { error: "فشل في حذف الحصص المنتهية" },
      { status: 500 }
    );
  }
}
