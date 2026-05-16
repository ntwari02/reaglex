import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cpu, Shirt, Home, Dumbbell, Sparkles, Gamepad2, BookOpen, Car, Layers, MoreHorizontal,
} from 'lucide-react';
import { springSnappy } from '../../motion/presets';

const CHIPS = [
  { id: 'all', label: 'All', icon: Layers, href: '/search' },
  { id: 'fashion', label: 'Fashion', icon: Shirt, href: '/category/clothing' },
  { id: 'electronics', label: 'Electronics', icon: Cpu, href: '/category/electronics' },
  { id: 'home', label: 'Home', icon: Home, href: '/category/home-garden' },
  { id: 'sports', label: 'Sports', icon: Dumbbell, href: '/category/sports' },
  { id: 'beauty', label: 'Beauty', icon: Sparkles, href: '/category/beauty' },
  { id: 'books', label: 'Books', icon: BookOpen, href: '/category/books' },
  { id: 'auto', label: 'Auto', icon: Car, href: '/category/automotive' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, href: '/category/toys' },
  { id: 'more', label: 'More', icon: MoreHorizontal, href: '/products' },
];

export default function PremiumCategoryChips({ activeId = 'all', onSelect }) {
  return (
    <section className="px-4 pb-2" aria-label="Categories">
      <motion.div
        className="-mx-1 flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {CHIPS.map((c) => {
          const Icon = c.icon;
          const active = activeId === c.id;
          return (
            <Link
              key={c.id}
              to={c.href}
              onClick={() => onSelect?.(c.id)}
              className="flex w-[68px] shrink-0 flex-col items-center gap-2"
            >
              <motion.span
                whileTap={{ scale: 0.94 }}
                transition={springSnappy}
                className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] transition-shadow duration-300"
                style={{
                  background: active ? 'var(--brand-primary)' : 'var(--card-bg)',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  border: active
                    ? '1px solid color-mix(in srgb, var(--brand-primary) 80%, transparent)'
                    : '1px solid color-mix(in srgb, var(--border-card) 70%, transparent)',
                  boxShadow: active
                    ? '0 8px 28px color-mix(in srgb, var(--brand-primary) 32%, transparent)'
                    : 'var(--shadow-xs)',
                }}
              >
                <Icon size={22} strokeWidth={1.65} aria-hidden />
              </motion.span>
              <span
                className="max-w-full truncate text-center text-[11px] font-medium leading-tight"
                style={{ color: active ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
              >
                {c.label}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </section>
  );
}
