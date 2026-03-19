import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';
import { parsePhoneFile } from '../utils/csv.js';
import { isValidPhone } from '../utils/phone.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const importRouter = router({
  // Upload and process import
  process: adminProcedure
    .input(z.object({
      filePath: z.string(),
      fileName: z.string(),
      spaceId: z.number(),
      channelId: z.number().optional(),
      dataType: z.enum(['merchant', 'purchase']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create batch record
      const batch = await prisma.importBatch.create({
        data: {
          fileName: input.fileName,
          spaceId: input.spaceId,
          channelId: input.channelId,
          dataType: input.dataType,
          userId: ctx.user.userId,
          status: 'processing',
        },
      });

      // Parse file
      const phones = parsePhoneFile(input.filePath);
      const validPhones = phones.filter(isValidPhone);
      let newCount = 0;
      let duplicateCount = 0;

      if (input.dataType === 'merchant') {
        // Merchant data: deduplicate against unique library
        for (const phone of validPhones) {
          const existing = await prisma.phoneNumber.findUnique({
            where: { phone_spaceId: { phone, spaceId: input.spaceId } },
          });

          if (existing) {
            // Move to duplicate library
            await prisma.duplicateNumber.create({
              data: {
                phone,
                spaceId: input.spaceId,
                channelId: input.channelId,
                importBatchId: batch.id,
                originalPhoneId: existing.id,
              },
            });
            duplicateCount++;
          } else {
            // Add to unique library
            await prisma.phoneNumber.create({
              data: {
                phone,
                spaceId: input.spaceId,
                channelId: input.channelId,
                importBatchId: batch.id,
              },
            });
            newCount++;
          }
        }
      } else {
        // Purchase data: no deduplication
        for (const phone of validPhones) {
          try {
            await prisma.phoneNumber.create({
              data: {
                phone,
                spaceId: input.spaceId,
                channelId: input.channelId,
                importBatchId: batch.id,
              },
            });
            newCount++;
          } catch {
            // If unique constraint violation, update existing
            await prisma.phoneNumber.updateMany({
              where: { phone, spaceId: input.spaceId },
              data: { channelId: input.channelId },
            });
            duplicateCount++;
          }
        }
      }

      // Update batch stats
      const updated = await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          total: validPhones.length,
          newCount,
          duplicateCount,
          updatedCount: validPhones.length - newCount - duplicateCount,
          status: 'completed',
        },
      });

      await logAudit(ctx.user.userId, 'import.complete',
        `导入完成: ${input.fileName}, 空间库ID:${input.spaceId}, 新增:${newCount}, 重复:${duplicateCount}`);

      return updated;
    }),

  // List import history
  history: adminProcedure
    .input(z.object({
      spaceId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const where = input.spaceId ? { spaceId: input.spaceId } : {};
      const [items, total] = await Promise.all([
        prisma.importBatch.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            space: { select: { name: true } },
            user: { select: { username: true } },
          },
        }),
        prisma.importBatch.count({ where }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Revert import batch
  revert: adminProcedure
    .input(z.object({ batchId: z.number(), force: z.boolean().default(false) }))
    .mutation(async ({ input, ctx }) => {
      const batch = await prisma.importBatch.findUnique({ where: { id: input.batchId } });
      if (!batch) throw new Error('批次不存在');
      if (batch.status === 'reverted') throw new Error('批次已回退');

      // Preview: count affected numbers
      const phoneCount = await prisma.phoneNumber.count({ where: { importBatchId: input.batchId } });
      const dupCount = await prisma.duplicateNumber.count({ where: { importBatchId: input.batchId } });

      if (!input.force) {
        // Check for screened numbers
        const screenedCount = await prisma.phoneNumber.count({
          where: { importBatchId: input.batchId, screenedAt: { not: null } },
        });
        return { preview: true, phoneCount, dupCount, screenedCount };
      }

      // Execute revert
      await prisma.phoneNumber.deleteMany({ where: { importBatchId: input.batchId } });
      await prisma.duplicateNumber.deleteMany({ where: { importBatchId: input.batchId } });
      await prisma.importBatch.update({
        where: { id: input.batchId },
        data: { status: 'reverted', revertedAt: new Date() },
      });

      await logAudit(ctx.user.userId, 'import.revert',
        `回退导入批次: ${batch.fileName}, 删除号码:${phoneCount}, 删除重复:${dupCount}`);

      return { preview: false, phoneCount, dupCount, screenedCount: 0 };
    }),
});
