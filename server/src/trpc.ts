import { initTRPC, TRPCError } from '@trpc/server';
import type { Request } from 'express';
import { verifyToken, type JwtPayload } from './auth.js';

export interface Context {
  user: JwtPayload | null;
}

export function createContext(req: Request): Context {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null };
  }
  const token = authHeader.slice(7);
  const user = verifyToken(token);
  return { user };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '请先登录' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '请先登录' });
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理员权限' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
