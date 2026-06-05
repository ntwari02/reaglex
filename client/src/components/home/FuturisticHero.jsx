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

const contentVariants = (reduceMotion) =>
  reduceMotion
    ? { initial: false, animate: false }
    : {
        initial: { opacity: 0, x: 32 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.55, ease: EASE },
      };

export default function FuturisticHero({ className = '', compact = false }) {
  const reduceMotion = useReducedMotion();
  const { enabled: heroOn } = usePlatformFeature('hero_carousel');
  const { data: products = [], isPending, isFetching } = useHeroCatalogProducts(compact ? 5 : 7);
  const ready = heroCatalogReady(products);
  const loading = isPending || (isFetching && !ready);

  if (!heroOn) return null;

  const sectionClass = `fx-hero${compact ? ' fx-hero--compact' : ''} ${className}`.trim();
  const slide = contentVariants(reduceMotion);
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

      <div className="fx-hero__slide-bg" aria-hidden>
        <div className="fx-hero__slide-track">
          <span className="fx-hero__slide-panel" />
          <span className="fx-hero__slide-panel" />
          <span className="fx-hero__slide-panel" />
        </div>
      </div>
      <div className="fx-hero__grid-bg" aria-hidden />

      <motion.div className="fx-hero__inner" {...slide}>
        <div className="fx-hero__copy">
          <motion.span
            className="fx-hero__badge"
            initial={reduceMotion ? false : { opacity: 0, x: 20 }}
            animate={reduceMotion ? false : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="fx-hero__badge-dot" aria-hidden />
            Next-gen marketplace
          </motion.span>

          <motion.h1
            id="fx-hero-heading"
            className="fx-hero__title"
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={reduceMotion ? false : { opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.04, ease: EASE }}
          >
            <span className="fx-hero__title-line">Shop with confidence.</span>
            <span className="fx-hero__title-line">Escrow-protected checkout.</span>
          </motion.h1>

          <motion.p
            className="fx-hero__subtitle"
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={reduceMotion ? false : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: EASE }}
          >
            Verified sellers, live catalog imagery, and a minimal checkout built for trust.
          </motion.p>

          <motion.div
            className="fx-hero__ctas"
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={reduceMotion ? false : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
          >
            <Link to="/category/all" className="fx-hero__btn fx-hero__btn--primary">
              Explore products
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
            </Link>
            <Link to="/search?sort=discount" className="fx-hero__btn fx-hero__btn--ghost">
              Best deals
            </Link>
          </motion.div>

          <motion.ul
            className="fx-hero__trust"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? false : { opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.14, ease: EASE }}
            aria-label="Trust and safety highlights"
          >
            <li className="fx-hero__trust-item">
              <ShieldCheck size={14} strokeWidth={2} aria-hidden />
              Escrow checkout
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

        <motion.div
          className="fx-hero__collage-wrap"
          initial={reduceMotion ? false : { opacity: 0, x: 40 }}
          animate={reduceMotion ? false : { opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: EASE }}
        >
          <HeroProductCollage
            products={ready ? products : []}
            loading={loading || !ready}
            reduceMotion={reduceMotion}
            variant="slide"
            label="Featured from catalog"
          />
        </motion.div>
      </motion.div>

      {!loading && !ready && products.length < MIN_HERO_PRODUCTS && (
        <p className="fx-hero__empty">
          Add products with high-quality photos to power the live catalog showcase.
        </p>
      )}
    </section>
  );
}
