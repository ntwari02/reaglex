import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD = 50;

export default function CartSummary({ subtotal, onCheckout }) {
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
        style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Truck className="w-4 h-4" style={{ color: shippingFree ? '#22c55e' : '#6b7280' }} />
          <span className="text-xs font-medium" style={{ color: '#374151' }}>
            {shippingFree
              ? '🎉 Congrats! You get free standard shipping.'
              : `Add $${remaining.toFixed(2)} more for free shipping.`}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: shippingFree
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #ff8c42, #ff5f00)',
            }}
          />
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6b7280' }}>Subtotal</span>
          <span className="font-semibold" style={{ color: '#111827' }}>
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6b7280' }}>Shipping</span>
          <span
            className="font-semibold"
            style={{ color: shippingFree ? '#22c55e' : '#111827' }}
          >
            {shippingFree ? 'FREE' : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6b7280' }}>
            Subtotal&nbsp;<span style={{ fontSize: '11px', color: '#9ca3af' }}>INCL. VAT (10%)</span>
          </span>
          <span className="font-semibold" style={{ color: '#111827' }}>
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Checkout */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2, boxShadow: '0 14px 36px rgba(255,140,66,0.4)' }}
        whileTap={{ scale: 0.98 }}
        onClick={onCheckout}
        className="w-full py-4 text-sm font-bold tracking-widest uppercase rounded-2xl text-white"
        style={{
          background: 'linear-gradient(135deg, #ff8c42, #ff5f00)',
          letterSpacing: '0.12em',
          boxShadow: '0 8px 24px rgba(255,140,66,0.3)',
        }}
      >
        Checkout
      </motion.button>

      <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
        🔒 Secure checkout · SSL encrypted
      </p>
    </div>
  );
}
