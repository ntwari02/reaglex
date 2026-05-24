import { PaymentGatewayMetric } from '../models/PaymentGatewayMetric';
import { TransactionLog } from '../models/TransactionLog';
import { getPublicGatewayFlags } from './paymentGateway.service';
import { PAYMENT_GATEWAY_REGISTRY } from '../financial/paymentGatewayRegistry';
import type { CheckoutPaymentProcessor } from './paymentService';

export type GatewayCandidate = {
  gateway: CheckoutPaymentProcessor;
  gatewayKey: string;
  score: number;
  successRate: number;
  feeRate: number;
  fraudRiskScore: number;
  isDown: boolean;
  reason: string;
};

const DEFAULT_METRICS: Record<string, { successRate: number; feeRate: number; fraudRiskScore: number }> = {
  flutterwave: { successRate: 92, feeRate: 0.014, fraudRiskScore: 18 },
  stripe: { successRate: 90, feeRate: 0.029, fraudRiskScore: 15 },
  paypal: { successRate: 88, feeRate: 0.034, fraudRiskScore: 20 },
  momo: { successRate: 86, feeRate: 0.02, fraudRiskScore: 22 },
  airtel: { successRate: 84, feeRate: 0.02, fraudRiskScore: 24 },
};

const GATEWAY_KEY_MAP: Record<CheckoutPaymentProcessor, string> = Object.fromEntries(
  PAYMENT_GATEWAY_REGISTRY.filter((g) => g.checkoutMethod).map((g) => [g.checkoutMethod!, g.key]),
) as Record<CheckoutPaymentProcessor, string>;

async function ensureDefaultMetrics(region: string) {
  const r = String(region || 'GLOBAL').toUpperCase();
  for (const [gatewayKey, m] of Object.entries(DEFAULT_METRICS)) {
    await PaymentGatewayMetric.findOneAndUpdate(
      { gatewayKey, region: r },
      {
        $setOnInsert: {
          gatewayKey,
          region: r,
          successRate: m.successRate,
          feeRate: m.feeRate,
          fraudRiskScore: m.fraudRiskScore,
          isDown: false,
          lastCheckedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
}

async function computeLiveSuccessRates(): Promise<Record<string, number>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await TransactionLog.aggregate([
    { $match: { type: 'PAYMENT', createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$metadata.provider',
        total: { $sum: 1 },
        success: {
          $sum: {
            $cond: [{ $in: ['$status', ['ESCROW_HOLD', 'RELEASED', 'AUTO_RELEASED']] }, 1, 0],
          },
        },
      },
    },
  ]);
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = String(row._id || '');
    if (!key) continue;
    const rate = row.total > 0 ? Math.round((row.success / row.total) * 100) : 0;
    out[key] = rate;
  }
  return out;
}

export async function selectOptimalGateway(params: {
  country?: string;
  amount?: number;
  preferredMethod?: CheckoutPaymentProcessor;
  excludeDown?: boolean;
}) {
  const region = String(params.country || 'RW').toUpperCase();
  await ensureDefaultMetrics(region);
  await ensureDefaultMetrics('GLOBAL');

  const flags = await getPublicGatewayFlags();
  const liveRates = await computeLiveSuccessRates();

  const rows = await PaymentGatewayMetric.find({
    region: { $in: [region, 'GLOBAL'] },
  }).lean();

  const byGateway = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const existing = byGateway.get(row.gatewayKey);
    if (!existing || row.region === region) byGateway.set(row.gatewayKey, row);
  }

  const candidates: GatewayCandidate[] = [];
  const processorList: CheckoutPaymentProcessor[] = ['flutterwave', 'stripe', 'paypal', 'momo', 'airtel'];

  for (const proc of processorList) {
    const gk = GATEWAY_KEY_MAP[proc];
    const enabled =
      proc === 'flutterwave'
        ? flags.flutterwave
        : proc === 'stripe'
          ? flags.stripe
          : proc === 'paypal'
            ? flags.paypal
            : proc === 'momo'
              ? flags.mtn_momo
              : flags.airtel_money;
    if (!enabled) continue;

    const metric = byGateway.get(gk);
    const defaults = DEFAULT_METRICS[proc];
    const successRate = Math.max(
      liveRates[proc] || 0,
      metric?.successRate ?? defaults?.successRate ?? 80
    );
    const feeRate = metric?.feeRate ?? defaults?.feeRate ?? 0.02;
    const fraudRiskScore = metric?.fraudRiskScore ?? defaults?.fraudRiskScore ?? 25;
    const isDown = Boolean(metric?.isDown) && params.excludeDown !== false;

    if (isDown) continue;

    let score = successRate * 0.45 + (100 - feeRate * 100) * 0.2 + (100 - fraudRiskScore) * 0.2;
    if (region === 'RW' && proc === 'momo') score += 8;
    if (region === 'RW' && proc === 'airtel') score += 6;
    if (params.preferredMethod === proc) score += 5;
    if ((params.amount || 0) > 500 && proc === 'stripe') score += 3;
    if ((params.amount || 0) > 200 && proc === 'flutterwave') score += 2;

    candidates.push({
      gateway: proc,
      gatewayKey: gk,
      score: Math.round(score * 10) / 10,
      successRate,
      feeRate,
      fraudRiskScore,
      isDown: false,
      reason: `success ${successRate}%, fee ${(feeRate * 100).toFixed(2)}%, fraud risk ${fraudRiskScore}`,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates[0] || {
    gateway: params.preferredMethod || 'flutterwave',
    gatewayKey: GATEWAY_KEY_MAP[params.preferredMethod || 'flutterwave'],
    score: 0,
    successRate: 80,
    feeRate: 0.02,
    fraudRiskScore: 25,
    isDown: false,
    reason: 'fallback gateway',
  };

  const failoverNote =
    params.preferredMethod && params.preferredMethod !== selected.gateway
      ? `${params.preferredMethod} unavailable or down — routed to ${selected.gateway}`
      : undefined;

  return {
    selectedGateway: selected.gateway,
    gatewayKey: selected.gatewayKey,
    reason:
      failoverNote ||
      `Selected ${selected.gateway} for ${region} (${selected.reason})`,
    alternatives: candidates.slice(0, 4),
  };
}

export async function markGatewayDown(gatewayKey: string, isDown: boolean, reason?: string) {
  await PaymentGatewayMetric.updateMany(
    { gatewayKey },
    { $set: { isDown, downtimeReason: reason || '', lastCheckedAt: new Date() } }
  );
}
