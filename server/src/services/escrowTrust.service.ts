import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Dispute } from '../models/Dispute';
import { BuyerTrustProfile } from '../models/BuyerTrustProfile';
import { SellerTrustProfile } from '../models/SellerTrustProfile';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function computeEscrowTrustScores(params: {
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
}) {
  const [buyerProfile, sellerProfile] = await Promise.all([
    BuyerTrustProfile.findOne({ userId: params.buyerId }).lean(),
    SellerTrustProfile.findOne({ sellerId: params.sellerId }).lean(),
  ]);

  const [buyerOrders, sellerOrders, buyerDisputes, sellerDisputes, sellerCancels] = await Promise.all([
    Order.countDocuments({ buyerId: params.buyerId } as any),
    Order.countDocuments({ sellerId: params.sellerId } as any),
    Dispute.countDocuments({ buyerId: params.buyerId } as any),
    Dispute.countDocuments({ sellerId: params.sellerId } as any),
    Order.countDocuments({ sellerId: params.sellerId, status: 'cancelled' } as any),
  ]);

  const buyerDisputeRate = buyerOrders > 0 ? buyerDisputes / buyerOrders : 0;
  const sellerDisputeRate = sellerOrders > 0 ? sellerDisputes / sellerOrders : 0;
  const sellerCancelRate = sellerOrders > 0 ? sellerCancels / sellerOrders : 0;

  const buyerBase = Number(buyerProfile?.trustScore ?? 75);
  const sellerBase = Number(sellerProfile?.trustScore ?? 75);

  const buyerScore = clamp(Math.round(buyerBase - buyerDisputeRate * 35), 1, 99);
  const sellerScore = clamp(Math.round(sellerBase - sellerDisputeRate * 30 - sellerCancelRate * 25), 1, 99);

  const riskAverage = (buyerScore + sellerScore) / 2;
  const riskTier = riskAverage >= 80 ? 'low' : riskAverage >= 60 ? 'medium' : 'high';
  const autoReview = buyerScore < 55 || sellerScore < 55 || riskTier === 'high';

  return {
    buyer: buyerScore,
    seller: sellerScore,
    riskTier,
    autoReview,
    evaluatedAt: new Date(),
  };
}
