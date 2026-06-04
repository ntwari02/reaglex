import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { usePlatformFeature } from '../../hooks/useSystemFeatures';
import {
  useHeroCatalogProducts,
  heroCatalogReady,
  MIN_HERO_PRODUCTS,
} from '../../hooks/useHeroCatalogProducts';
import HeroProductCollage from './HeroProductCollage';
import '../../styles/futuristic-hero.css';

const EASE = [0.22, 1, 0.36, 1];

export default function FuturisticHero({ className = '', compact = false }) {
  const reduceMotion = useReducedMotion();
  const { enabled: heroOn } = usePlatformFeature('hero_carousel');
  const { data: products = [], isPending, isFetching } = useHeroCatalogProducts(compact ? 5 : 7);
  const ready = heroCatalogReady(products);
  const loading = isPending || (isFetching && !ready);

  if (!heroOn) return null;

  const sectionClass = `fx-hero${compact ? ' fx-hero--compact' : ''} ${className}`.trim();
  const statusMsg = loading
    ? 'Loading featured product gallery.'
    : ready
      ? `Showing ${products.length} catalog products in the hero gallery.`
      : 'Product gallery awaiting more catalog photos.';

  return (
    <section className={sectionClass} aria-labelledby="fx-hero-heading">
      <p className="fx-hero__sr-status" role="status" aria-live="polite">
        {statusMsg}
      </p>

      <div className="fx-hero__grid-bg" aria-hidden />
      <div className="fx-hero__orb fx-hero__orb--1" aria-hidden />
      <div className="fx-hero__orb fx-hero__orb--2" aria-hidden />
      <div className="fx-hero__orb fx-hero__orb--3" aria-hidden />

      <div className="fx-hero__inner">
        <div className="fx-hero__copy">
          <motion.span
            className="fx-hero__badge"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="fx-hero__badge-dot" aria-hidden />
            Next-gen marketplace
          </motion.span>

          <motion.h1
            id="fx-hero-heading"
            className="fx-hero__title"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
          >
            Shop the future{' '}
            <span className="fx-hero__title-accent">with escrow protection</span>
          </motion.h1>

          <motion.p
            className="fx-hero__subtitle"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
          >
            Discover verified sellers, HD product imagery from our live catalog, and checkout built
            for trust — fast, secure, and conversion-ready.
          </motion.p>

          <motion.div
            className="fx-hero__ctas"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          >
            <Link to="/category/all" className="fx-hero__btn fx-hero__btn--primary">
              Explore featured products
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
            </Link>
            <Link to="/search?sort=discount" className="fx-hero__btn fx-hero__btn--ghost">
              View best deals
            </Link>
          </motion.div>

          <motion.ul
            className="fx-hero__trust"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? false : { opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
            aria-label="Trust and safety highlights"
          >
            <li className="fx-hero__trust-item">
              <ShieldCheck size={14} strokeWidth={2} aria-hidden />
              Escrow-protected checkout
            </li>
            <li className="fx-hero__trust-item">
              <Sparkles size={14} strokeWidth={2} aria-hidden />
              Verified sellers
            </li>
            <li className="fx-hero__trust-item">
              <Truck size={14} strokeWidth={2} aria-hidden />
              Global delivery
            </li>
          </motion.ul>
        </div>

        <div className="fx-hero__collage-wrap">
          <HeroProductCollage
            products={ready ? products : []}
            loading={loading || !ready}
            reduceMotion={reduceMotion}
            label="Explore featured products"
          />
        </div>
      </div>

      {!loading && !ready && products.length < MIN_HERO_PRODUCTS && (
        <p className="fx-hero__empty">
          Add products with high-quality photos to power the live catalog showcase.
        </p>
      )}
    </section>
  );
}
