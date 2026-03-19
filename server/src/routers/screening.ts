import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';
import { parseScreeningFile } from '../utils/csv.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const screeningRouter = router({
  process: adminProcedure
    .input(z.object({
      filePath: z.string(),
      fileName: z.string(),
      spaceId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const batch = await prisma.screeningBatch.create({
        data: {
          fileName: input.fileName,
          spaceId: input.spaceId,
          userId: ctx.user.userId,
          status: 'processing',
        },
      });

      const records = parseScreeningFile(input.filePath);
      let updatedCount = 0;

      for (const { phone, activityDays } of records) {
        // Check if activity level changed (for cooling reset)
        const existing = await prisma.phoneNumber.findUnique({
          where: { phone_spaceId: { phone, spaceId: input.spaceId } },
        });

        if (existing) {
          const oldLevel = getLevel(existing.activityDays);
          const newLevel = getLevel(activityDays);
          const levelChanged = oldLevel !== newLevel;

          await prisma.phoneNumber.update({
            where: { phone_spaceId: { phone, spaceId: input.spaceId } },
            data: {
              activityDays,
              screenedAt: new Date(),
              // If level changed, reset cooling
              ...(levelChanged ? { isCooled: false, cooledAt: null, coolBatchId: null } : {}),
            },
          });
          updatedCount++;
        }
      }

      await prisma.screeningBatch.update({
        where: { id: batch.id },
        data: { total: records.length, updatedCount, status: 'completed' },
      });

      await logAudit(ctx.user.userId, 'screening.complete',
        `筛选完成: ${input.fileName}, 更新:${updatedCount}/${records.length}`);

      return { batchId: batch.id, total: records.length, updatedCount };
    }),

  history: adminProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where = input.spaceId ? { spaceId: input.spaceId } : {};
      const [items, total] = await Promise.all([
        prisma.screeningBatch.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            space: { select: { name: true } },
            user: { select: { username: true } },
          },
        }),
        prisma.screeningBatch.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  revert: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const batch = await prisma.screeningBatch.findUnique({ where: { id: input.batchId } });
      if (!batch) throw new Error('批次不存在');
      if (batch.status === 'reverted') throw new Error('批次已回退');

      // Reset screened_at for phones in this batch's space that were screened after batch creation
      await prisma.phoneNumber.updateMany({
        where: {
          spaceId: batch.spaceId,
          screenedAt: { gte: batch.createdAt },
        },
        data: { activityDays: null, screenedAt: null },
      });

      await prisma.screeningBatch.update({
        where: { id: input.batchId },
        data: { status: 'reverted', revertedAt: new Date() },
      });

      await logAudit(ctx.user.userId, 'screening.revert', `回退筛选批次: ${batch.fileName}`);
      return { success: true };
    }),
});

function getLevel(days: number | null): string {
  if (days === null) return 'none';
  if (days <= 1) return 'very_high';
  if (days <= 3) return 'high';
  if (days <= 7) return 'medium';
  if (days <= 14) return 'low';
  if (days <= 30) return 'nearly_dormant';
  return 'dormant';
}
