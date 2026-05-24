import crypto from 'crypto';
import { absMinor, compareMinor, parseMinor } from '../financial/money';
import { FinancialAnomaly, type AnomalySeverity } from '../models/FinancialAnomaly';
import { FinancialInvestigation } from '../models/FinancialInvestigation';
import { LedgerEntry } from '../models/LedgerEntry';

const RCA_TEMPLATES: Record<string, string> = {
  DUPLICATE_PAYOUT: 'Payout mismatch likely originated from asynchronous retry duplication after provider timeout.',
  ESCROW_DRIFT: 'Balance drift detected between escrow ledger and order escrow state after refund or release sequence.',
  CAPTURE_MISMATCH: 'Captured amount does not match provider webhook — possible partial capture or race on finalize.',
  UNBALANCED_POSTING: 'Ledger posting failed double-entry balance — blocked before commit.',
};

export type PaymentCaptureContext = {
  orderId: string;
  provider: string;
  providerRef: string;
  expectedGrossMinor: string;
  reportedGrossMinor: string;
  currency: string;
  sellerId?: string;
  buyerId?: string;
};

function severityForVarianceMinor(varianceMinor: string): AnomalySeverity {
  const v = parseMinor(absMinor(varianceMinor));
  if (v === 0n) return 'low';
  if (v === 1n) return 'high';
  if (v <= 100_000n) return 'high';
  return 'critical';
}

export async function verifyPaymentCapture(ctx: PaymentCaptureContext): Promise<void> {
  const cmp = compareMinor(ctx.expectedGrossMinor, ctx.reportedGrossMinor);
  if (cmp === 0) return;

  const varianceMinor =
    parseMinor(ctx.expectedGrossMinor) >= parseMinor(ctx.reportedGrossMinor)
      ? String(parseMinor(ctx.expectedGrossMinor) - parseMinor(ctx.reportedGrossMinor))
      : String(parseMinor(ctx.reportedGrossMinor) - parseMinor(ctx.expectedGrossMinor));

  await openAnomaly({
    type: 'CAPTURE_AMOUNT_MISMATCH',
    invariantId: 'INV-05',
    severity: severityForVarianceMinor(varianceMinor),
    title: 'Payment capture amount mismatch',
    message: `Order ${ctx.orderId}: expected ${ctx.expectedGrossMinor} vs provider ${ctx.reportedGrossMinor} ${ctx.currency} (Δ ${varianceMinor} minor units).`,
    correlationId: ctx.orderId,
    transactionId: ctx.orderId,
    varianceMinor,
    currency: ctx.currency,
    rcaType: 'CAPTURE_MISMATCH',
    affectedUserIds: [ctx.sellerId, ctx.buyerId].filter(Boolean) as string[],
    recommendedActions: [
      'Freeze releases for this order until reviewed',
      'Compare provider callback payload to order.payment',
      'Replay webhook in idempotent mode after verification',
    ],
  });
}

export async function verifyPostingBalance(postingId: string): Promise<boolean> {
  const lines = await LedgerEntry.find({ postingId }).lean();
  let debits = 0n;
  let credits = 0n;
  for (const line of lines) {
    const v = parseMinor(line.amountMinor);
    if (line.side === 'debit') debits += v;
    else credits += v;
  }
  if (debits !== credits) {
    await openAnomaly({
      type: 'UNBALANCED_POSTING',
      invariantId: 'INV-01',
      severity: 'critical',
      title: 'Unbalanced ledger posting detected',
      message: `Posting ${postingId} has debits=${debits} credits=${credits}.`,
      correlationId: postingId,
      transactionId: postingId,
      rcaType: 'UNBALANCED_POSTING',
      recommendedActions: ['Do not process dependent payouts', 'Run ledger replay from financial_events'],
    });
    return false;
  }
  return true;
}

type OpenAnomalyInput = {
  type: string;
  invariantId: string;
  severity: AnomalySeverity;
  title: string;
  message: string;
  correlationId?: string;
  transactionId?: string;
  varianceMinor?: string;
  currency?: string;
  rcaType?: keyof typeof RCA_TEMPLATES;
  affectedUserIds?: string[];
  estimatedExposureMinor?: string;
  recommendedActions?: string[];
  evidenceEventIds?: string[];
};

export async function openAnomaly(input: OpenAnomalyInput): Promise<string> {
  const anomalyId = crypto.randomUUID();
  const rcaHypothesis = input.rcaType ? RCA_TEMPLATES[input.rcaType] : undefined;

  await FinancialAnomaly.create({
    anomalyId,
    type: input.type,
    severity: input.severity,
    status: 'open',
    title: input.title,
    message: input.message,
    correlationId: input.correlationId,
    transactionId: input.transactionId,
    varianceMinor: input.varianceMinor,
    currency: input.currency,
    rcaHypothesis,
    rcaConfidence: rcaHypothesis ? 0.72 : undefined,
    affectedUserIds: input.affectedUserIds,
    estimatedExposureMinor: input.estimatedExposureMinor || input.varianceMinor,
    invariantId: input.invariantId,
    recommendedActions: input.recommendedActions,
    evidenceEventIds: input.evidenceEventIds,
  });

  if (input.correlationId) {
    await FinancialInvestigation.findOneAndUpdate(
      { correlationId: input.correlationId, status: { $in: ['open', 'in_progress'] } },
      {
        $setOnInsert: {
          investigationId: crypto.randomUUID(),
          title: input.title,
          severity: input.severity,
          status: 'open',
          correlationId: input.correlationId,
          aiSummary: rcaHypothesis,
          rcaHypothesis,
          recommendedActions: input.recommendedActions,
          estimatedExposureMinor: input.estimatedExposureMinor || input.varianceMinor,
          currency: input.currency,
        },
        $addToSet: { anomalyIds: anomalyId },
        $push: {
          timeline: {
            at: new Date(),
            kind: 'anomaly',
            label: input.title,
            refId: anomalyId,
          },
        },
      },
      { upsert: true },
    );
  }

  return anomalyId;
}

export async function getFinancialHealthSummary(): Promise<{
  openAnomalies: number;
  criticalAnomalies: number;
  healthScore: number;
}> {
  const [openAnomalies, criticalAnomalies] = await Promise.all([
    FinancialAnomaly.countDocuments({ status: { $in: ['open', 'acknowledged', 'investigating', 'frozen'] } }),
    FinancialAnomaly.countDocuments({ severity: 'critical', status: { $ne: 'resolved' } }),
  ]);

  let healthScore = 100;
  healthScore -= Math.min(openAnomalies * 2, 40);
  healthScore -= criticalAnomalies * 25;
  healthScore = Math.max(0, healthScore);

  return { openAnomalies, criticalAnomalies, healthScore };
}
