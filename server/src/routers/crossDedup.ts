import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const crossDedupRouter = router({
  // Trigger cross-space dedup scan
  scan: adminProcedure.mutation(async ({ ctx }) => {
    const primarySpace = await prisma.space.findFirst({ where: { isPrimary: true } });
    if (!primarySpace) throw new Error('请先设置主库');

    const batch = await prisma.crossDedupBatch.create({
      data: {
        primarySpaceId: primarySpace.id,
        userId: ctx.user.userId,
        status: 'scanning',
      },
    });

    // Get all other spaces
    const otherSpaces = await prisma.space.findMany({
      where: { id: { not: primarySpace.id } },
    });

    let duplicateCount = 0;

    for (const space of otherSpaces) {
      // Find phones that exist in both primary space and this space
      const duplicates = await prisma.$queryRawUnsafe<{ phone: string }[]>(`
        SELECT a.phone FROM phone_numbers a
        INNER JOIN phone_numbers b ON a.phone = b.phone
        WHERE a.space_id = ${primarySpace.id} AND b.space_id = ${space.id}
        LIMIT 50000
      `);

      for (const dup of duplicates) {
        await prisma.crossDedupRecord.create({
          data: {
            batchId: batch.id,
            phone: dup.phone,
            primarySpaceId: primarySpace.id,
            sourceSpaceId: space.id,
          },
        });
        duplicateCount++;
      }
    }

    await prisma.crossDedupBatch.update({
      where: { id: batch.id },
      data: { duplicateCount, status: 'completed' },
    });

    await logAudit(ctx.user.userId, 'crossDedup.scan', `跨库去重扫描完成: 发现${duplicateCount}条重复`);
    return { batchId: batch.id, duplicateCount };
  }),

  // List scan batches
  batches: adminProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(20) }))
    .query(async ({ input }) => {
      const [items, total] = await Promise.all([
        prisma.crossDedupBatch.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: { user: { select: { username: true } } },
        }),
        prisma.crossDedupBatch.count(),
      ]);
      return { items, total };
    }),

  // List records for a batch
  records: adminProcedure
    .input(z.object({ batchId: z.number(), page: z.number().default(1), pageSize: z.number().default(100) }))
    .query(async ({ input }) => {
      const [items, total] = await Promise.all([
        prisma.crossDedupRecord.findMany({
          where: { batchId: input.batchId },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.crossDedupRecord.count({ where: { batchId: input.batchId } }),
      ]);
      return { items, total };
    }),

  // Confirm or ignore a batch
  updateBatchStatus: adminProcedure
    .input(z.object({ batchId: z.number(), status: z.enum(['confirmed', 'ignored']) }))
    .mutation(async ({ input, ctx }) => {
      await prisma.crossDedupBatch.update({
        where: { id: input.batchId },
        data: { status: input.status },
      });
      await prisma.crossDedupRecord.updateMany({
        where: { batchId: input.batchId },
        data: { status: input.status },
      });
      await logAudit(ctx.user.userId, 'crossDedup.updateStatus',
        `跨库去重批次${input.batchId}状态更新为${input.status}`);
      return { success: true };
    }),
});
