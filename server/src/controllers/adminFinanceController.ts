import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { TransactionLog } from '../models/TransactionLog';
import { Order } from '../models/Order';
import { SellerWallet } from '../models/SellerWallet';
import { PayoutRequest } from '../models/PayoutRequest';
import { RefundRequest } from '../models/RefundRequest';
import { Chargeback } from '../models/Chargeback';
import { TaxRule } from '../models/TaxRule';
import { PaymentGatewayConfig } from '../models/PaymentGatewayConfig';
import { ensureCorePaymentGateways } from '../services/paymentGateway.service';
import { FinanceSettings } from '../models/FinanceSettings';
import { EscrowWallet } from '../models/EscrowWallet';
import { User } from '../models/User';
import mongoose from 'mongoose';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

/** GET /api/admin/finance/dashboard - metrics + revenue over time */
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { timeRange = 'monthly' } = req.query;
    const now = new Date();
    let startDate: Date;
    if (timeRange === 'daily') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 84);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }

    const [paymentAgg] = await TransactionLog.aggregate([
      { $match: { type: 'PAYMENT', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const [refundAgg] = await TransactionLog.aggregate([
      { $match: { type: 'REFUND', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [releaseAgg] = await TransactionLog.aggregate([
      { $match: { type: 'RELEASE', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [feeAgg] = await TransactionLog.aggregate([
      { $match: { type: 'FEE', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const failedCount = await TransactionLog.countDocuments({
      type: 'PAYMENT',
      status: { $in: ['failed', 'FAILED'] },
      createdAt: { $gte: startDate },
    });
    const pendingPayoutsAgg = await PayoutRequest.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const chargebacksOpen = await Chargeback.countDocuments({
      status: { $in: ['open', 'under_review'] },
    });
    const escrowWallet = await EscrowWallet.findOne();

    const totalPlatformRevenue = paymentAgg?.total ?? 0;
    const totalSales = paymentAgg?.count ?? 0;
    const totalCommissionEarned = feeAgg?.total ?? 0;
    const totalPayoutsToSellers = releaseAgg?.total ?? 0;
    const pendingPayouts = pendingPayoutsAgg[0]?.total ?? 0;
    const availableBalance = escrowWallet?.totalHeld ?? 0;
    const refundAmount = refundAgg?.total ?? 0;

    const dateFormat =
      timeRange === 'daily' ? '%Y-%m-%d' : timeRange === 'weekly' ? '%Y-%U' : '%Y-%m';
    const revenueDataAgg = await TransactionLog.aggregate([
      { $match: { type: 'PAYMENT', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$createdAt' },
          },
          value: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueData = revenueDataAgg.map((r) => ({
      date: r._id,
      value: r.value,
    }));

    const transactionFeesEstimate = totalPlatformRevenue * 0.014;
    const revenueStreams = {
      commissionEarnings: totalCommissionEarned,
      transactionFees: Math.round(transactionFeesEstimate),
      advertisementPayments: 15000,
      subscriptionFees: 8000,
      penaltiesFines: 2500,
    };

    res.json({
      metrics: {
        totalPlatformRevenue,
        totalSales,
        totalCommissionEarned,
        totalPayoutsToSellers,
        pendingPayouts,
        availableBalance,
        refundAmount,
        totalTransactions: totalSales,
        failedTransactions: failedCount,
        chargebacksCount: chargebacksOpen,
      },
      revenueData,
      revenueStreams,
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load dashboard' });
  }
}

/** GET /api/admin/finance/payouts - list payout requests/history/breakdown */
export async function getPayouts(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { section = 'requests', status, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(String(search), 'i');
      (filter as any).$or = [
        { referenceId: searchRegex },
        ...(mongoose.Types.ObjectId.isValid(String(search)) ? [{ _id: new mongoose.Types.ObjectId(String(search)) }] : []),
      ];
    }

    const total = await PayoutRequest.countDocuments(filter);
    const payouts = await PayoutRequest.find(filter)
      .populate('sellerId', 'fullName email')
      .sort({ requestedDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const list = payouts.map((p: any) => ({
      id: p._id.toString(),
      sellerId: p.sellerId?._id?.toString(),
      sellerName: p.sellerId?.fullName || 'Unknown',
      amount: p.amount,
      status: p.status,
      requestedDate: p.requestedDate,
      scheduledDate: p.scheduledDate,
      completedDate: p.completedDate,
      paymentMethod: p.paymentMethod,
      referenceId: p.referenceId,
      commission: p.commissionDeducted,
      totalEarnings: p.totalEarnings,
      pendingEarnings: p.pendingEarnings,
      availableForWithdrawal: p.availableForWithdrawal,
      disputeHolds: p.disputeHolds,
    }));

    res.json({ payouts: list, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load payouts' });
  }
}

/** POST /api/admin/finance/payouts/:id/approve */
export async function approvePayout(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const payout = await PayoutRequest.findById(id);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });
    if (payout.status !== 'pending') return res.status(400).json({ message: 'Payout is not pending' });
    payout.status = 'processing';
    await payout.save();
    res.json({ message: 'Payout approved', payout: payout.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to approve payout' });
  }
}

/** POST /api/admin/finance/payouts/:id/reject */
export async function rejectPayout(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const payout = await PayoutRequest.findById(id);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });
    if (payout.status !== 'pending') return res.status(400).json({ message: 'Payout is not pending' });
    payout.status = 'failed';
    payout.completedDate = new Date();
    await payout.save();
    res.json({ message: 'Payout rejected', payout: payout.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to reject payout' });
  }
}

/** GET /api/admin/finance/transactions - list with filters */
export async function getTransactions(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { status, paymentMethod, sellerId, startDate, endDate, search, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const match: any = {};
    if (status && status !== 'all') {
      if (status === 'paid') {
        match.type = 'PAYMENT';
        match.status = { $nin: ['failed', 'FAILED'] };
      } else if (status === 'failed') {
        match.type = 'PAYMENT';
        match.status = { $in: ['failed', 'FAILED'] };
      } else if (status === 'refunded') {
        match.type = 'REFUND';
      }
    } else {
      match.type = { $in: ['PAYMENT', 'REFUND'] };
    }
    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId as string);
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) (match.createdAt as any).$gte = new Date(startDate as string);
      if (endDate) (match.createdAt as any).$lte = new Date(endDate as string);
    }

    const logs = await TransactionLog.find(match)
      .populate('orderId', 'orderNumber customer payment paymentMethod')
      .populate('buyerId', 'fullName')
      .populate('sellerId', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const list = logs.map((t: any) => ({
      id: t._id.toString(),
      transactionId: t._id.toString(),
      orderId: t.orderId?._id?.toString() || '',
      orderNumber: t.orderId?.orderNumber || '',
      customerName: t.buyerId?.fullName || t.orderId?.customer || 'Unknown',
      sellerName: t.sellerId?.fullName || 'Unknown',
      paymentMethod: t.orderId?.paymentMethod || t.metadata?.payment_type || 'Card',
      amount: t.amount,
      commission: (t as any).metadata?.platformFee ?? t.amount * 0.1,
      status: t.type === 'REFUND' ? 'refunded' : (t.status === 'failed' || t.status === 'FAILED' ? 'failed' : 'paid'),
      date: t.createdAt,
      referenceCode: t.flutterwaveRef || '',
      gateway: 'Flutterwave',
      isHighRisk: false,
    }));

    let filtered = list;
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      filtered = list.filter(
        (x) =>
          x.transactionId.toLowerCase().includes(s) ||
          x.orderNumber?.toLowerCase().includes(s) ||
          x.customerName?.toLowerCase().includes(s) ||
          x.sellerName?.toLowerCase().includes(s)
      );
    }
    if (paymentMethod && paymentMethod !== 'all') {
      filtered = filtered.filter((x) => x.paymentMethod?.toLowerCase() === (paymentMethod as string).toLowerCase());
    }

    const total = await TransactionLog.countDocuments(match);
    res.json({ transactions: filtered, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load transactions' });
  }
}

/** GET /api/admin/finance/gateways */
export async function getGateways(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    await ensureCorePaymentGateways();
    const gateways = await PaymentGatewayConfig.find().lean();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      gateways: gateways.map((g: any) => ({
        id: g._id.toString(),
        key: g.key,
        name: g.name,
        type: g.type,
        status: g.status,
        isEnabled: g.isEnabled,
        apiKey: g.apiKeyMasked,
        webhookUrl: g.webhookUrl,
        lastChecked: g.lastChecked,
        issues: g.issues || [],
      })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load gateways' });
  }
}

/** PATCH /api/admin/finance/gateways/:id */
export async function updateGateway(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { isEnabled, apiKeyMasked, webhookUrl, testMode } = req.body;
    const g = await PaymentGatewayConfig.findByIdAndUpdate(
      id,
      { ...(isEnabled !== undefined && { isEnabled }), ...(apiKeyMasked !== undefined && { apiKeyMasked }), ...(webhookUrl !== undefined && { webhookUrl }), ...(testMode !== undefined && { testMode }) },
      { new: true }
    )
      .lean();
    if (!g) return res.status(404).json({ message: 'Gateway not found' });
    const row = g as any;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      gateway: {
        _id: row._id,
        id: row._id.toString(),
        key: row.key,
        name: row.name,
        type: row.type,
        status: row.status,
        isEnabled: row.isEnabled,
        apiKeyMasked: row.apiKeyMasked,
        webhookUrl: row.webhookUrl,
        lastChecked: row.lastChecked,
        issues: row.issues || [],
        testMode: row.testMode,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to update gateway' });
  }
}

/** GET /api/admin/finance/refunds */
export async function getRefunds(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    const query = RefundRequest.find(filter)
      .populate('orderId', 'orderNumber')
      .populate('buyerId', 'fullName')
      .populate('sellerId', 'fullName')
      .sort({ requestedDate: -1 })
      .lean();
    const total = await RefundRequest.countDocuments(filter);
    const refunds = await RefundRequest.find(filter)
      .populate('orderId', 'orderNumber')
      .populate('buyerId', 'fullName')
      .populate('sellerId', 'fullName')
      .sort({ requestedDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const list = refunds.map((r: any) => ({
      id: r._id.toString(),
      orderId: r.orderId?.orderNumber || r.orderId?._id?.toString() || '',
      customerName: r.buyerId?.fullName || 'Unknown',
      sellerName: r.sellerId?.fullName || 'Unknown',
      amount: r.amount,
      type: r.type,
      status: r.status,
      reason: r.reason,
      requestedDate: r.requestedDate,
      processedDate: r.processedDate,
      refundMethod: r.refundMethod,
      hasEvidence: r.hasEvidence,
    }));

    res.json({ refunds: list, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load refunds' });
  }
}

/** POST /api/admin/finance/refunds/:id/approve */
export async function approveRefund(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const r = await RefundRequest.findById(id);
    if (!r) return res.status(404).json({ message: 'Refund not found' });
    if (r.status !== 'pending') return res.status(400).json({ message: 'Refund is not pending' });
    r.status = 'approved';
    await r.save();
    res.json({ refund: r.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to approve refund' });
  }
}

/** POST /api/admin/finance/refunds/:id/reject */
export async function rejectRefund(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const r = await RefundRequest.findById(id);
    if (!r) return res.status(404).json({ message: 'Refund not found' });
    if (r.status !== 'pending') return res.status(400).json({ message: 'Refund is not pending' });
    r.status = 'rejected';
    r.processedDate = new Date();
    await r.save();
    res.json({ refund: r.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to reject refund' });
  }
}

/** GET /api/admin/finance/chargebacks */
export async function getChargebacks(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const chargebacks = await Chargeback.find()
      .populate('orderId', 'orderNumber')
      .sort({ date: -1 })
      .lean();
    const list = chargebacks.map((c: any) => ({
      id: c._id.toString(),
      orderId: c.orderId?.orderNumber || c.orderId?._id?.toString() || '',
      customerName: c.customerName || 'Unknown',
      amount: c.amount,
      status: c.status,
      provider: c.provider,
      claimReason: c.claimReason,
      date: c.date,
      evidenceCount: c.evidenceCount || 0,
    }));
    res.json({ chargebacks: list });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load chargebacks' });
  }
}

/** GET /api/admin/finance/tax-rules */
export async function getTaxRules(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const rules = await TaxRule.find().sort({ createdAt: -1 }).lean();
    res.json({
      taxRules: rules.map((r: any) => ({
        id: r._id.toString(),
        name: r.name,
        type: r.type,
        rate: r.rate,
        location: r.location,
        category: r.category,
        appliesTo: r.appliesTo,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load tax rules' });
  }
}

/** POST /api/admin/finance/tax-rules */
export async function createTaxRule(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { name, type, rate, location, category, appliesTo, status } = req.body;
    const rule = await TaxRule.create({
      name: name || 'New Rule',
      type: type || 'standard',
      rate: rate ?? 0,
      location,
      category,
      appliesTo: appliesTo || 'all',
      status: status || 'active',
    });
    res.status(201).json({ taxRule: rule.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to create tax rule' });
  }
}

/** PUT /api/admin/finance/tax-rules/:id */
export async function updateTaxRule(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { name, type, rate, location, category, appliesTo, status } = req.body;
    const rule = await TaxRule.findByIdAndUpdate(
      id,
      { ...(name !== undefined && { name }), ...(type !== undefined && { type }), ...(rate !== undefined && { rate }), ...(location !== undefined && { location }), ...(category !== undefined && { category }), ...(appliesTo !== undefined && { appliesTo }), ...(status !== undefined && { status }) },
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'Tax rule not found' });
    res.json({ taxRule: rule.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to update tax rule' });
  }
}

/** DELETE /api/admin/finance/tax-rules/:id */
export async function deleteTaxRule(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const rule = await TaxRule.findByIdAndDelete(id);
    if (!rule) return res.status(404).json({ message: 'Tax rule not found' });
    res.json({ message: 'Tax rule deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to delete tax rule' });
  }
}

/** GET /api/admin/finance/reports - list report types / generated */
export async function getReports(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const reports = [
      { id: 'RPT-001', name: 'Daily Revenue Report', type: 'daily', date: new Date().toISOString().slice(0, 10) },
      { id: 'RPT-002', name: 'Weekly Revenue Report', type: 'weekly', date: new Date().toISOString().slice(0, 10) },
      { id: 'RPT-003', name: 'Monthly Revenue Report', type: 'monthly', date: new Date().toISOString().slice(0, 10) },
      { id: 'RPT-004', name: 'Yearly Revenue Report', type: 'yearly', date: new Date().toISOString().slice(0, 10) },
      { id: 'RPT-005', name: 'Top Earning Sellers', type: 'sellers', date: new Date().toISOString().slice(0, 10) },
      { id: 'RPT-006', name: 'Loss Report (Refunds & Chargebacks)', type: 'losses', date: new Date().toISOString().slice(0, 10) },
      { id: 'RPT-007', name: 'Profit Summary', type: 'profit', date: new Date().toISOString().slice(0, 10) },
    ];
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load reports' });
  }
}

/** POST /api/admin/finance/reports/generate */
export async function generateReport(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { reportType, month, year, sellerId, paymentMethod, format, emailReport } = req.body;
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
    const match: any = { createdAt: { $gte: start, $lte: end } };
    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId);

    const [paymentAgg] = await TransactionLog.aggregate([
      { $match: { type: 'PAYMENT', ...match } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [refundAgg] = await TransactionLog.aggregate([
      { $match: { type: 'REFUND', ...match } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [releaseAgg] = await TransactionLog.aggregate([
      { $match: { type: 'RELEASE', ...match } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [feeAgg] = await TransactionLog.aggregate([
      { $match: { type: 'FEE', ...match } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const summary = {
      totalRevenue: paymentAgg?.total ?? 0,
      totalCommission: feeAgg?.total ?? 0,
      totalPayouts: releaseAgg?.total ?? 0,
      totalRefunds: refundAgg?.total ?? 0,
      totalNetProfit: (feeAgg?.total ?? 0) - (refundAgg?.total ?? 0),
    };
    res.json({ message: 'Report generated', reportType, month, year, summary, format: format || 'pdf', emailReport: !!emailReport });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to generate report' });
  }
}

/** POST /api/admin/finance/transactions/export */
export async function exportTransactionLogs(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { startDate, endDate, paymentStatus, paymentMethod, sellerId, orderId, format } = req.body;
    const match: any = { type: { $in: ['PAYMENT', 'REFUND', 'RELEASE', 'FEE'] } };
    if (startDate) match.createdAt = match.createdAt || {}; (match.createdAt as any).$gte = new Date(startDate);
    if (endDate) match.createdAt = match.createdAt || {}; (match.createdAt as any).$lte = new Date(endDate);
    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId);
    if (orderId) match.orderId = new mongoose.Types.ObjectId(orderId);

    const logs = await TransactionLog.find(match)
      .populate('orderId', 'orderNumber')
      .populate('buyerId', 'fullName')
      .populate('sellerId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const rows = logs.map((t: any) => ({
      transactionId: t._id.toString(),
      orderId: t.orderId?.orderNumber || '',
      customer: t.buyerId?.fullName || '',
      seller: t.sellerId?.fullName || '',
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      createdAt: t.createdAt,
    }));
    res.json({ message: 'Export ready', format: format || 'csv', rowCount: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to export logs' });
  }
}

/** GET /api/admin/finance/settings */
export async function getFinanceSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let settings = await FinanceSettings.findById('platform').lean();
    if (!settings) {
      await FinanceSettings.create({ _id: 'platform' });
      settings = await FinanceSettings.findById('platform').lean();
    }
    res.json({
      settings: {
        currency: settings?.currency ?? 'USD',
        globalCommissionRate: settings?.globalCommissionRate ?? 10,
        enableVat: settings?.enableVat ?? true,
        vatRate: settings?.vatRate ?? 10,
        minimumWithdrawal: settings?.minimumWithdrawal ?? 50,
        automaticPayoutSchedule: settings?.automaticPayoutSchedule ?? 'weekly',
        enableFraudChecks: settings?.enableFraudChecks ?? true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load settings' });
  }
}

/** PUT /api/admin/finance/settings */
export async function updateFinanceSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { currency, globalCommissionRate, enableVat, vatRate, minimumWithdrawal, automaticPayoutSchedule, enableFraudChecks } = req.body;
    const settings = await FinanceSettings.findByIdAndUpdate(
      'platform',
      {
        ...(currency !== undefined && { currency }),
        ...(globalCommissionRate !== undefined && { globalCommissionRate }),
        ...(enableVat !== undefined && { enableVat }),
        ...(vatRate !== undefined && { vatRate }),
        ...(minimumWithdrawal !== undefined && { minimumWithdrawal }),
        ...(automaticPayoutSchedule !== undefined && { automaticPayoutSchedule }),
        ...(enableFraudChecks !== undefined && { enableFraudChecks }),
      },
      { new: true, upsert: true }
    );
    res.json({ settings: settings?.toObject() });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to update settings' });
  }
}

/** GET /api/admin/finance/sellers - for dropdowns (sellers list) */
export async function getSellersList(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const sellers = await User.find({ role: 'seller' }).select('_id fullName email').limit(500).lean();
    res.json({
      sellers: sellers.map((s: any) => ({ id: s._id.toString(), name: s.fullName || s.email })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Failed to load sellers' });
  }
}
