import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const reportInput = z.object({
  taskDate: z.string(),
  packageName: z.string().min(1),
  dataSourceSpaceId: z.number().nullable().optional(),
  channelId: z.number().nullable().optional(),
  startSendDate: z.string(),
  sendPlatform: z.string(),
  sendChannel: z.string(),
  sendCount: z.number().default(0),
  copywritingId: z.number().nullable().optional(),
  clickCount: z.number().default(0),
  clickRate: z.number().default(0),
  readRate: z.number().default(0),
  registerCount: z.number().default(0),
  rechargeCount: z.number().default(0),
  rechargeAmount: z.number().default(0),
  withdrawCount: z.number().default(0),
  withdrawAmount: z.number().default(0),
  rechargeDiff: z.number().default(0),
  userValue: z.number().default(0),
  payCost: z.number().default(0),
  rechargeROI: z.number().default(0),
  balanceROI: z.number().default(0),
});

export const reportsRouter = router({
  list: protectedProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      channelId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.spaceId) where.dataSourceSpaceId = input.spaceId;
      if (input.channelId) where.channelId = input.channelId;
      if (input.startDate || input.endDate) {
        where.startSendDate = {};
        if (input.startDate) where.startSendDate.gte = new Date(input.startDate);
        if (input.endDate) where.startSendDate.lte = new Date(input.endDate + 'T23:59:59');
      }

      const [items, total] = await Promise.all([
        prisma.operationReport.findMany({
          where,
          orderBy: { id: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            dataSourceSpace: { select: { name: true } },
            channel: { select: { name: true } },
            copywriting: { select: { code: true } },
            user: { select: { username: true } },
          },
        }),
        prisma.operationReport.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  create: protectedProcedure
    .input(reportInput)
    .mutation(async ({ input, ctx }) => {
      return prisma.operationReport.create({
        data: {
          taskDate: new Date(input.taskDate),
          packageName: input.packageName,
          dataSourceSpaceId: input.dataSourceSpaceId || null,
          channelId: input.channelId || null,
          startSendDate: new Date(input.startSendDate),
          sendPlatform: input.sendPlatform,
          sendChannel: input.sendChannel,
          sendCount: input.sendCount,
          copywritingId: input.copywritingId || null,
          clickCount: input.clickCount,
          clickRate: input.clickRate,
          readRate: input.readRate,
          registerCount: input.registerCount,
          rechargeCount: input.rechargeCount,
          rechargeAmount: input.rechargeAmount,
          withdrawCount: input.withdrawCount,
          withdrawAmount: input.withdrawAmount,
          rechargeDiff: input.rechargeDiff,
          userValue: input.userValue,
          payCost: input.payCost,
          rechargeROI: input.rechargeROI,
          balanceROI: input.balanceROI,
          userId: ctx.user!.userId,
        },
      });
    }),

  update: protectedProcedure
    .input(reportInput.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.operationReport.update({
        where: { id },
        data: {
          taskDate: new Date(data.taskDate),
          packageName: data.packageName,
          dataSourceSpaceId: data.dataSourceSpaceId || null,
          channelId: data.channelId || null,
          startSendDate: new Date(data.startSendDate),
          sendPlatform: data.sendPlatform,
          sendChannel: data.sendChannel,
          sendCount: data.sendCount,
          copywritingId: data.copywritingId || null,
          clickCount: data.clickCount,
          clickRate: data.clickRate,
          readRate: data.readRate,
          registerCount: data.registerCount,
          rechargeCount: data.rechargeCount,
          rechargeAmount: data.rechargeAmount,
          withdrawCount: data.withdrawCount,
          withdrawAmount: data.withdrawAmount,
          rechargeDiff: data.rechargeDiff,
          userValue: data.userValue,
          payCost: data.payCost,
          rechargeROI: data.rechargeROI,
          balanceROI: data.balanceROI,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await prisma.operationReport.delete({ where: { id: input.id } });
      return { success: true };
    }),

  batchImport: protectedProcedure
    .input(z.object({ filePath: z.string(), fileName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      let content = fs.readFileSync(input.filePath, 'utf-8');
      content = content.replace(/^\ufeff/, '');

      const records = parse(content, { skip_empty_lines: true, relax_column_count: true, columns: true });
      let imported = 0;
      let failed = 0;

      const headerMap: Record<string, string> = {
        '提交任务日期': 'taskDate',
        '包名': 'packageName',
        '开始发送日期': 'startSendDate',
        '发送平台': 'sendPlatform',
        '发送通道': 'sendChannel',
        '发送条数': 'sendCount',
        '知识库文案编号': 'copywritingCode',
        '点击数': 'clickCount',
        '点击率': 'clickRate',
        '已读率': 'readRate',
        '注册人数': 'registerCount',
        '充值人数': 'rechargeCount',
        '充值金额': 'rechargeAmount',
        '提现人数': 'withdrawCount',
        '提现金额': 'withdrawAmount',
        '充提差': 'rechargeDiff',
        '用户价值': 'userValue',
        '付费成本': 'payCost',
        '充值ROI': 'rechargeROI',
        '收支ROI': 'balanceROI',
        '数据来源空间库': 'dataSourceSpaceName',
      };

      for (const record of records) {
        try {
          const mapped: any = {};
          for (const [cnKey, enKey] of Object.entries(headerMap)) {
            if (record[cnKey] !== undefined) {
              mapped[enKey] = record[cnKey];
            }
          }

          // Also try English keys directly
          for (const key of Object.values(headerMap)) {
            if (record[key] !== undefined && mapped[key] === undefined) {
              mapped[key] = record[key];
            }
          }

          if (!mapped.packageName && !mapped.taskDate) {
            failed++;
            continue;
          }

          // Resolve copywriting by code
          let copywritingId: number | null = null;
          if (mapped.copywritingCode) {
            const cw = await prisma.copywriting.findUnique({ where: { code: String(mapped.copywritingCode) } });
            if (cw) copywritingId = cw.id;
          }

          // Resolve space by name
          let dataSourceSpaceId: number | null = null;
          if (mapped.dataSourceSpaceName) {
            const sp = await prisma.space.findFirst({ where: { name: String(mapped.dataSourceSpaceName) } });
            if (sp) dataSourceSpaceId = sp.id;
          }

          const parseNum = (v: any) => {
            if (v === undefined || v === null || v === '' || v === '—') return 0;
            const s = String(v).replace(/%/g, '');
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
          };

          const parseDate = (v: any) => {
            if (!v) return new Date();
            const d = new Date(v);
            return isNaN(d.getTime()) ? new Date() : d;
          };

          await prisma.operationReport.create({
            data: {
              taskDate: parseDate(mapped.taskDate),
              packageName: String(mapped.packageName || ''),
              dataSourceSpaceId,
              startSendDate: parseDate(mapped.startSendDate),
              sendPlatform: String(mapped.sendPlatform || ''),
              sendChannel: String(mapped.sendChannel || ''),
              sendCount: parseNum(mapped.sendCount),
              copywritingId,
              clickCount: parseNum(mapped.clickCount),
              clickRate: parseNum(mapped.clickRate),
              readRate: parseNum(mapped.readRate),
              registerCount: parseNum(mapped.registerCount),
              rechargeCount: parseNum(mapped.rechargeCount),
              rechargeAmount: parseNum(mapped.rechargeAmount),
              withdrawCount: parseNum(mapped.withdrawCount),
              withdrawAmount: parseNum(mapped.withdrawAmount),
              rechargeDiff: parseNum(mapped.rechargeDiff),
              userValue: parseNum(mapped.userValue),
              payCost: parseNum(mapped.payCost),
              rechargeROI: parseNum(mapped.rechargeROI),
              balanceROI: parseNum(mapped.balanceROI),
              userId: ctx.user!.userId,
            },
          });
          imported++;
        } catch {
          failed++;
        }
      }

      // Clean up temp file
      try { fs.unlinkSync(input.filePath); } catch {}

      return { imported, failed, total: records.length };
    }),

  export: protectedProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      channelId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const where: any = {};
      if (input.spaceId) where.dataSourceSpaceId = input.spaceId;
      if (input.channelId) where.channelId = input.channelId;
      if (input.startDate || input.endDate) {
        where.startSendDate = {};
        if (input.startDate) where.startSendDate.gte = new Date(input.startDate);
        if (input.endDate) where.startSendDate.lte = new Date(input.endDate + 'T23:59:59');
      }

      const items = await prisma.operationReport.findMany({
        where,
        orderBy: { id: 'desc' },
        include: {
          dataSourceSpace: { select: { name: true } },
          channel: { select: { name: true } },
          copywriting: { select: { code: true } },
        },
      });

      const formatDate = (d: Date) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      };

      const rows = items.map(r => ({
        '任务编号': r.id,
        '提交任务日期': formatDate(r.taskDate),
        '包名': r.packageName,
        '数据来源空间库': r.dataSourceSpace?.name || '—',
        '开始发送日期': formatDate(r.startSendDate),
        '发送平台': r.sendPlatform,
        '发送通道': r.sendChannel,
        '发送条数': r.sendCount,
        '知识库文案编号': r.copywriting?.code || '/',
        '点击数': r.clickCount,
        '点击率': `${r.clickRate}%`,
        '已读率': r.readRate ? `${r.readRate}%` : '—',
        '注册人数': r.registerCount,
        '充值人数': r.rechargeCount,
        '充值金额': r.rechargeAmount,
        '提现人数': r.withdrawCount,
        '提现金额': r.withdrawAmount,
        '充提差': r.rechargeDiff,
        '用户价值': r.userValue,
        '付费成本': r.payCost,
        '充值ROI': `${r.rechargeROI}%`,
        '收支ROI': `${r.balanceROI}%`,
      }));

      const BOM = '\ufeff';
      const csvContent = BOM + stringify(rows, { header: true });

      const uploadsDir = path.resolve('uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const fileName = `运营报表_${Date.now()}.csv`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, csvContent);

      return { fileName };
    }),
});
