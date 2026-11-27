/**
 * تعيين plainPassword = 123456 لحسابات الطلاب الموجودة (التي لا تملك قيمة بعد).
 * التشغيل: npx tsx scripts/backfill-plain-passwords.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: "student", plainPassword: null },
    data: { plainPassword: "123456" },
  });
  const students = await prisma.user.count({ where: { role: "student" } });
  const withPw = await prisma.user.count({
    where: { role: "student", plainPassword: { not: null } },
  });
  console.log(`updated: ${result.count}`);
  console.log(`students: ${students}, with plainPassword: ${withPw}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
