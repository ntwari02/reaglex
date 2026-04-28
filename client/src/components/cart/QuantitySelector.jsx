import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

export default function QuantitySelector({ quantity, onDecrease, onIncrease, min = 1, max = 99 }) {
  return (
    <div
      className="inline-flex items-center rounded-full overflow-hidden"
      style={{
        border: '1.5px solid var(--border-input)',
        background: 'var(--bg-input)',
      }}
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onDecrease}
        disabled={quantity <= min}
        className="w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onMouseEnter={(e) => { if (quantity > min) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Minus className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
      </motion.button>

      <span
        className="w-8 text-center font-semibold text-sm select-none"
        style={{ color: 'var(--text-primary)' }}
      >
        {quantity}
      </span>

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onIncrease}
        disabled={quantity >= max}
        className="w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onMouseEnter={(e) => { if (quantity < max) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
      </motion.button>
    </div>
  );
}
