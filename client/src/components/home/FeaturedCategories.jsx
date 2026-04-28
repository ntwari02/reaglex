import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Cpu, Shirt, Home, Dumbbell, Sparkles, Gamepad2, BookOpen, Car } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const CATS = [
  {
    id: 'electronics',
    label: 'Electronics',
    text: 'Phones, laptops, audio & more',
    icon: Cpu,
    href: '/search?category=electronics',
    img: 'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=800&q=85',
    span: 'col-span-2 row-span-2',  // large card
    imgClass: 'h-full',
    accent: '#6366f1',
  },
  {
    id: 'fashion',
    label: 'Fashion',
    text: 'Clothing, shoes & accessories',
    icon: Shirt,
    href: '/search?category=fashion',
    img: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#ec4899',
  },
  {
    id: 'home',
    label: 'Home & Living',
    text: 'Furniture, decor & kitchen',
    icon: Home,
    href: '/search?category=home',
    img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#10b981',
  },
  {
    id: 'sports',
    label: 'Sports',
    text: 'Gear, supplements & activewear',
    icon: Dumbbell,
    href: '/search?category=sports',
    img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#f59e0b',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    text: 'Skincare, makeup & fragrance',
    icon: Sparkles,
    href: '/search?category=beauty',
    img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#f43f5e',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    text: 'Consoles, games & peripherals',
    icon: Gamepad2,
    href: '/search?category=gaming',
    img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#8b5cf6',
  },
  {
    id: 'books',
    label: 'Books',
    text: 'Fiction, learning & more',
    icon: BookOpen,
    href: '/search?category=books',
    img: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#0ea5e9',
  },
  {
    id: 'auto',
    label: 'Automotive',
    text: 'Parts, accessories & tools',
    icon: Car,
    href: '/search?category=automotive',
    img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=85',
    span: 'col-span-1 row-span-1',
    imgClass: 'h-full',
    accent: '#ef4444',
  },
];

/* ─── Card component ─────────────────────────────────────────────────────── */
function CategoryCard({ cat, index, isLarge, isDark }) {
  const Icon = cat.icon;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl group cursor-pointer ${cat.span}`}
      style={{
        background: isDark ? 'var(--bg-card, #1e2235)' : '#f4f4f6',
        minHeight: isLarge ? 420 : 200,
      }}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.015 }}
    >
      <Link to={cat.href} className="block h-full" tabIndex={-1} aria-label={cat.label}>
        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <img
            src={cat.img}
            alt={cat.label}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: isLarge
                ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 60%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.08) 55%)',
            }}
          />
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Icon badge */}
          <div
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 transition-transform duration-300 group-hover:-translate-y-0.5"
            style={{ background: cat.accent + '33', border: `1px solid ${cat.accent}55` }}
          >
            <Icon size={16} style={{ color: cat.accent }} />
          </div>

          <p
            className={`font-bold leading-tight mb-1 ${isLarge ? 'text-2xl' : 'text-base'}`}
            style={{ color: '#fff' }}
          >
            {cat.label}
          </p>

          <p
            className={`leading-snug line-clamp-1 transition-all duration-300 group-hover:opacity-100 ${isLarge ? 'text-sm opacity-80' : 'text-xs opacity-70'}`}
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {cat.text}
          </p>

          {/* Hover CTA */}
          <div
            className="mt-3 overflow-hidden"
            style={{ maxHeight: 0, transition: 'max-height 0.3s ease' }}
          >
            <span className="text-xs font-semibold" style={{ color: cat.accent }}>
              Shop now →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Main section ───────────────────────────────────────────────────────── */
export default function FeaturedCategories() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const headerRef = useRef(null);
  const inView = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <section
      className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-20"
      style={{ background: isDark ? 'var(--bg-primary, #0d0f1c)' : '#fafafa' }}
    >
      {/* Header */}
      <div ref={headerRef} className="mb-10">
        <motion.p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
          style={{ color: isDark ? '#616680' : '#9ca3af' }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Browse by Category
        </motion.p>
        <motion.h2
          className="font-black leading-none"
          style={{
            color: isDark ? '#e2e4ed' : '#0f172a',
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontFamily: "'Times New Roman', Georgia, serif",
            letterSpacing: '-0.02em',
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          SHOP BY CATEGORY
        </motion.h2>
      </div>

      {/* Bento grid – desktop */}
      <div className="hidden md:grid grid-cols-4 grid-rows-[240px_240px] gap-3 auto-rows-[240px]">
        {CATS.map((cat, i) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            index={i}
            isLarge={i === 0}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Mobile – 2 col simple grid */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {CATS.map((cat, i) => (
          <motion.div
            key={cat.id}
            className="relative overflow-hidden rounded-xl"
            style={{ height: 170 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
          >
            <Link to={cat.href} className="block h-full">
              <img
                src={cat.img}
                alt={cat.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 55%)' }}
              />
              <div className="absolute bottom-0 left-0 p-3">
                <p className="text-white font-bold text-sm leading-tight">{cat.label}</p>
                <p className="text-white/60 text-xs mt-0.5">{cat.text}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
