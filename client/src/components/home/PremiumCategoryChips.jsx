import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cpu, Shirt, Home, Dumbbell, Sparkles, Gamepad2, BookOpen, Car, Layers, Footprints,
} from 'lucide-react';
import { springSnappy } from '../../motion/presets';
import { useStorefrontCategories } from '../../hooks/useBuyerSiteContent';

const ICON_BY_SLUG = {
  clothing: Shirt,
  fashion: Shirt,
  electronics: Cpu,
  shoes: Footprints,
  'home-garden': Home,
  home: Home,
  sports: Dumbbell,
  beauty: Sparkles,
  books: BookOpen,
  automotive: Car,
  toys: Gamepad2,
  gaming: Gamepad2,
};

const FALLBACK_CHIPS = [
  { id: 'all', label: 'All', icon: Layers, href: '/category/all' },
  { id: 'clothing', label: 'Fashion', icon: Shirt, href: '/category/clothing' },
  { id: 'electronics', label: 'Electronics', icon: Cpu, href: '/category/electronics' },
  { id: 'shoes', label: 'Shoes', icon: Footprints, href: '/category/shoes' },
  { id: 'home-garden', label: 'Home', icon: Home, href: '/category/home-garden' },
  { id: 'sports', label: 'Sports', icon: Dumbbell, href: '/category/sports' },
  { id: 'beauty', label: 'Beauty', icon: Sparkles, href: '/category/beauty' },
  { id: 'books', label: 'Books', icon: BookOpen, href: '/category/books' },
  { id: 'automotive', label: 'Auto', icon: Car, href: '/category/automotive' },
  { id: 'toys', label: 'Gaming', icon: Gamepad2, href: '/category/toys' },
];

function buildChipsFromApi(categories) {
  const fromApi = categories.slice(0, 9).map((c) => ({
    id: c.slug,
    label: c.name,
    icon: ICON_BY_SLUG[c.slug] || Layers,
    href: `/category/${encodeURIComponent(c.slug)}`,
  }));
  return [{ id: 'all', label: 'All', icon: Layers, href: '/category/all' }, ...fromApi];
}

export default function PremiumCategoryChips({
  activeId = 'all',
  onSelect,
  selectMode = false,
}) {
  const { data: categories = [] } = useStorefrontCategories();
  const chips =
    categories.length > 0 ? buildChipsFromApi(categories) : FALLBACK_CHIPS;

  return (
    <section className="mob-cat-strip md:px-4 md:pb-2" aria-label="Categories">
      <motion.div
        className="mob-cat-strip-scroll flex overflow-x-auto scrollbar-hide md:gap-2.5 md:pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {chips.map((c) => {
          const Icon = c.icon;
          const active = activeId === c.id;
          const chipClass = 'mob-cat-chip flex shrink-0 flex-col items-center md:w-[56px] md:gap-1';
          const inner = (
            <>
              <motion.span
                whileTap={{ scale: 0.96 }}
                transition={springSnappy}
                className="mob-cat-chip-icon flex items-center justify-center md:h-11 md:w-11 md:rounded-xl"
                data-active={active ? 'true' : 'false'}
              >
                <Icon size={16} strokeWidth={1.65} className="md:hidden" aria-hidden />
                <Icon size={22} strokeWidth={1.65} className="hidden md:block" aria-hidden />
              </motion.span>
              <span
                className="mob-cat-chip-label max-w-full truncate text-center"
                data-active={active ? 'true' : 'false'}
              >
                {c.label}
              </span>
            </>
          );

          if (selectMode && onSelect) {
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`${chipClass} border-0 bg-transparent p-0 cursor-pointer`}
                aria-pressed={active}
                aria-label={c.label}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={c.id}
              to={c.href}
              onClick={() => onSelect?.(c.id)}
              className={chipClass}
            >
              {inner}
            </Link>
          );
        })}
      </motion.div>
    </section>
  );
}
