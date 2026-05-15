import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Landmark, Loader2, Lock, Wallet } from 'lucide-react';
import { paymentAPI } from '@/services/api';

type WalletData = {
  wallet: { currency: string; held: number; withdrawable: number; withdrawn: number };
  escrow?: { heldOrders?: number; releasedOrders?: number };
  fees?: { platform?: number; processing?: number; sellerNet?: number };
  payoutMethods?: Array<{
    id: string;
    method: string;
    isDefault?: boolean;
    mobileMoneyProvider?: string;
    verificationStatus?: string;
  }>;
  recentTransactions?: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status?: string;
    createdAt?: string;
    orderId?: string;
  }>;
};

const money = (n: number, c = 'USD') => `${c} ${Number(n || 0).toLocaleString()}`;

export default function PaymentsFinance() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPayoutMethodId, setSelectedPayoutMethodId] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const withdrawable = useMemo(() => Number(data?.wallet?.withdrawable || 0), [data?.wallet?.withdrawable]);
  const withdrawAmount = useMemo(() => Math.round(Number(amount || 0)), [amount]);
  const canSubmit = withdrawAmount > 0 && withdrawAmount <= withdrawable && password.trim().length >= 4;

  const load = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await paymentAPI.sellerWallet();
      setData(res || null);
      const methods = Array.isArray(res?.payoutMethods) ? res.payoutMethods : [];
      const d = methods.find((m: any) => m?.isDefault) || methods[0];
      setSelectedPayoutMethodId(d?.id || '');
    } catch (e: any) {
      setFeedback({ tone: 'err', text: e?.response?.data?.message || 'Failed to load wallet data.' });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const withdraw = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const out = await paymentAPI.sellerWithdraw(withdrawAmount, password, selectedPayoutMethodId || undefined);
      setFeedback({ tone: 'ok', text: out?.message || 'Withdrawal completed successfully.' });
      setAmount('');
      setPassword('');
      await load();
    } catch (e: any) {
      setFeedback({ tone: 'err', text: e?.response?.data?.message || 'Withdrawal failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments & Escrow</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Clear money state: held while order is not delivered, withdrawable after escrow release.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MoneyCard icon={Lock} label="Held in escrow" value={money(data?.wallet?.held || 0, data?.wallet?.currency || 'USD')} />
            <MoneyCard icon={Wallet} label="Withdrawable now" value={money(withdrawable, data?.wallet?.currency || 'USD')} />
            <MoneyCard icon={Landmark} label="Already withdrawn" value={money(data?.wallet?.withdrawn || 0, data?.wallet?.currency || 'USD')} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Escrow & Fees management</h2>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Held orders" value={String(data?.escrow?.heldOrders || 0)} />
                <Stat label="Released orders" value={String(data?.escrow?.releasedOrders || 0)} />
                <Stat label="Platform fees" value={money(data?.fees?.platform || 0, data?.wallet?.currency || 'USD')} />
                <Stat label="Processing fees" value={money(data?.fees?.processing || 0, data?.wallet?.currency || 'USD')} />
              </div>
              <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 p-3 text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  Net seller earnings tracked: <strong>{money(data?.fees?.sellerNet || 0, data?.wallet?.currency || 'USD')}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Secure withdrawal</h2>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Protected operation: requires account password confirmation.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm"
                />
                <select
                  value={selectedPayoutMethodId}
                  onChange={(e) => setSelectedPayoutMethodId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm"
                >
                  {(data?.payoutMethods || []).length === 0 ? (
                    <option value="">No payout method configured</option>
                  ) : (
                    (data?.payoutMethods || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.method} {m.mobileMoneyProvider ? `(${m.mobileMoneyProvider})` : ''} {m.isDefault ? '• default' : ''} {m.verificationStatus && m.verificationStatus !== 'verified' ? '• unverified' : ''}
                      </option>
                    ))
                  )}
                </select>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Confirm password"
                  type="password"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm"
                />
                <button
                  onClick={() => void withdraw()}
                  disabled={!canSubmit || submitting}
                  className="w-full min-h-[44px] rounded-lg bg-gradient-to-r from-red-500 to-[var(--brand-primary)] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Withdraw funds'}
                </button>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Available: {money(withdrawable, data?.wallet?.currency || 'USD')}
                </p>
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${
                feedback.tone === 'ok'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300'
              }`}
            >
              {feedback.tone === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent finance activity</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentTransactions || []).map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{tx.type}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{money(tx.amount, tx.currency)}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{tx.status || 'OK'}</td>
                      <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-5 text-center text-gray-500 dark:text-gray-400">
                        No transaction history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MoneyCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

