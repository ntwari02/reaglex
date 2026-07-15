import { upsertBuyerInsightProfilesBatch } from '../services/buyerInsight.service';

const APP_NAME = process.env.APP_NAME || 'Spacilly';

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

let started = false;
export function startBuyerInsightWorker() {
  if (started) return;
  started = true;

  const run = async () => {
    const limit = getIntEnv('BUYER_INSIGHT_BATCH', 250);
    await upsertBuyerInsightProfilesBatch(limit);
  };

  void run();
  setInterval(() => void run(), 60 * 60 * 1000); // hourly refresh
  console.log(`[buyer-insight] worker started (${APP_NAME})`);
}

