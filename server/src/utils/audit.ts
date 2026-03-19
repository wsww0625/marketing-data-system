import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAudit(userId: number, action: string, detail: string) {
  await prisma.auditLog.create({
    data: { userId, action, detail },
  });
}
