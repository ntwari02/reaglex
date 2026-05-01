import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';

const FREE_SHIPPING_THRESHOLD = 50;

export default function CartSummary({ subtotal, onCheckout }) {
  const currencyPricing = useCurrencyPricing();
  const remaining   = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress    = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const shipping    = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 4.99;
  const tax         = subtotal * 0.1;
  const total       = subtotal + shipping + tax;
  const shippingFree = shipping === 0;

  return (
    <div className="space-y-5">
      {/* Free-shipping progress */}
      <div
        className="p-4 rounded-2xl"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-card)',
        }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Truck className="w-4 h-4" style={{ color: shippingFree ? 'var(--text-in-stock)' : 'var(--text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {shippingFree
              ? '🎉 Congrats! You get free standard shipping.'
              : `Add ${currencyPricing.formatLocalWithUsd(remaining)} more for free shipping.`}
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--divider-strong)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: shippingFree
                ? 'var(--accent-success-gradient)'
                : 'var(--gradient-brand-bar)',
            }}
          />
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-2">
        {[
          { label: 'Subtotal', value: currencyPricing.formatLocalWithUsd(subtotal), accent: false },
          { label: 'Shipping', value: shippingFree ? 'FREE' : currencyPricing.formatLocalWithUsd(shipping), accent: shippingFree },
          { label: 'Total (incl. VAT 10%)', value: currencyPricing.formatLocalWithUsd(total), accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span
              className="font-semibold"
              style={{ color: accent ? 'var(--text-in-stock)' : 'var(--text-primary)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Checkout */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2, boxShadow: 'var(--shadow-cta-hover)' }}
        whileTap={{ scale: 0.98 }}
        onClick={onCheckout}
        className="w-full py-4 text-sm font-bold tracking-widest uppercase rounded-2xl"
        style={{
          background: 'var(--gradient-brand-cta)',
          color: 'var(--text-on-accent)',
          letterSpacing: '0.12em',
          boxShadow: 'var(--shadow-cta)',
        }}
      >
        Checkout
      </motion.button>

      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        🔒 Secure checkout · SSL encrypted
      </p>
    </div>
  );
}
