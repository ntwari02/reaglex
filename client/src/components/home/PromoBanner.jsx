import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/* ─── Countdown timer ────────────────────────────────────────────────────── */
function useCountdown(targetHours = 12) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });

  useEffect(() => {
    const end = Date.now() + targetHours * 3600 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHours]);

  return time;
}

function TimerBlock({ value, label, isDark }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl tabular-nums"
        style={{
          background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          color: isDark ? '#e2e4ed' : '#0f172a',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-xs mt-1 font-medium" style={{ color: isDark ? '#616680' : '#9ca3af' }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Banner ─────────────────────────────────────────────────────────────── */
export default function PromoBanner() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { h, m, s } = useCountdown(11);

  return (
    <section
      ref={ref}
      className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-12"
      style={{ background: isDark ? 'var(--bg-primary, #0d0f1c)' : '#fafafa' }}
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: isDark ? '#0f111a' : '#f4f4f6',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
          minHeight: 340,
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Background image — right side, blended */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=80"
            alt="Fashion collection"
            className="absolute right-0 top-0 h-full w-1/2 object-cover object-center"
            style={{ opacity: isDark ? 0.08 : 0.12 }}
            loading="lazy"
            decoding="async"
            width="1400"
            height="900"
          />
          {/* Fade from left so text stays readable */}
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(to right, #0f111a 45%, transparent 100%)'
                : 'linear-gradient(to right, #f4f4f6 45%, transparent 100%)',
            }}
          />
        </div>

        {/* Decorative circles */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
        />
        <div
          className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full pointer-events-none"
          style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-8 p-8 sm:p-12 lg:p-16">
          {/* Left text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.p
              className="text-xs font-bold tracking-[0.22em] uppercase mb-3 flex items-center justify-center lg:justify-start gap-2"
              style={{ color: isDark ? '#616680' : '#9ca3af' }}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Clock size={11} />
              Limited Time Offer
            </motion.p>

            <motion.h2
              className="font-black leading-none mb-4 whitespace-pre-line"
              style={{
                color: isDark ? '#e2e4ed' : '#0f172a',
                fontSize: 'clamp(2rem, 5vw, 4rem)',
                fontFamily: "'Times New Roman', Georgia, serif",
                letterSpacing: '-0.02em',
              }}
              initial={{ opacity: 0, y: 22 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.22 }}
            >
              {'UP TO 70%\nOFF EVERYTHING'}
            </motion.h2>

            <motion.p
              className="text-sm leading-relaxed mb-8 max-w-sm mx-auto lg:mx-0"
              style={{ color: isDark ? '#616680' : '#6b7280' }}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.3 }}
            >
              The biggest sale of the season is live. Thousands of products across every category, all at once.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.38 }}
            >
              <Link
                to="/search?sale=true"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300 hover:gap-5"
                style={{
                  background: isDark ? '#e2e4ed' : '#0f172a',
                  color: isDark ? '#0f111a' : '#fff',
                  boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.18)',
                }}
              >
                SHOP THE SALE
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300"
                style={{
                  background: 'transparent',
                  color: isDark ? '#9da3be' : '#374151',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'}`,
                }}
              >
                BROWSE ALL
              </Link>
            </motion.div>
          </div>

          {/* Right: countdown */}
          <motion.div
            className="flex flex-col items-center lg:items-end gap-4 lg:pt-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.35 }}
          >
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: isDark ? '#616680' : '#9ca3af' }}
            >
              Ends In
            </p>
            <div className="flex items-end gap-2">
              <TimerBlock value={h} label="HRS" isDark={isDark} />
              <span
                className="font-black text-2xl mb-6"
                style={{ color: isDark ? '#3d4159' : '#d1d5db' }}
              >
                :
              </span>
              <TimerBlock value={m} label="MIN" isDark={isDark} />
              <span
                className="font-black text-2xl mb-6"
                style={{ color: isDark ? '#3d4159' : '#d1d5db' }}
              >
                :
              </span>
              <TimerBlock value={s} label="SEC" isDark={isDark} />
            </div>

            {/* Category quick links */}
            <div className="flex gap-2 mt-2">
              {['Electronics', 'Fashion', 'Home'].map((cat) => (
                <Link
                  key={cat}
                  to={`/search?category=${cat.toLowerCase()}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                    color: isDark ? '#9da3be' : '#374151',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                  }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
