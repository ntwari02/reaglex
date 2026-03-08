import React from 'react';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';

type SellerGuidanceContext =
  | 'dashboard'
  | 'listings'
  | 'shipping'
  | 'support'
  | 'payouts'
  | 'conduct'
  | 'violations';

type GuidanceConfig = {
  title: string;
  subtitle?: string;
  bullets: string[];
  guidelineSectionId?: string;
};

const GUIDANCE_CONTENT: Record<SellerGuidanceContext, GuidanceConfig> = {
  dashboard: {
    title: 'Account Health – Key Rules',
    subtitle:
      'These are the core metrics used in Seller Guidelines to judge your account health.',
    bullets: [
      'Keep order defect rate, late shipment rate, and cancellation rate as low as possible.',
      'Respond to disputes and buyer complaints within the required timeframes.',
      'Avoid policy violations such as off‑platform payments or prohibited items.',
    ],
    guidelineSectionId: 'conduct',
  },
  listings: {
    title: 'Product Listing Rules',
    subtitle:
      'Summarised from the Product Listings and Prohibited Items sections of the Seller Guidelines.',
    bullets: [
      'Use clear, honest titles (10–80 characters) and accurate descriptions (min. 50 characters).',
      'Upload at least 3 real photos per product; no watermarks, stock-only photos, or misleading images.',
      'Choose the correct category and avoid duplicate or miscategorised listings.',
      'Do not list prohibited items such as weapons, drugs, counterfeit goods, or adult content.',
    ],
    guidelineSectionId: 'listings',
  },
  shipping: {
    title: 'Shipping & Fulfilment Rules',
    subtitle:
      'Based on the Shipping Requirements and Prohibited Items sections of the Seller Guidelines.',
    bullets: [
      'Pack and hand over orders quickly (e.g. within 24–48 hours depending on order type).',
      'Use appropriate packaging and add tracking numbers for all shippable orders where possible.',
      'Never ship prohibited or restricted items and always follow customs / local regulations.',
      'Update order status and tracking promptly so buyers always know where their order is.',
    ],
    guidelineSectionId: 'shipping',
  },
  support: {
    title: 'Customer Service Rules',
    subtitle:
      'Taken from the Customer Service Standards and Dispute Handling sections of the Seller Guidelines.',
    bullets: [
      'Reply to new messages within 2 hours and to complaints much faster where possible.',
      'Keep all communication polite, professional, and on‑platform – never move buyers to WhatsApp for payment.',
      'Offer solutions first and keep buyers updated while a ticket or dispute is open.',
      'Never share buyer personal data or harass, threaten, or pressure buyers.',
    ],
    guidelineSectionId: 'support',
  },
  payouts: {
    title: 'Payment & Payout Rules',
    subtitle:
      'From the Payment & Payout Rules section of the Seller Guidelines.',
    bullets: [
      'Accept payments only through Reaglex checkout – never request off‑platform payments.',
      'Keep payout details accurate and up to date; only use accounts you control.',
      'Understand payout schedule, minimums, and applicable fees before withdrawing.',
      'Always keep records for tax and compliance; you are responsible for reporting income.',
    ],
    guidelineSectionId: 'payouts',
  },
  conduct: {
    title: 'Account Conduct Rules',
    subtitle:
      'Summarised from the Account Conduct Policy and Community Standards sections.',
    bullets: [
      'Use a real identity or registered business and keep store information accurate.',
      'Never operate multiple seller accounts to manipulate reviews or fees.',
      'Do not engage in fraud, harassment, discrimination, or data misuse.',
      'Report security issues or suspicious activity to Reaglex immediately.',
    ],
    guidelineSectionId: 'conduct',
  },
  violations: {
    title: 'Violation Consequences',
    subtitle:
      'Strike system and enforcement rules summarised from the Violations section.',
    bullets: [
      'Repeated policy violations lead from warnings to restrictions, suspension, and permanent bans.',
      'Serious violations like fraud, off‑platform payments, or prohibited items may cause instant bans.',
      'Policy violations can result in payout holds and legal escalation where applicable.',
    ],
    guidelineSectionId: 'violations',
  },
};

interface SellerGuidancePanelProps {
  context: SellerGuidanceContext;
  className?: string;
}

export const SellerGuidancePanel: React.FC<SellerGuidancePanelProps> = ({
  context,
  className,
}) => {
  const config = GUIDANCE_CONTENT[context];
  if (!config) return null;

  return (
    <section
      className={className}
      aria-label="Seller guidelines summary"
    >
      <div
        className="rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-2"
        style={{
          borderColor: 'var(--divider)',
          background: 'var(--bg-elevated, rgba(15,23,42,0.02))',
        }}
      >
        <header className="flex items-start gap-2">
          <div className="mt-0.5">
            <Info size={16} style={{ color: '#f97316' }} />
          </div>
          <div className="space-y-0.5">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              {config.title}
            </p>
            {config.subtitle && (
              <p
                className="text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                {config.subtitle}
              </p>
            )}
          </div>
        </header>

        <ul className="mt-1 space-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {config.bullets.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full border border-orange-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex justify-between items-center gap-2">
          <p
            className="text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            These rules are enforced across all seller tools. Repeated violations can affect your account health.
          </p>
          <Link
            to="/seller/guidelines"
            className="shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold"
            style={{
              border: '1px solid var(--divider)',
              color: 'var(--text-secondary)',
            }}
          >
            View full guidelines
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SellerGuidancePanel;

