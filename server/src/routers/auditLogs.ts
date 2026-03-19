import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';

const prisma = new PrismaClient();

export const auditLogsRouter = router({
  list: adminProcedure
    .input(z.object({
      action: z.string().optional(),
      userId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.action) where.action = { contains: input.action };
      if (input.userId) where.userId = input.userId;

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: { user: { select: { username: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
});
