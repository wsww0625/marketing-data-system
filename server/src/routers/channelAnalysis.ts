import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { ACTIVITY_LEVELS } from '../utils/phone.js';

const prisma = new PrismaClient();

export const channelAnalysisRouter = router({
  stats: protectedProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .query(async ({ input }) => {
      // Try snapshot first
      const snapshotKey = input.spaceId || 0;
      const snapshot = await prisma.statsSnapshot.findUnique({
        where: { snapshotType_spaceId: { snapshotType: 'channel_analysis', spaceId: snapshotKey } },
      });
      if (snapshot) return JSON.parse(snapshot.dataJson);

      return computeChannelAnalysis(input.spaceId);
    }),

  refresh: adminProcedure
    .input(z.object({ spaceId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const data = await computeChannelAnalysis(input.spaceId);
      const snapshotKey = input.spaceId || 0;
      await prisma.statsSnapshot.upsert({
        where: { snapshotType_spaceId: { snapshotType: 'channel_analysis', spaceId: snapshotKey } },
        create: { snapshotType: 'channel_analysis', spaceId: snapshotKey, dataJson: JSON.stringify(data) },
        update: { dataJson: JSON.stringify(data), createdAt: new Date() },
      });
      return data;
    }),
});

async function computeChannelAnalysis(spaceId?: number) {
  const channelFilter = spaceId ? { spaceId } : {};
  const channels = await prisma.channel.findMany({
    where: channelFilter,
    include: { space: { select: { name: true } } },
  });

  const result = [];
  for (const channel of channels) {
    const where = { channelId: channel.id };
    const total = await prisma.phoneNumber.count({ where });
    const validCount = await prisma.phoneNumber.count({ where: { ...where, isValid: true } });
    const sentCount = await prisma.phoneNumber.count({ where: { ...where, sendCount: { gt: 0 } } });

    const avgSendCount = total > 0
      ? await prisma.phoneNumber.aggregate({ where, _avg: { sendCount: true } })
      : { _avg: { sendCount: 0 } };

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
      actDist.push({ label: level.label, count });
    }

    // Send count distribution
    const send0 = await prisma.phoneNumber.count({ where: { ...where, sendCount: 0 } });
    const send1 = await prisma.phoneNumber.count({ where: { ...where, sendCount: 1 } });
    const send2_3 = await prisma.phoneNumber.count({ where: { ...where, sendCount: { gte: 2, lte: 3 } } });
    const send3plus = await prisma.phoneNumber.count({ where: { ...where, sendCount: { gt: 3 } } });

    result.push({
      channelId: channel.id,
      channelName: channel.name,
      spaceName: channel.space.name,
      total,
      validRate: total > 0 ? (validCount / total * 100).toFixed(1) : '0',
      activityDistribution: actDist,
      avgSendCount: (avgSendCount._avg.sendCount || 0).toFixed(1),
      sendCoverage: total > 0 ? (sentCount / total * 100).toFixed(1) : '0',
      sendDistribution: [
        { label: '0次', count: send0 },
        { label: '1次', count: send1 },
        { label: '2-3次', count: send2_3 },
        { label: '3次以上', count: send3plus },
      ],
    });
  }

  return { channels: result, updatedAt: new Date().toISOString() };
}
