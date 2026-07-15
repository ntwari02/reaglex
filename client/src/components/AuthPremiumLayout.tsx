import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useHeroCatalogProducts } from '../hooks/useHeroCatalogProducts';
import { getProductHeroImage } from '../lib/productImage';
import '../styles/auth-fusion.css';

interface AuthPremiumLayoutProps {
  children: ReactNode;
  /** @deprecated Layout is unified; prop kept for legacy route wrappers */
  currentView?: string;
}

function AuthCircuitPattern({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="agf-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="var(--agf-brand, #ff6b00)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M0 120 H200 L280 200 H520 L600 120 H800 M0 380 H160 L240 460 H560 L640 380 H800 M120 0 V600 M400 0 V600 M680 0 V600"
        fill="none"
        stroke="url(#agf-line-grad)"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <circle cx="200" cy="120" r="3" fill="var(--agf-brand, #ff6b00)" opacity="0.7" />
      <circle cx="600" cy="120" r="3" fill="var(--agf-brand, #ff6b00)" opacity="0.7" />
      <circle cx="240" cy="460" r="3" fill="var(--agf-brand, #ff6b00)" opacity="0.5" />
      <circle cx="640" cy="380" r="3" fill="var(--agf-brand, #ff6b00)" opacity="0.5" />
    </svg>
  );
}

export default function AuthPremiumLayout({ children }: AuthPremiumLayoutProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const reduceMotion = useReducedMotion();
  const { data: products = [] } = useHeroCatalogProducts(3);
  const heroImg = products.map((p) => getProductHeroImage(p)).find(Boolean) || '/auth-3d.png';

  return (
    <div
      className={`auth-fusion${isLight ? ' auth-fusion--light' : ''}`}
      data-auth-layout="fusion"
    >
      <a href="#auth-form-panel" className="auth-fusion__skip">
        Skip to form
      </a>

      <aside className="auth-fusion__visual" aria-hidden={false}>
        <div className="auth-fusion__visual-bg">
          <img
            src={heroImg}
            alt=""
            className="auth-fusion__visual-img"
            draggable={false}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/auth-3d.png';
            }}
          />
        </div>
        <div className="auth-fusion__visual-overlay" />
        <AuthCircuitPattern className="auth-fusion__circuit" />
        <div className="auth-fusion__horizon" />

        <motion.div
          className="auth-fusion__brand"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={reduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-fusion__logo-mark" aria-hidden>
            S
          </div>
          <p className="auth-fusion__logo-word">SPACILLY</p>
          <p className="auth-fusion__logo-tag">TRADE · TRUST · GROW</p>
          <span className="auth-fusion__brand-shield">
            <Shield size={18} strokeWidth={2.25} aria-hidden />
          </span>
          <p className="auth-fusion__brand-desc">
            Spacilly is the next-generation marketplace built for secure transactions and real
            connections.
          </p>
        </motion.div>
      </aside>

      <main id="auth-form-panel" tabIndex={-1} className="auth-fusion__main">
        <div className="auth-fusion__main-bg" />
        <AuthCircuitPattern className="auth-fusion__main-circuit" />

        <div className="auth-fusion__mobile-brand" aria-hidden>
          <div className="auth-fusion__logo-mark">S</div>
          <p className="auth-fusion__logo-word">SPACILLY</p>
        </div>

        <div className="auth-fusion__main-inner">{children}</div>
      </main>
    </div>
  );
}
