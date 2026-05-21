import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useHomePromoBanners } from '../../../hooks/useBuyerSiteContent';

function pad(n) {
  return String(n).padStart(2, '0');
}

const FALLBACK = {
  title: 'Up to 45% Off',
  sub: 'Super Deals',
  cta: 'Grab Now',
  href: '/search?sort=discount',
  bg: 'linear-gradient(135deg, #ff7a1a 0%, #ff9a4a 45%, #c2410c 100%)',
};

export default function SuperDealsBanner() {
  const { data } = useHomePromoBanners();
  const promo =
    data?.banners?.find((b) =>
      /deal|sale|off|mega/i.test(`${b.title} ${b.sub}`),
    ) || data?.banners?.[0];

  const banner = promo
    ? {
        title: promo.title,
        sub: promo.sub || 'Super Deals',
        cta: promo.cta || 'Grab Now',
        href: promo.href || '/search?sort=discount',
        bg: promo.bg || FALLBACK.bg,
      }
    : FALLBACK;

  const [left, setLeft] = useState({ h: 2, m: 16, s: 45 });

  useEffect(() => {
    let total = 2 * 3600 + 16 * 60 + 45;
    const id = setInterval(() => {
      total = total > 0 ? total - 1 : 24 * 3600 - 1;
      setLeft({
        h: Math.floor(total / 3600),
        m: Math.floor((total % 3600) / 60),
        s: total % 60,
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mob-section pt-0">
      <Link
        to={banner.href}
        className="mob-super-deals flex overflow-hidden rounded-[14px] active:scale-[0.99] transition-transform"
      >
        <div className="mob-super-deals-copy flex flex-col justify-center px-4 py-3 min-w-[42%]">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {banner.sub}
          </p>
          <p className="mt-0.5 text-[17px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {banner.title}
          </p>
          <span
            className="mt-2 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: 'var(--text-primary)', color: '#fff' }}
          >
            {banner.cta}
            <ArrowRight size={14} />
          </span>
        </div>

        <div
          className="relative flex flex-1 flex-col items-center justify-center px-3 py-3"
          style={{ background: banner.bg }}
        >
          <span
            className="mb-1.5 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/95"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          >
            Limited time
          </span>
          <span className="text-3xl" aria-hidden>
            {promo?.emoji || '🔥'}
          </span>
          <div className="mt-2 flex items-center gap-1 font-mono text-[13px] font-bold tabular-nums text-white">
            <span className="rounded bg-black/20 px-1.5 py-0.5">{pad(left.h)}</span>
            <span className="opacity-70">:</span>
            <span className="rounded bg-black/20 px-1.5 py-0.5">{pad(left.m)}</span>
            <span className="opacity-70">:</span>
            <span className="rounded bg-black/20 px-1.5 py-0.5">{pad(left.s)}</span>
          </div>
        </div>
      </Link>
    </section>
  );
}