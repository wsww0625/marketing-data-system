import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { spacesRouter } from './spaces.js';
import { channelsRouter } from './channels.js';
import { importRouter } from './import.js';
import { screeningRouter } from './screening.js';
import { audiencePoolRouter } from './audiencePool.js';
import { batchesRouter } from './batches.js';
import { dashboardRouter } from './dashboard.js';
import { sendRecordsRouter } from './sendRecords.js';
import { sendCountRouter } from './sendCount.js';
import { copywritingRouter } from './copywriting.js';
import { channelAnalysisRouter } from './channelAnalysis.js';
import { reportsRouter } from './reports.js';
import { duplicatesRouter } from './duplicates.js';
import { crossDedupRouter } from './crossDedup.js';
import { dataMatchRouter } from './dataMatch.js';
import { auditLogsRouter } from './auditLogs.js';
import { usersRouter } from './users.js';

export const appRouter = router({
  auth: authRouter,
  spaces: spacesRouter,
  channels: channelsRouter,
  import: importRouter,
  screening: screeningRouter,
  audiencePool: audiencePoolRouter,
  batches: batchesRouter,
  dashboard: dashboardRouter,
  sendRecords: sendRecordsRouter,
  sendCount: sendCountRouter,
  copywriting: copywritingRouter,
  channelAnalysis: channelAnalysisRouter,
  reports: reportsRouter,
  duplicates: duplicatesRouter,
  crossDedup: crossDedupRouter,
  dataMatch: dataMatchRouter,
  auditLogs: auditLogsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
