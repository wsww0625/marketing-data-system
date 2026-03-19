import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { publicProcedure, protectedProcedure, router } from '../trpc.js';
import { hashPassword, verifyPassword, signToken } from '../auth.js';

const prisma = new PrismaClient();

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { username: input.username } });
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new Error('用户名或密码错误');
      }
      const token = signToken({ userId: user.id, username: user.username, role: user.role });
      return { token, user: { id: user.id, username: user.username, role: user.role } };
    }),

  register: publicProcedure
    .input(z.object({ username: z.string().min(3), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const exists = await prisma.user.findUnique({ where: { username: input.username } });
      if (exists) throw new Error('用户名已存在');
      const passwordHash = await hashPassword(input.password);
      const user = await prisma.user.create({
        data: { username: input.username, passwordHash, role: 'user' },
      });
      const token = signToken({ userId: user.id, username: user.username, role: user.role });
      return { token, user: { id: user.id, username: user.username, role: user.role } };
    }),

  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
});
