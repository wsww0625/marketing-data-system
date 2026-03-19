import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { computeDashboardStats } from '../routers/dashboard.js';

const prisma = new PrismaClient();

export function startScheduler() {
  // Refresh stats snapshot every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Refreshing stats snapshots...');
    try {
      const data = await computeDashboardStats();
      await prisma.statsSnapshot.upsert({
        where: { snapshotType_spaceId: { snapshotType: 'dashboard', spaceId: 0 } },
        create: { snapshotType: 'dashboard', spaceId: 0, dataJson: JSON.stringify(data) },
        update: { dataJson: JSON.stringify(data), createdAt: new Date() },
      });
      console.log('[Scheduler] Stats snapshot refreshed');
    } catch (err) {
      console.error('[Scheduler] Failed to refresh stats:', err);
    }
  });

  // Cross-space dedup scan daily at 02:00
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Starting daily cross-space dedup scan...');
    try {
      const primarySpace = await prisma.space.findFirst({ where: { isPrimary: true } });
      if (!primarySpace) {
        console.log('[Scheduler] No primary space set, skipping cross-dedup');
        return;
      }
      console.log('[Scheduler] Cross-dedup scan would run here');
    } catch (err) {
      console.error('[Scheduler] Cross-dedup scan failed:', err);
    }
  });

  console.log('[Scheduler] Started');
}
