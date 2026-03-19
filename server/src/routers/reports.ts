import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { ACTIVITY_LEVELS } from '../utils/phone.js';

const prisma = new PrismaClient();

export const reportsRouter = router({
  stats: protectedProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .query(async ({ input }) => {
      const snapshotKey = input.spaceId || 0;
      const snapshot = await prisma.statsSnapshot.findUnique({
        where: { snapshotType_spaceId: { snapshotType: 'report', spaceId: snapshotKey } },
      });
      if (snapshot) return JSON.parse(snapshot.dataJson);
      return computeReportStats(input.spaceId);
    }),

  refresh: adminProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const data = await computeReportStats(input.spaceId);
      const snapshotKey = input.spaceId || 0;
      await prisma.statsSnapshot.upsert({
        where: { snapshotType_spaceId: { snapshotType: 'report', spaceId: snapshotKey } },
        create: { snapshotType: 'report', spaceId: snapshotKey, dataJson: JSON.stringify(data) },
        update: { dataJson: JSON.stringify(data), createdAt: new Date() },
      });
      return data;
    }),
});

async function computeReportStats(spaceId?: number) {
  const where = spaceId ? { spaceId } : {};
  const total = await prisma.phoneNumber.count({ where });
  const validCount = await prisma.phoneNumber.count({ where: { ...where, isValid: true } });
  const invalidCount = total - validCount;
  const sentCount = await prisma.phoneNumber.count({ where: { ...where, sendCount: { gt: 0 } } });
  const avgSendCount = await prisma.phoneNumber.aggregate({ where, _avg: { sendCount: true } });

  // Activity distribution
  const actDist = [];
  for (const level of ACTIVITY_LEVELS) {
    const count = await prisma.phoneNumber.count({
      where: {
        ...where,
        activityDays: level.key === 'very_high'
          ? { gte: 0, lte: level.max }
          : { gt: level.min, lte: level.max },
      },
    });
    actDist.push({ label: level.label, count, pct: total > 0 ? (count / total * 100).toFixed(1) : '0' });
  }

  // Send count distribution
  const send0 = await prisma.phoneNumber.count({ where: { ...where, sendCount: 0 } });
  const send1 = await prisma.phoneNumber.count({ where: { ...where, sendCount: 1 } });
  const send2_3 = await prisma.phoneNumber.count({ where: { ...where, sendCount: { gte: 2, lte: 3 } } });
  const send3plus = await prisma.phoneNumber.count({ where: { ...where, sendCount: { gt: 3 } } });

  // Per-space breakdown
  const spaces = await prisma.space.findMany({
    include: { _count: { select: { phoneNumbers: true } } },
  });
  const spaceBreakdown = [];
  for (const space of spaces) {
    if (spaceId && space.id !== spaceId) continue;
    const sTotal = space._count.phoneNumbers;
    const sValid = await prisma.phoneNumber.count({ where: { spaceId: space.id, isValid: true } });
    spaceBreakdown.push({
      spaceName: space.name,
      total: sTotal,
      validCount: sValid,
      invalidCount: sTotal - sValid,
    });
  }

  return {
    total,
    validCount,
    invalidCount,
    sendCoverage: total > 0 ? (sentCount / total * 100).toFixed(1) : '0',
    avgSendCount: (avgSendCount._avg.sendCount || 0).toFixed(1),
    activityDistribution: actDist,
    sendDistribution: [
      { label: '0次', count: send0 },
      { label: '1次', count: send1 },
      { label: '2-3次', count: send2_3 },
      { label: '3次以上', count: send3plus },
    ],
    spaceBreakdown,
    updatedAt: new Date().toISOString(),
  };
}
