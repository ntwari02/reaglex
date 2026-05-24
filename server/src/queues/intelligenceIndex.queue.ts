import type { IntelligenceEntityType, IntelligenceSearchDocument } from '../search/intelligenceSearch.types';
import {
  buildIntelligenceDocumentForEntity,
  upsertIntelligenceDocuments,
} from '../search/intelligenceIndex.service';
import { invalidateSearchCache } from '../search/searchCache';
import { isRedisEnabled, getRedisClient } from '../search/redisClient';
import { websocketService } from '../services/websocketService';

export type IntelligenceIndexJob = {
  entityType: IntelligenceEntityType;
  entityId: string;
  event?: 'created' | 'updated';
};

const DEBOUNCE_MS = 400;
const localPending = new Map<string, ReturnType<typeof setTimeout>>();

let bullQueue: import('bullmq').Queue<IntelligenceIndexJob> | null = null;
let bullWorker: import('bullmq').Worker<IntelligenceIndexJob> | null = null;

export async function processIntelligenceIndexJob(job: IntelligenceIndexJob): Promise<void> {
  const doc = await buildIntelligenceDocumentForEntity(job.entityType, job.entityId);
  if (!doc) return;

  await upsertIntelligenceDocuments([doc]);
  await invalidateSearchCache();

  websocketService.emitAdminIntelligencePulse({
    entityType: job.entityType,
    entityId: job.entityId,
    title: doc.title,
    subtitle: doc.subtitle,
    deepLink: doc.deepLink,
    moduleLabel: doc.moduleLabel,
    status: doc.status,
    event: job.event || 'updated',
  });
}

function scheduleLocal(job: IntelligenceIndexJob): void {
  const key = `${job.entityType}:${job.entityId}`;
  const prev = localPending.get(key);
  if (prev) clearTimeout(prev);

  localPending.set(
    key,
    setTimeout(() => {
      localPending.delete(key);
      void processIntelligenceIndexJob(job).catch((e) =>
        console.warn('[intelligence-index] local job failed:', e?.message),
      );
    }, DEBOUNCE_MS),
  );
}

export function enqueueIntelligenceIndex(
  entityType: IntelligenceEntityType,
  entityId: string,
  event: 'created' | 'updated' = 'updated',
): void {
  if (!entityId?.trim()) return;

  const job: IntelligenceIndexJob = { entityType, entityId: String(entityId), event };

  if (bullQueue) {
    void bullQueue
      .add('upsert', job, {
        jobId: `${entityType}:${entityId}`,
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      })
      .catch(() => scheduleLocal(job));
    return;
  }

  scheduleLocal(job);
}

export async function startIntelligenceIndexWorker(): Promise<void> {
  if (!isRedisEnabled()) {
    console.log('[intelligence-index] BullMQ disabled — using in-process debounced queue');
    return;
  }

  const connection = getRedisClient();
  if (!connection) return;

  try {
    const { Queue, Worker } = await import('bullmq');

    bullQueue = new Queue<IntelligenceIndexJob>('intelligence-index', {
      connection: connection as any,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
      },
    });

    bullWorker = new Worker<IntelligenceIndexJob>(
      'intelligence-index',
      async (job) => {
        await processIntelligenceIndexJob(job.data);
      },
      {
        connection: connection as any,
        concurrency: 4,
      },
    );

    bullWorker.on('failed', (job, err) => {
      console.warn('[intelligence-index] job failed:', job?.id, err.message);
    });

    console.log('✅ Intelligence index worker (BullMQ) started');
  } catch (e) {
    console.warn('[intelligence-index] BullMQ start failed:', (e as Error).message);
  }
}

export async function stopIntelligenceIndexWorker(): Promise<void> {
  await bullWorker?.close();
  await bullQueue?.close();
  bullWorker = null;
  bullQueue = null;
}
