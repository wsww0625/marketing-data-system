import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, router } from '../trpc.js';

const prisma = new PrismaClient();

export const sendRecordsRouter = router({
  list: protectedProcedure
    .input(z.object({
      phone: z.string().optional(),
      spaceId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.phone) where.phone = input.phone;
      if (input.spaceId) where.spaceId = input.spaceId;

      const [items, total] = await Promise.all([
        prisma.sendRecord.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            space: { select: { name: true } },
            batch: { select: { fileName: true } },
          },
        }),
        prisma.sendRecord.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
});
