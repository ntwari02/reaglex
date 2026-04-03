import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ComparePlan = {
  tier_id: string;
  tier_name: string;
  name: string;
  price: number;
  currency?: string;
  billing_cycle?: string;
  features?: string[];
  is_popular?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  plans: ComparePlan[];
  currentTierId?: string;
  onSelectTier?: (tierId: string) => void;
};

function fmtMoney(price: number, currency = 'USD') {
  if (!price) return 'Free';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
}

export default function PlanCompareModal({ open, onClose, plans, currentTierId, onSelectTier }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl flex flex-col"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-emerald-500" />
                  Plan comparison
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Catalog from your database — upgrade paths mirror seller checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => {
                const current = p.tier_id === currentTierId;
                return (
                  <div
                    key={p.tier_id}
                    className={`relative rounded-2xl border p-5 flex flex-col transition-shadow ${
                      p.is_popular
                        ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-gray-900 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40'
                    }`}
                  >
                    {p.is_popular && (
                      <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{p.tier_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{p.name}</p>
                    <p className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
                      {fmtMoney(p.price, p.currency)}
                      {p.price > 0 && (
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                          /{p.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </p>
                    <ul className="mt-4 space-y-2 flex-1 text-sm text-gray-600 dark:text-gray-300">
                      {(p.features || []).slice(0, 8).map((f) => (
                        <li key={f} className="flex gap-2">
                          <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {onSelectTier && (
                      <Button
                        className="mt-6 w-full"
                        variant={current ? 'secondary' : 'default'}
                        disabled={current}
                        onClick={() => {
                          onSelectTier(p.tier_id);
                          onClose();
                        }}
                      >
                        {current ? 'Current plan' : 'Use this tier'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
