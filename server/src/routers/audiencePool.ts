import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { ACTIVITY_LEVELS } from '../utils/phone.js';
import { generateCsv } from '../utils/csv.js';
import { logAudit } from '../utils/audit.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function buildWhere(filters: {
  spaceId?: number;
  activityLevel?: string;
  isValid?: string;
  channelId?: number;
  sendCountMin?: number;
  sendCountMax?: number;
}): Prisma.PhoneNumberWhereInput {
  const where: Prisma.PhoneNumberWhereInput = {};

  if (filters.spaceId) where.spaceId = filters.spaceId;

  if (filters.activityLevel) {
    const level = ACTIVITY_LEVELS.find(l => l.key === filters.activityLevel);
    if (level) {
      where.activityDays = { gt: level.min, lte: level.max };
      if (level.key === 'very_high') {
        where.activityDays = { gte: 0, lte: level.max };
      }
    }
  }

  if (filters.isValid === 'valid') where.isValid = true;
  if (filters.isValid === 'invalid') where.isValid = false;

  if (filters.channelId) where.channelId = filters.channelId;

  if (filters.sendCountMin !== undefined || filters.sendCountMax !== undefined) {
    where.sendCount = {};
    if (filters.sendCountMin !== undefined) where.sendCount.gte = filters.sendCountMin;
    if (filters.sendCountMax !== undefined) where.sendCount.lte = filters.sendCountMax;
  }

  return where;
}

export const audiencePoolRouter = router({
  // Single phone query
  queryPhone: protectedProcedure
    .input(z.object({ phone: z.string(), spaceId: z.number().optional() }))
    .query(async ({ input }) => {
      const where: Prisma.PhoneNumberWhereInput = { phone: input.phone };
      if (input.spaceId) where.spaceId = input.spaceId;
      return prisma.phoneNumber.findMany({
        where,
        include: {
          space: { select: { name: true } },
          channel: { select: { name: true } },
        },
      });
    }),

  // Distribution matrix
  matrix: protectedProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .query(async ({ input }) => {
      const spaceFilter = input.spaceId ? `AND space_id = ${input.spaceId}` : '';
      const result: any[] = [];

      for (const level of ACTIVITY_LEVELS) {
        const minCond = level.key === 'very_high' ? `activity_days >= 0` : `activity_days > ${level.min}`;
        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count,
            SUM(CASE WHEN is_valid = 0 THEN 1 ELSE 0 END) as invalid_count,
            SUM(CASE WHEN is_cooled = 1 THEN 1 ELSE 0 END) as cooled_count
          FROM phone_numbers
          WHERE ${minCond} AND activity_days <= ${level.max}
            AND activity_days IS NOT NULL
            ${spaceFilter}
        `);
        result.push({
          level: level.label,
          key: level.key,
          total: Number(rows[0]?.total || 0),
          validCount: Number(rows[0]?.valid_count || 0),
          invalidCount: Number(rows[0]?.invalid_count || 0),
          cooledCount: Number(rows[0]?.cooled_count || 0),
        });
      }

      // Add unscreened
      const unscreened = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count,
          SUM(CASE WHEN is_valid = 0 THEN 1 ELSE 0 END) as invalid_count,
          SUM(CASE WHEN is_cooled = 1 THEN 1 ELSE 0 END) as cooled_count
        FROM phone_numbers WHERE activity_days IS NULL ${spaceFilter}
      `);
      result.push({
        level: '未筛选',
        key: 'unscreened',
        total: Number(unscreened[0]?.total || 0),
        validCount: Number(unscreened[0]?.valid_count || 0),
        invalidCount: Number(unscreened[0]?.invalid_count || 0),
        cooledCount: Number(unscreened[0]?.cooled_count || 0),
      });

      return result;
    }),

  // Filtered list
  list: protectedProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      activityLevel: z.string().optional(),
      isValid: z.string().optional(),
      channelId: z.number().optional(),
      sendCountMin: z.number().optional(),
      sendCountMax: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where = buildWhere(input);
      const [items, total] = await Promise.all([
        prisma.phoneNumber.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            space: { select: { name: true } },
            channel: { select: { name: true } },
          },
        }),
        prisma.phoneNumber.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Export (cool or all)
  export: adminProcedure
    .input(z.object({
      spaceId: z.number(),
      activityLevel: z.string().optional(),
      isValid: z.string().optional(),
      channelId: z.number().optional(),
      sendCountMin: z.number().optional(),
      sendCountMax: z.number().optional(),
      isCoolExport: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const where = buildWhere(input);
      if (input.isCoolExport) {
        (where as any).isCooled = false;
      }

      // Create export batch
      const batch = await prisma.exportBatch.create({
        data: {
          spaceId: input.spaceId,
          filtersJson: JSON.stringify(input),
          isCoolExport: input.isCoolExport,
          userId: ctx.user.userId,
          status: 'processing',
          progress: 0,
        },
      });

      // Process async
      processExport(batch.id, where, input.isCoolExport, ctx.user.userId).catch(console.error);

      return { exportId: batch.id };
    }),

  // Check export progress
  exportProgress: protectedProcedure
    .input(z.object({ exportId: z.number() }))
    .query(async ({ input }) => {
      const batch = await prisma.exportBatch.findUnique({ where: { id: input.exportId } });
      return batch;
    }),
});

async function processExport(
  batchId: number,
  where: Prisma.PhoneNumberWhereInput,
  isCoolExport: boolean,
  userId: number
) {
  try {
    // Count total
    const total = await prisma.phoneNumber.count({ where });
    await prisma.exportBatch.update({
      where: { id: batchId },
      data: { total, progress: 10 },
    });

    // Fetch all phones in batches
    const phones: string[] = [];
    const batchSize = 1000;
    let skip = 0;

    while (skip < total) {
      const batch = await prisma.phoneNumber.findMany({
        where,
        select: { id: true, phone: true },
        skip,
        take: batchSize,
      });

      for (const p of batch) {
        phones.push(p.phone);

        // Mark as cooled if cool export
        if (isCoolExport) {
          await prisma.phoneNumber.update({
            where: { id: p.id },
            data: { isCooled: true, cooledAt: new Date(), coolBatchId: batchId },
          });
        }
      }

      skip += batchSize;
      const progress = Math.min(10 + Math.floor((skip / total) * 80), 90);
      await prisma.exportBatch.update({
        where: { id: batchId },
        data: { progress },
      });
    }

    // Generate CSV file
    const csv = generateCsv(phones);
    const uploadsDir = path.resolve('uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `export_${batchId}_${Date.now()}.csv`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, csv);

    await prisma.exportBatch.update({
      where: { id: batchId },
      data: { status: 'completed', progress: 100, filePath: fileName },
    });

    await logAudit(userId, 'export.complete', `导出完成: 批次${batchId}, 号码数:${total}`);
  } catch (error) {
    console.error('Export failed:', error);
    await prisma.exportBatch.update({
      where: { id: batchId },
      data: { status: 'failed', progress: 0 },
    });
  }
}
