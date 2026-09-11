import { prisma } from "@/app/lib/prisma";

export interface TargetUser {
  id: string;
  name: string;
  role: string;
  detail: string | null;
}

export interface MessageTargets {
  canSendToAll: boolean;
  classes: { id: string; name: string }[];
  users: TargetUser[];
}

const EMPTY_TARGETS: MessageTargets = {
  canSendToAll: false,
  classes: [],
  users: [],
};

function dedupeUsers(users: TargetUser[]): TargetUser[] {
  const seen = new Set<string>();
  return users.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

/**
 * يحدد الجهات المسموح للمستخدم إرسال الرسائل إليها حسب دوره:
 * - admin: الجميع، أي صف، أي معلم/طالب/ولي أمر
 * - supervisor: صفوفه وطلابها وأولياء أمورهم ومعلموها فقط
 * - teacher: صفوفه وطلاب صفوفه وأولياء أمورهم فقط
 * - student: صفه ومعلمو صفه فقط
 * - parent: الإدارة ومعلمو صفوف أبنائه فقط
 * إضافةً لذلك (لغير الإدمن): أي مستخدم تربطه به محادثة فردية قائمة
 * يصبح هدفاً مسموحاً حتى ينجح الرد داخل المحادثات.
 */
async function withDirectContacts(
  base: MessageTargets,
  userId: string
): Promise<MessageTargets> {
  const directMessages = await prisma.message.findMany({
    where: {
      toAll: false,
      classes: { none: {} },
      OR: [{ senderId: userId }, { recipients: { some: { userId } } }],
    },
    select: {
      sender: { select: { id: true, name: true, role: true } },
      recipients: {
        select: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  const contacts: TargetUser[] = directMessages.flatMap((m) => [
    { ...m.sender, detail: null },
    ...m.recipients.map((r) => ({ ...r.user, detail: null })),
  ]);
  return {
    ...base,
    users: dedupeUsers([...base.users, ...contacts]).filter(
      (u) => u.id !== userId
    ),
  };
}
export async function getAllowedTargets(
  userId: string,
  role: string
): Promise<MessageTargets> {
  if (role === "admin") {
    const [classes, users] = await Promise.all([
      prisma.classLevel.findMany({
        orderBy: { order: "asc" },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { role: { in: ["teacher", "student", "parent"] } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          teacher: { select: { classes: { select: { name: true } } } },
          student: { select: { class: { select: { name: true } } } },
          parent: {
            select: {
              children: { select: { user: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    return {
      canSendToAll: true,
      classes,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        detail:
          u.role === "teacher"
            ? u.teacher?.classes.map((c) => c.name).join("، ") || null
            : u.role === "student"
              ? u.student?.class?.name ?? null
              : u.parent
                ? u.parent.children.map((c) => c.user.name).join("، ") || null
                : null,
      })),
    };
  }

  if (role === "supervisor") {
    const supervisor = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        supervisedClasses: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            students: {
              select: {
                user: { select: { id: true, name: true } },
                parent: {
                  select: { user: { select: { id: true, name: true } } },
                },
              },
            },
            teachers: {
              select: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!supervisor) return EMPTY_TARGETS;

    return withDirectContacts(
      {
        canSendToAll: false,
        classes: supervisor.supervisedClasses.map((c) => ({
          id: c.id,
          name: c.name,
        })),
        users: dedupeUsers(
          supervisor.supervisedClasses.flatMap((c) => [
            ...c.students.map((s) => ({
              id: s.user.id,
              name: s.user.name,
              role: "student",
              detail: c.name,
            })),
            ...c.students
              .filter((s) => s.parent)
              .map((s) => ({
                id: s.parent!.user.id,
                name: s.parent!.user.name,
                role: "parent",
                detail: `ولي أمر ${s.user.name}`,
              })),
            ...c.teachers.map((t) => ({
              id: t.user.id,
              name: t.user.name,
              role: "teacher",
              detail: c.name,
            })),
          ])
        ),
      },
      userId
    );
  }

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      select: {
        classes: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            students: {
              select: {
                user: { select: { id: true, name: true } },
                parent: {
                  select: { user: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!teacher) return EMPTY_TARGETS;

    return withDirectContacts(
      {
        canSendToAll: false,
        classes: teacher.classes.map((c) => ({ id: c.id, name: c.name })),
        users: dedupeUsers(
          teacher.classes.flatMap((c) => [
            ...c.students.map((s) => ({
              id: s.user.id,
              name: s.user.name,
              role: "student",
              detail: c.name,
            })),
            ...c.students
              .filter((s) => s.parent)
              .map((s) => ({
                id: s.parent!.user.id,
                name: s.parent!.user.name,
                role: "parent",
                detail: `ولي أمر ${s.user.name} (${c.name})`,
              })),
          ])
        ),
      },
      userId
    );
  }

  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            teachers: { select: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (!student?.class) return EMPTY_TARGETS;

    return withDirectContacts(
      {
        canSendToAll: false,
        classes: [{ id: student.class.id, name: student.class.name }],
        users: dedupeUsers(
          student.class.teachers.map((t) => ({
            id: t.user.id,
            name: t.user.name,
            role: "teacher",
            detail: null,
          }))
        ),
      },
      userId
    );
  }

  if (role === "parent") {
    const [parent, admins] = await Promise.all([
      prisma.parent.findUnique({
        where: { userId },
        select: {
          children: {
            select: {
              class: {
                select: {
                  name: true,
                  teachers: {
                    select: { user: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: "admin" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const teachers =
      parent?.children.flatMap(
        (child) =>
          child.class?.teachers.map((t) => ({
            id: t.user.id,
            name: t.user.name,
            role: "teacher",
            detail: child.class?.name ?? null,
          })) ?? []
      ) ?? [];

    return withDirectContacts(
      {
        canSendToAll: false,
        classes: [],
        users: dedupeUsers([
          ...admins.map((a) => ({
            id: a.id,
            name: a.name,
            role: "admin",
            detail: null,
          })),
          ...teachers,
        ]),
      },
      userId
    );
  }

  return EMPTY_TARGETS;
}
