import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { parsePhoneFile } from '../utils/csv.js';
import { isValidPhone } from '../utils/phone.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const dataMatchRouter = router({
  process: adminProcedure
    .input(z.object({
      filePath: z.string(),
      fileName: z.string(),
      targetSpaceId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.dataMatchTask.create({
        data: {
          fileName: input.fileName,
          targetSpaceId: input.targetSpaceId,
          userId: ctx.user.userId,
          status: 'processing',
        },
      });

      // Process async
      processMatch(task.id, input.filePath, input.targetSpaceId, ctx.user.userId).catch(console.error);

      return { taskId: task.id };
    }),

  history: protectedProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(20) }))
    .query(async ({ input }) => {
      const [items, total] = await Promise.all([
        prisma.dataMatchTask.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: { user: { select: { username: true } } },
        }),
        prisma.dataMatchTask.count(),
      ]);
      return { items, total };
    }),

  progress: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      return prisma.dataMatchTask.findUnique({ where: { id: input.taskId } });
    }),
});

async function processMatch(taskId: number, filePath: string, targetSpaceId: number | null, userId: number) {
  try {
    const phones = parsePhoneFile(filePath);
    const validPhones = [...new Set(phones.filter(isValidPhone))]; // deduplicate

    let uniqueMatch = 0;
    let dupMatch = 0;

    for (const phone of validPhones) {
      const uniqueWhere: any = { phone };
      if (targetSpaceId) uniqueWhere.spaceId = targetSpaceId;

      const inUnique = await prisma.phoneNumber.findFirst({ where: uniqueWhere });
      if (inUnique) {
        uniqueMatch++;
        continue;
      }

      const dupWhere: any = { phone };
      if (targetSpaceId) dupWhere.spaceId = targetSpaceId;
      const inDup = await prisma.duplicateNumber.findFirst({ where: dupWhere });
      if (inDup) dupMatch++;
    }

    const total = validPhones.length;
    const matchRate = total > 0 ? ((uniqueMatch + dupMatch) / total * 100) : 0;

    await prisma.dataMatchTask.update({
      where: { id: taskId },
      data: {
        total,
        uniqueMatch,
        dupMatch,
        matchRate,
        status: 'completed',
      },
    });

    await logAudit(userId, 'dataMatch.complete',
      `数据查重完成: 任务${taskId}, 匹配率${matchRate.toFixed(1)}%`);
  } catch (error) {
    console.error('Data match failed:', error);
    await prisma.dataMatchTask.update({
      where: { id: taskId },
      data: { status: 'failed' },
    });
  }
}
