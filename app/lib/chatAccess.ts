import { prisma } from "@/app/lib/prisma";

// صلاحية الوصول لدردشة الصفوف:
// طالب → صفه فقط، معلمة → صفوفها، مدير → كل الصفوف، مشرف → الصفوف التي يشرف عليها
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

export async function canAccessClassChat(
  userId: string,
  role: string,
  classId: string
): Promise<boolean> {
  const ids = await getChatClassIds(userId, role);
  return ids.includes(classId);
}

export function chatChannelName(classId: string): string {
  return `private-chat-class-${classId}`;
}
