import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, router } from '../trpc.js';

const prisma = new PrismaClient();

export const copywritingRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.search) {
        where.OR = [
          { code: { contains: input.search } },
          { content: { contains: input.search } },
        ];
      }

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

  // Get all copywriting codes for dropdown
  codes: protectedProcedure.query(async () => {
    const items = await prisma.copywriting.findMany({
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });
    return items;
  }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      content: z.string().min(1),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return prisma.copywriting.create({
        data: {
          code: input.code,
          content: input.content,
          imageUrl: input.imageUrl || null,
          userId: ctx.user!.userId,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1),
      content: z.string().min(1),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.copywriting.update({
        where: { id },
        data: {
          code: data.code,
          content: data.content,
          imageUrl: data.imageUrl || null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await prisma.copywriting.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
