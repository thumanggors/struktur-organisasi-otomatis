import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists, skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN" },
  });
  console.log(`Created admin user: ${email} / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
