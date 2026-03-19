import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const spacesRouter = router({
  list: protectedProcedure.query(async () => {
    return prisma.space.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { phoneNumbers: true, channels: true } } },
    });
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const space = await prisma.space.create({ data: input });
      await logAudit(ctx.user.userId, 'space.create', `创建空间库: ${space.name}`);
      return space;
    }),

  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const space = await prisma.space.update({ where: { id }, data });
      await logAudit(ctx.user.userId, 'space.update', `更新空间库: ${space.name}`);
      return space;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const space = await prisma.space.findUnique({ where: { id: input.id } });
      await prisma.space.delete({ where: { id: input.id } });
      await logAudit(ctx.user.userId, 'space.delete', `删除空间库: ${space?.name}`);
      return { success: true };
    }),

  setPrimary: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Clear existing primary
      await prisma.space.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } });
      const space = await prisma.space.update({ where: { id: input.id }, data: { isPrimary: true } });
      await logAudit(ctx.user.userId, 'space.setPrimary', `设置主库: ${space.name}`);
      return space;
    }),

  clearPrimary: adminProcedure.mutation(async ({ ctx }) => {
    await prisma.space.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } });
    await logAudit(ctx.user.userId, 'space.clearPrimary', '取消主库设置');
    return { success: true };
  }),
});
