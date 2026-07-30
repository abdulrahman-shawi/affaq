import { prisma } from "@/app/lib/prisma";

/** يتحقق أن رقم الهاتف غير مستخدم من مستخدم آخر */
export async function isPhoneTaken(
  phone: string,
  excludeUserId?: string
): Promise<boolean> {
  const owner = await prisma.user.findUnique({ where: { phone } });
  return Boolean(owner && owner.id !== excludeUserId);
}
