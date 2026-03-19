import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const batchesRouter = router({
  list: protectedProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where = input.spaceId ? { spaceId: input.spaceId } : {};
      const [items, total] = await Promise.all([
        prisma.exportBatch.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            space: { select: { name: true } },
            user: { select: { username: true } },
          },
        }),
        prisma.exportBatch.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Revert cooling for a batch
  revertCooling: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const batch = await prisma.exportBatch.findUnique({ where: { id: input.batchId } });
      if (!batch) throw new Error('批次不存在');
      if (!batch.isCoolExport) throw new Error('非冷却导出批次');
      if (batch.coolReverted) throw new Error('已解除冷却');

      // Reset cooling for all phones in this export batch
      await prisma.phoneNumber.updateMany({
        where: { coolBatchId: input.batchId },
        data: { isCooled: false, cooledAt: null, coolBatchId: null },
      });

      await prisma.exportBatch.update({
        where: { id: input.batchId },
        data: { coolReverted: true },
      });

      await logAudit(ctx.user.userId, 'batch.revertCooling', `解除冷却: 批次${input.batchId}`);
      return { success: true };
    }),
});
