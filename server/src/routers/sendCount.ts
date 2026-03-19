import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { adminProcedure, router } from '../trpc.js';
import { parsePhoneFile } from '../utils/csv.js';
import { isValidPhone } from '../utils/phone.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();

export const sendCountRouter = router({
  process: adminProcedure
    .input(z.object({
      files: z.array(z.object({ filePath: z.string(), fileName: z.string() })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      const sentAt = new Date();
      // Round to hour (GMT+8)
      sentAt.setMinutes(0, 0, 0);

      for (const file of input.files) {
        const batch = await prisma.sendImportBatch.create({
          data: { fileName: file.fileName, userId: ctx.user.userId },
        });

        const phones = parsePhoneFile(file.filePath);
        let validCount = 0;
        let invalidCount = 0;

        for (const phone of phones) {
          if (!isValidPhone(phone)) {
            invalidCount++;
            continue;
          }

          // Find phone in database (any space)
          const existing = await prisma.phoneNumber.findFirst({ where: { phone } });
          if (!existing) {
            invalidCount++;
            continue;
          }

          validCount++;

          // Increment send count
          await prisma.phoneNumber.update({
            where: { id: existing.id },
            data: {
              sendCount: { increment: 1 },
              lastSentAt: sentAt,
            },
          });

          // Create send record
          await prisma.sendRecord.create({
            data: {
              phoneNumberId: existing.id,
              phone,
              spaceId: existing.spaceId,
              sentAt,
              batchId: batch.id,
            },
          });
        }

        await prisma.sendImportBatch.update({
          where: { id: batch.id },
          data: { validCount, invalidCount },
        });

        results.push({ batchId: batch.id, fileName: file.fileName, validCount, invalidCount });
      }

      await logAudit(ctx.user.userId, 'sendCount.import',
        `导入发送记录: ${input.files.length}个文件`);

      return results;
    }),

  history: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const [items, total] = await Promise.all([
        prisma.sendImportBatch.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: { user: { select: { username: true } } },
        }),
        prisma.sendImportBatch.count(),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
});
