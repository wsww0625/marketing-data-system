import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';
import { hashPassword } from '../auth.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const usersRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }),

  updateRole: adminProcedure
    .input(z.object({ id: z.number(), role: z.enum(['admin', 'user']) }))
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
      });
      await logAudit(ctx.user.userId, 'user.updateRole',
        `修改用户角色: ${user.username} -> ${input.role}`);
      return { id: user.id, username: user.username, role: user.role };
    }),

  create: adminProcedure
    .input(z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(['admin', 'user']).default('user'),
    }))
    .mutation(async ({ input, ctx }) => {
      const exists = await prisma.user.findUnique({ where: { username: input.username } });
      if (exists) throw new Error('用户名已存在');
      const passwordHash = await hashPassword(input.password);
      const user = await prisma.user.create({
        data: { username: input.username, passwordHash, role: input.role },
      });
      await logAudit(ctx.user.userId, 'user.create', `创建用户: ${user.username}`);
      return { id: user.id, username: user.username, role: user.role };
    }),

  resetPassword: adminProcedure
    .input(z.object({ id: z.number(), password: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const passwordHash = await hashPassword(input.password);
      const user = await prisma.user.update({
        where: { id: input.id },
        data: { passwordHash },
      });
      await logAudit(ctx.user.userId, 'user.resetPassword', `重置密码: ${user.username}`);
      return { success: true };
    }),
});
