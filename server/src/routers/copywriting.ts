import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';

const prisma = new PrismaClient();

export const copywritingRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.search) {
        where.OR = [
          { title: { contains: input.search } },
          { content: { contains: input.search } },
        ];
      }
      if (input.category) where.category = input.category;

      const [items, total] = await Promise.all([
        prisma.copywriting.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: { user: { select: { username: true } } },
        }),
        prisma.copywriting.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return prisma.copywriting.create({
        data: { ...input, userId: ctx.user!.userId },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.copywriting.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await prisma.copywriting.delete({ where: { id: input.id } });
      return { success: true };
    }),

  categories: protectedProcedure.query(async () => {
    const cats = await prisma.copywriting.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
    });
    return cats.map(c => c.category).filter(Boolean);
  }),
});
