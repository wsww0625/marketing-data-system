import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';
import { generateCsv } from '../utils/csv.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const duplicatesRouter = router({
  list: adminProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      channelId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.spaceId) where.spaceId = input.spaceId;
      if (input.channelId) where.channelId = input.channelId;

      const [items, total] = await Promise.all([
        prisma.duplicateNumber.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            space: { select: { name: true } },
            channel: { select: { name: true } },
            importBatch: { select: { fileName: true } },
          },
        }),
        prisma.duplicateNumber.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  export: adminProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const where: any = {};
      if (input.spaceId) where.spaceId = input.spaceId;

      const dups = await prisma.duplicateNumber.findMany({
        where,
        select: { phone: true },
      });

      const csv = generateCsv(dups.map(d => d.phone));
      const uploadsDir = path.resolve('uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const fileName = `duplicates_${Date.now()}.csv`;
      fs.writeFileSync(path.join(uploadsDir, fileName), csv);

      return { fileName, count: dups.length };
    }),
});
