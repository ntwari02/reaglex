import mongoose from 'mongoose';
import { InternalWallet, InternalWalletType } from '../models/InternalWallet';

export async function getOrCreateWallet(userId: string, walletType: InternalWalletType, currency = 'USD') {
  const uid = new mongoose.Types.ObjectId(userId);
  let wallet = await InternalWallet.findOne({ userId: uid, walletType });
  if (!wallet) {
    wallet = await InternalWallet.create({ userId: uid, walletType, currency, balance: 0, lockedBalance: 0 });
  }
  return wallet;
}

export async function creditWallet(params: {
  userId: string;
  walletType: InternalWalletType;
  amount: number;
  currency?: string;
  reference?: string;
}) {
  const wallet = await getOrCreateWallet(params.userId, params.walletType, params.currency || 'USD');
  wallet.balance = Math.round((wallet.balance + Math.max(0, params.amount)) * 100) / 100;
  if (params.reference) {
    wallet.metadata = { ...(wallet.metadata || {}), lastReference: params.reference };
  }
  await wallet.save();
  return wallet;
}

export async function debitWallet(params: {
  userId: string;
  walletType: InternalWalletType;
  amount: number;
}) {
  const wallet = await getOrCreateWallet(params.userId, params.walletType);
  if (wallet.balance < params.amount) throw new Error('Insufficient wallet balance');
  wallet.balance = Math.round((wallet.balance - params.amount) * 100) / 100;
  await wallet.save();
  return wallet;
}

export async function transferWallets(params: {
  fromUserId: string;
  fromType: InternalWalletType;
  toUserId: string;
  toType: InternalWalletType;
  amount: number;
  currency?: string;
}) {
  await debitWallet({ userId: params.fromUserId, walletType: params.fromType, amount: params.amount });
  await creditWallet({
    userId: params.toUserId,
    walletType: params.toType,
    amount: params.amount,
    currency: params.currency,
    reference: `transfer_from_${params.fromType}`,
  });
  return { success: true };
}

export async function getWalletSummary(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const wallets = await InternalWallet.find({ userId: uid }).lean();
  return wallets.map((w) => ({
    walletType: w.walletType,
    currency: w.currency,
    balance: w.balance,
    lockedBalance: w.lockedBalance,
    available: Math.max(0, w.balance - w.lockedBalance),
  }));
}
