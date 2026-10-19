import { prisma } from "@/app/lib/prisma";

type NotificationInput = {
  title: string;
  body: string;
  type: string;
  link?: string;
};

// إشعار مستخدم واحد
export async function notifyUser(userId: string, n: NotificationInput) {
  await prisma.notification.create({
    data: { userId, title: n.title, body: n.body, type: n.type, link: n.link },
  });
}

// إشعار طلاب صف معيّن (grade = ClassLevel.order) وأولياء أمورهم
export async function notifyGradeStudentsAndParents(
  grade: number,
  n: NotificationInput & { parentLink?: string }
) {
  const students = await prisma.student.findMany({
    where: { status: "active", class: { order: grade } },
    select: { userId: true, parent: { select: { userId: true } } },
  });

  const data = students.flatMap((s) => [
    {
      userId: s.userId,
      title: n.title,
      body: n.body,
      type: n.type,
      link: n.link,
    },
    ...(s.parent
      ? [
          {
            userId: s.parent.userId,
            title: n.title,
            body: n.body,
            type: n.type,
            link: n.parentLink ?? n.link,
          },
        ]
      : []),
  ]);

  if (data.length > 0) {
    await prisma.notification.createMany({ data });
  }
}
