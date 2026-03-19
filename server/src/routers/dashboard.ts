import { PrismaClient } from '@prisma/client';
import { protectedProcedure, adminProcedure, router } from '../trpc.js';
import { ACTIVITY_LEVELS } from '../utils/phone.js';

const prisma = new PrismaClient();

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    // Try to load from snapshot first
    const snapshot = await prisma.statsSnapshot.findUnique({
      where: { snapshotType_spaceId: { snapshotType: 'dashboard', spaceId: 0 } },
    });

    if (snapshot) {
      return JSON.parse(snapshot.dataJson);
    }

    // Compute directly
    return computeDashboardStats();
  }),

  refresh: adminProcedure.mutation(async () => {
    const data = await computeDashboardStats();
    await prisma.statsSnapshot.upsert({
      where: { snapshotType_spaceId: { snapshotType: 'dashboard', spaceId: 0 } },
      create: { snapshotType: 'dashboard', spaceId: 0, dataJson: JSON.stringify(data) },
      update: { dataJson: JSON.stringify(data), createdAt: new Date() },
    });
    return data;
  }),
});

async function computeDashboardStats() {
  const totalPhones = await prisma.phoneNumber.count();
  const validPhones = await prisma.phoneNumber.count({ where: { isValid: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNew = await prisma.phoneNumber.count({ where: { createdAt: { gte: today } } });

  // Activity distribution
  const activityDist = [];
  for (const level of ACTIVITY_LEVELS) {
    const minCond = level.key === 'very_high' ? 0 : level.min;
    const count = await prisma.phoneNumber.count({
      where: {
        activityDays: level.key === 'very_high'
          ? { gte: 0, lte: level.max }
          : { gt: minCond, lte: level.max },
      },
    });
    activityDist.push({ label: level.label, key: level.key, count });
  }

  // Channel distribution
  const channels = await prisma.channel.findMany({ include: { _count: { select: { phoneNumbers: true } } } });
  const channelDist = channels.map(c => ({ name: c.name, count: c._count.phoneNumbers }));

  // Space distribution
  const spaces = await prisma.space.findMany({ include: { _count: { select: { phoneNumbers: true } } } });
  const spaceDist = spaces.map(s => ({ name: s.name, count: s._count.phoneNumbers }));

  return {
    totalPhones,
    validPhones,
    todayNew,
    activityDistribution: activityDist,
    channelDistribution: channelDist,
    spaceDistribution: spaceDist,
    updatedAt: new Date().toISOString(),
  };
}

export { computeDashboardStats };
