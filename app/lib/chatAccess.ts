import { prisma } from "@/app/lib/prisma";

export { chatChannelName } from "@/app/lib/chatChannel";

export type ChatRoomDescriptor = {
  classId: string;
  className: string;
  teacherId: string | null;
  teacherName: string | null;
};

// صلاحية الوصول لدردشة الصفوف:
// طالب → صفه فقط، معلم → صفوفه، مدير → كل الصفوف، مشرف → الصفوف التي يشرف عليها
export async function getChatClassIds(
  userId: string,
  role: string
): Promise<string[]> {
  if (role === "admin") {
    const classes = await prisma.classLevel.findMany({ select: { id: true } });
    return classes.map((c) => c.id);
  }
  if (role === "supervisor") {
    const supervisor = await prisma.user.findUnique({
      where: { id: userId },
      select: { supervisedClasses: { select: { id: true } } },
    });
    return supervisor?.supervisedClasses.map((c) => c.id) ?? [];
  }
  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      select: { classes: { select: { id: true } } },
    });
    return teacher?.classes.map((c) => c.id) ?? [];
  }
  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { classId: true },
    });
    return student?.classId ? [student.classId] : [];
  }
  return [];
}

export async function getChatRoomsForUser(
  userId: string,
  role: string,
  classId?: string | null,
  teacherId?: string | null
): Promise<ChatRoomDescriptor[]> {
  const allowedClasses = await getChatClassIds(userId, role);
  const selectedClassIds = classId
    ? allowedClasses.filter((id) => id === classId)
    : allowedClasses;

  if (selectedClassIds.length === 0) return [];

  let targetTeacherId: string | null = teacherId ?? null;
  if (role === "teacher" && !targetTeacherId) {
    const me = await prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    });
    targetTeacherId = me?.id ?? null;
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      ...(targetTeacherId ? { id: targetTeacherId } : {}),
      classes: { some: { id: { in: selectedClassIds } } },
    },
    select: {
      id: true,
      user: { select: { name: true } },
      classes: {
        where: { id: { in: selectedClassIds } },
        select: { id: true, name: true },
      },
    },
  });

  return teachers.flatMap((teacher) =>
    teacher.classes.map((c) => ({
      classId: c.id,
      className: c.name,
      teacherId: teacher.id,
      teacherName: teacher.user.name,
    }))
  );
}

export async function canAccessClassChat(
  userId: string,
  role: string,
  classId: string,
  teacherId?: string | null
): Promise<boolean> {
  const rooms = await getChatRoomsForUser(userId, role, classId, teacherId);
  return rooms.some((room) => room.classId === classId && (!teacherId || room.teacherId === teacherId));
}
