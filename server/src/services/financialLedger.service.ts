import crypto from 'crypto';
import mongoose from 'mongoose';
import { ACCOUNTS } from '../financial/accounts';
import { addMinor, isZeroMinor, parseMinor } from '../financial/money';
import { FinancialEvent, type FinancialEventType } from '../models/FinancialEvent';
import { LedgerEntry, type LedgerSide } from '../models/LedgerEntry';

export type LedgerLineInput = {
  account: string;
  side: LedgerSide;
  amountMinor: string;
};

export type PostingInput = {
  correlationId: string;
  transactionId: string;
  eventType: FinancialEventType;
  idempotencyKey: string;
  currency: string;
  lines: LedgerLineInput[];
  reason: string;
  sourceService: string;
  actor?: { type: string; id?: string };
  traceId?: string;
  causationId?: string;
  payload?: Record<string, unknown>;
};

function checksumLine(fields: Record<string, string>): string {
  return crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}

function assertBalanced(lines: LedgerLineInput[]): void {
  let debits = 0n;
  let credits = 0n;
  for (const line of lines) {
    const v = parseMinor(line.amountMinor);
    if (v < 0n) throw new Error('Negative ledger amount');
    if (line.side === 'debit') debits += v;
    else credits += v;
  }
  if (debits !== credits) {
    throw new Error(`Unbalanced posting: debits=${debits} credits=${credits}`);
  }
}

/**
 * Append a balanced double-entry posting + financial event.
 * Idempotent on idempotencyKey.
 */
export async function postLedgerEntry(input: PostingInput): Promise<{ eventId: string; postingId: string }> {
  assertBalanced(input.lines);
  if (input.lines.length < 2) throw new Error('Posting requires at least two lines');

  const existing = await FinancialEvent.findOne({ idempotencyKey: input.idempotencyKey }).lean();
  if (existing) {
    const posting = await LedgerEntry.findOne({ eventId: existing.eventId }).select('postingId').lean();
    return { eventId: existing.eventId, postingId: posting?.postingId || '' };
  }

  const eventId = crypto.randomUUID();
  const postingId = crypto.randomUUID();
  const occurredAt = new Date();
  const payload = input.payload || {};
  const payloadChecksum = checksumLine({ payload: JSON.stringify(payload) });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await FinancialEvent.create(
      [
        {
          eventId,
          eventType: input.eventType,
          version: 1,
          occurredAt,
          correlationId: input.correlationId,
          traceId: input.traceId,
          causationId: input.causationId,
          idempotencyKey: input.idempotencyKey,
          actor: input.actor || { type: 'system' },
          sourceService: input.sourceService,
          payload,
          payloadChecksum,
        },
      ],
      { session },
    );

    const entries = input.lines.map((line) => {
      const entryId = crypto.randomUUID();
      const checksum = checksumLine({
        postingId,
        account: line.account,
        side: line.side,
        amountMinor: line.amountMinor,
        currency: input.currency,
      });
      return {
        entryId,
        postingId,
        transactionId: input.transactionId,
        correlationId: input.correlationId,
        eventId,
        account: line.account,
        side: line.side,
        amountMinor: line.amountMinor,
        currency: input.currency,
        sourceService: input.sourceService,
        actor: input.actor || { type: 'system' },
        reason: input.reason,
        checksum,
      };
    });

    await LedgerEntry.insertMany(entries, { session });
    await session.commitTransaction();
    return { eventId, postingId };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/** Shadow-mode helper: record payment capture in ledger without changing legacy wallets. */
export async function postPaymentCaptured(input: {
  orderId: string;
  sellerId: string;
  provider: string;
  providerRef: string;
  grossMinor: string;
  platformFeeMinor: string;
  pspFeeMinor: string;
  sellerNetMinor: string;
  currency: string;
  traceId?: string;
}): Promise<{ eventId: string; postingId: string } | null> {
  const { grossMinor, platformFeeMinor, pspFeeMinor, sellerNetMinor, currency } = input;
  if (isZeroMinor(grossMinor)) return null;

  const idempotencyKey = `capture:${input.provider}:${input.providerRef}`;
  const clearing = ACCOUNTS.asset.pspClearing(input.provider);

  const lines: LedgerLineInput[] = [
    { account: clearing, side: 'debit', amountMinor: grossMinor },
    { account: ACCOUNTS.liability.escrowPool, side: 'credit', amountMinor: grossMinor },
  ];

  if (!isZeroMinor(platformFeeMinor)) {
    lines.push(
      { account: ACCOUNTS.liability.escrowPool, side: 'debit', amountMinor: platformFeeMinor },
      { account: ACCOUNTS.revenue.platformCommission, side: 'credit', amountMinor: platformFeeMinor },
    );
  }

  if (!isZeroMinor(pspFeeMinor)) {
    lines.push(
      { account: ACCOUNTS.liability.escrowPool, side: 'debit', amountMinor: pspFeeMinor },
      { account: ACCOUNTS.expense.pspProcessingFee, side: 'credit', amountMinor: pspFeeMinor },
    );
  }

  // Seller net remains in escrow pool until ESCROW_RELEASED posting.
  const allocated = addMinor(platformFeeMinor, pspFeeMinor);
  const remainder = addMinor(sellerNetMinor, allocated);
  if (remainder !== grossMinor) {
    throw new Error(`Payment split mismatch: gross=${grossMinor} fees+net=${remainder}`);
  }

  return postLedgerEntry({
    correlationId: input.orderId,
    transactionId: input.orderId,
    eventType: 'PAYMENT_CAPTURED',
    idempotencyKey,
    currency,
    lines,
    reason: 'PAYMENT_CAPTURED',
    sourceService: 'financialLedger.service',
    actor: { type: 'system' },
    traceId: input.traceId,
    payload: {
      orderId: input.orderId,
      sellerId: input.sellerId,
      provider: input.provider,
      providerRef: input.providerRef,
      grossMinor,
      platformFeeMinor,
      pspFeeMinor,
      sellerNetMinor,
    },
  });
}
