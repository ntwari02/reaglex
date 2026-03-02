import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

export default function QuantitySelector({ quantity, onDecrease, onIncrease, min = 1, max = 99 }) {
  return (
    <div
      className="inline-flex items-center rounded-full overflow-hidden"
      style={{ border: '1.5px solid #e5e7eb', background: 'white' }}
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onDecrease}
        disabled={quantity <= min}
        className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="w-3 h-3" style={{ color: '#374151' }} />
      </motion.button>

      <span
        className="w-8 text-center font-semibold text-sm select-none"
        style={{ color: '#111827' }}
      >
        {quantity}
      </span>

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onIncrease}
        disabled={quantity >= max}
        className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus className="w-3 h-3" style={{ color: '#374151' }} />
      </motion.button>
    </div>
  );
}
