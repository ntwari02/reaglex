import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { SellerSettings } from '../models/SellerSettings';
import { Product } from '../models/Product';
import { getSellerKycStatus, isIdentityKycComplete } from '../services/sellerKyc.service';

/** GET /api/admin/kyc-queues */
export async function getKycQueues(req: AuthenticatedRequest, res: Response) {
  try {
    const sellers = await User.find({ role: 'seller' })
      .select('_id fullName email phone sellerVerificationStatus isSellerVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const sellerIds = sellers.map((s) => s._id);
    const settingsList = await SellerSettings.find({ sellerId: { $in: sellerIds } })
      .select('sellerId identityKyc kycOnboarding businessName')
      .lean();
    const settingsBySeller = new Map(settingsList.map((s) => [String(s.sellerId), s]));

    const pendingProductsAgg = await Product.aggregate([
      { $match: { publicationStatus: 'pending_verification' } },
      { $group: { _id: '$sellerId', count: { $sum: 1 } } },
    ]);
    const pendingCountBySeller = new Map(
      pendingProductsAgg.map((r) => [String(r._id), r.count as number]),
    );

    const pendingSellers = [];
    const microblinkCompleteAwaitingAdmin = [];

    for (const seller of sellers) {
      const sid = String(seller._id);
      const settings = settingsBySeller.get(sid);
      const identityComplete = isIdentityKycComplete(settings?.identityKyc);
      const platformApproved =
        seller.isSellerVerified && seller.sellerVerificationStatus === 'approved';

      if (!platformApproved) {
        pendingSellers.push({
          sellerId: sid,
          fullName: seller.fullName,
          email: seller.email,
          phone: seller.phone,
          sellerVerificationStatus: seller.sellerVerificationStatus,
          isSellerVerified: seller.isSellerVerified,
          identityKycStep: settings?.identityKyc?.step || 'not_started',
          identityComplete,
          documentVerified: Boolean(settings?.identityKyc?.document?.verified),
          faceVerified: Boolean(settings?.identityKyc?.face?.verified),
          completeLaterAt: settings?.kycOnboarding?.completeLaterAt,
          productsPendingPublication: pendingCountBySeller.get(sid) || 0,
          createdAt: seller.createdAt,
        });
      }

      if (identityComplete && !platformApproved) {
        microblinkCompleteAwaitingAdmin.push(sid);
      }
    }

    const pendingProducts = await Product.find({ publicationStatus: 'pending_verification' })
      .select('_id name sku sellerId publicationStatus status createdAt price')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const sellerNameById = new Map(sellers.map((s) => [String(s._id), s.fullName || s.email]));

    return res.json({
      summary: {
        sellersPendingVerification: pendingSellers.length,
        sellersMicroblinkCompleteAwaitingAdmin: microblinkCompleteAwaitingAdmin.length,
        productsPendingPublication: pendingProducts.length,
      },
      pendingSellers,
      pendingProducts: pendingProducts.map((p) => ({
        productId: String(p._id),
        name: p.name,
        sku: p.sku,
        sellerId: String(p.sellerId),
        sellerName: sellerNameById.get(String(p.sellerId)) || 'Unknown',
        publicationStatus: p.publicationStatus,
        inventoryStatus: p.status,
        price: p.price,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: unknown) {
    console.error('getKycQueues error:', error);
    return res.status(500).json({ message: 'Failed to load KYC queues' });
  }
}

/** GET /api/admin/kyc-queues/sellers/:sellerId */
export async function getSellerKycQueueDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const { sellerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: 'Invalid seller ID' });
    }
    const status = await getSellerKycStatus(sellerId);
    return res.json(status);
  } catch (error: unknown) {
    console.error('getSellerKycQueueDetail error:', error);
    return res.status(500).json({ message: 'Failed to load seller KYC detail' });
  }
}
