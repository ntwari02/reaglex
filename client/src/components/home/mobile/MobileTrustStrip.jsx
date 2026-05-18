import { Truck, Zap, RotateCcw, ShieldCheck } from 'lucide-react';

const ITEMS = [
  { icon: Truck, title: 'Free Delivery', sub: 'On orders $50+' },
  { icon: Zap, title: 'Fast Shipping', sub: '2–5 business days' },
  { icon: RotateCcw, title: 'Easy Returns', sub: '30 days return' },
  { icon: ShieldCheck, title: 'Secure Payment', sub: 'Escrow protected' },
];

export default function MobileTrustStrip() {
  return (
    <section className="mob-trust-strip" aria-label="Shopping guarantees">
      <div className="mob-trust-grid">
        {ITEMS.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="mob-trust-item">
            <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--brand-primary)' }} />
            <div className="min-w-0">
              <p className="mob-trust-title">{title}</p>
              <p className="mob-trust-sub">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
