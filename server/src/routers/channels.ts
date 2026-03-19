import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const channelsRouter = router({
  list: protectedProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .query(async ({ input }) => {
      const where = input.spaceId ? { spaceId: input.spaceId } : {};
      return prisma.channel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { space: { select: { id: true, name: true } }, _count: { select: { phoneNumbers: true } } },
      });
    }),

  create: adminProcedure
    .input(z.object({ spaceId: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const channel = await prisma.channel.create({ data: input });
      await logAudit(ctx.user.userId, 'channel.create', `创建渠道: ${channel.name}`);
      return channel;
    }),

  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const channel = await prisma.channel.update({ where: { id }, data });
      await logAudit(ctx.user.userId, 'channel.update', `更新渠道: ${channel.name}`);
      return channel;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const channel = await prisma.channel.findUnique({ where: { id: input.id } });
      await prisma.channel.delete({ where: { id: input.id } });
      await logAudit(ctx.user.userId, 'channel.delete', `删除渠道: ${channel?.name}`);
      return { success: true };
    }),
});
