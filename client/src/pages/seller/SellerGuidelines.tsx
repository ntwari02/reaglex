import BuyerLayout from '../../components/buyer/BuyerLayout';
import { useSellerAccess } from '../../hooks/useSellerAccess';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

type Section = {
  id: string;
  title: string;
  icon: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    body: 'Create your seller account, complete verification, and set up your storefront profile with accurate business information.',
  },
  {
    id: 'listings',
    title: 'Product Listings Rules',
    icon: '📦',
    body: 'Use clear photos, honest descriptions, and accurate pricing. Do not misrepresent brands, quality, or availability.',
  },
  {
    id: 'prohibited',
    title: 'Prohibited Items List',
    icon: '⛔',
    body: 'Items that break the law or Reaglex policy are strictly forbidden. See the list below for examples.',
  },
  {
    id: 'shipping',
    title: 'Shipping Requirements',
    icon: '🚚',
    body: 'Ship on time, use trackable methods when possible, and package items securely to avoid damage.',
  },
  {
    id: 'support',
    title: 'Customer Service Standards',
    icon: '🤝',
    body: 'Respond to buyer messages promptly, resolve issues fairly, and follow our dispute resolution process.',
  },
  {
    id: 'payouts',
    title: 'Payment & Payout Rules',
    icon: '💰',
    body: 'Payments are held in escrow until delivery is confirmed. Payouts follow our schedule and verification checks.',
  },
  {
    id: 'conduct',
    title: 'Account Conduct Policy',
    icon: '📜',
    body: 'We expect honest, respectful behavior. Abuse, fraud, or harassment is not tolerated.',
  },
  {
    id: 'violations',
    title: 'Violation Consequences',
    icon: '⚠️',
    body: 'Policy violations may result in warnings, listing removal, payout holds, or permanent account bans.',
  },
];

const GUIDELINES_STORAGE_KEY = 'guidelines-read-sections';

const contentContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.15,
    },
  },
};

const contentItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

function renderSectionContent(sectionId: string) {
  switch (sectionId) {
    case 'getting-started':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Welcome banner */}
          <motion.div variants={contentItemVariants}>
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(234,88,12,0.05))',
                boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.20)',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fb923c',
                  marginBottom: 4,
                }}
              >
                👋 Welcome to Reaglex Seller Program!
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                }}
              >
                By selling on Reaglex you agree to follow all guidelines below. Read carefully.
              </p>
            </div>
          </motion.div>

          {/* Registration steps */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '1',
                  label: 'Complete Profile',
                  desc: 'Add photo, bio, store name',
                  icon: '👤',
                  bg: 'linear-gradient(135deg,#f97316,#ea580c)',
                },
                {
                  step: '2',
                  label: 'Add Products',
                  desc: 'List your first items',
                  icon: '📦',
                  bg: 'linear-gradient(135deg,#38bdf8,#1d4ed8)',
                },
                {
                  step: '3',
                  label: 'Setup Payments',
                  desc: 'Connect bank or MoMo',
                  icon: '💳',
                  bg: 'linear-gradient(135deg,#22c55e,#16a34a)',
                },
                {
                  step: '4',
                  label: 'Start Selling!',
                  desc: 'Go live and earn',
                  icon: '🚀',
                  bg: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center transition-transform duration-200"
                  style={{
                    background: 'var(--bg-secondary, #1a1e2c)',
                    borderRadius: 14,
                    padding: '18px 16px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div
                    className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      background: item.bg,
                      color: '#ffffff',
                    }}
                  >
                    {item.step}
                  </div>
                  <div className="text-xl mb-1">{item.icon}</div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Requirements + account types */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
              <div>
                <p
                  className="mb-3 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  📋 Before You Can Sell:
                </p>
                <div className="space-y-2">
                  {[
                    {
                      title: 'Valid Government ID',
                      desc: 'National ID or Passport required',
                      done: true,
                    },
                    {
                      title: 'Active Phone Number',
                      desc: 'For OTP verification',
                      done: true,
                    },
                    {
                      title: 'Payment Method',
                      desc: 'Bank account or mobile money',
                      done: true,
                    },
                    {
                      title: 'Profile Photo',
                      desc: 'Clear face photo required',
                      done: false,
                    },
                    {
                      title: 'Store Description',
                      desc: 'At least 100 characters',
                      done: false,
                    },
                    {
                      title: 'First Product Listed',
                      desc: 'Minimum 1 active product',
                      done: false,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="mt-0.5 flex h-5 w-5 items-center justify-center rounded"
                        style={{
                          background: item.done
                            ? 'rgba(249,115,22,0.15)'
                            : 'transparent',
                          borderRadius: item.done ? 6 : 999,
                          boxShadow: item.done
                            ? 'inset 0 0 0 1px rgba(249,115,22,0.85)'
                            : 'inset 0 0 0 1px rgba(148,163,184,0.6)',
                          color: item.done ? '#fb923c' : '#9ca3af',
                          fontSize: 11,
                        }}
                      >
                        {item.done ? '✓' : '○'}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div
                  style={{
                    background: 'var(--bg-secondary, #1a1e2c)',
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <p
                    className="mb-2 text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    👤 Individual Seller
                  </p>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    For:
                  </p>
                  <ul className="mb-3 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <li>✓ Personal items</li>
                    <li>✓ Small business</li>
                    <li>✓ Hobbyist sellers</li>
                  </ul>
                  <p
                    className="text-xs mb-1 font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Requirements:
                  </p>
                  <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <li>- National ID</li>
                    <li>- Personal bank/MoMo</li>
                  </ul>
                </div>
                <div
                  style={{
                    background: 'var(--bg-secondary, #1a1e2c)',
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <p
                    className="mb-2 text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    🏢 Business Seller
                  </p>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    For:
                  </p>
                  <ul className="mb-3 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <li>✓ Registered companies</li>
                    <li>✓ Large inventory</li>
                    <li>✓ Brand stores</li>
                  </ul>
                  <p
                    className="text-xs mb-1 font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Requirements:
                  </p>
                  <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <li>- Business registration</li>
                    <li>- TIN number</li>
                    <li>- Business bank account</li>
                  </ul>
                  <p
                    className="mt-3 text-[11px]"
                    style={{ color: '#fb923c' }}
                  >
                    Business sellers get verified badge.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pro tips */}
          <motion.div variants={contentItemVariants}>
            <div
              style={{
                background: 'var(--brand-tint, #1c1408)',
                boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25)',
                borderRadius: 14,
                padding: '18px 20px',
              }}
            >
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                💡 Tips for Success:
              </p>
              <ul className="space-y-1.5 text-sm">
                {[
                  'Quality photos = 3× more sales',
                  'Complete profile gets more trust',
                  'Respond fast = better ranking',
                  'Competitive pricing wins buyers',
                  'Request reviews after delivery',
                ].map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full"
                      style={{ background: '#f97316' }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      );

    case 'listings':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Intro */}
          <motion.div variants={contentItemVariants}>
            <p
              className="text-sm italic"
              style={{ color: 'var(--text-muted)' }}
            >
              All products must meet these standards before being approved for listing.
            </p>
          </motion.div>

          {/* Rule cards */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* Photo Requirements */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-xs)',
                }}
              >
                <p
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: 'transparent',
                      color: '#fb923c',
                      boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.6)',
                    }}
                  >
                    📸
                  </span>
                  Photo Requirements
                </p>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Minimum 3 photos per product',
                    'Resolution: at least 800×800px',
                    'First photo: white/clean background',
                    'No watermarks or logos',
                    'No misleading or stock photos',
                    'Show all angles and defects',
                    'Video allowed (max 60 seconds)',
                  ].map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'transparent', border: '1px solid #f97316' }}
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Title Rules */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-xs)',
                }}
              >
                <p
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: 'transparent',
                      color: '#60a5fa',
                      boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.6)',
                    }}
                  >
                    📝
                  </span>
                  Title Rules
                </p>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Clear and descriptive title',
                    '10–80 characters maximum',
                    'Include: Brand, Model, Size, Color',
                    'No ALL CAPS or spam characters',
                    'No competitor brand names',
                    'No emojis in titles',
                    'Must match product exactly',
                  ].map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'transparent', border: '1px solid #f97316' }}
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Description Rules */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-xs)',
                }}
              >
                <p
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: 'transparent',
                      color: '#4ade80',
                      boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)',
                    }}
                  >
                    💬
                  </span>
                  Description Rules
                </p>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Minimum 50 characters',
                    'Accurate and honest always',
                    'List ALL defects for used items',
                    'Include dimensions/weight',
                    'Mention all included accessories',
                    'No HTML tags or code',
                    'Language: English or Kinyarwanda',
                  ].map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'transparent', border: '1px solid #f97316' }}
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing Rules */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-xs)',
                }}
              >
                <p
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: 'transparent',
                      color: '#fb923c',
                      boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.6)',
                    }}
                  >
                    💰
                  </span>
                  Pricing Rules
                </p>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Fair market pricing only',
                    'No artificial price inflation',
                    'Sale prices must be genuine',
                    'All costs included (no hidden)',
                    'Currency must be in USD',
                    'No price changes after order',
                    'Bulk pricing allowed',
                  ].map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'transparent', border: '1px solid #f97316' }}
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Category Rules */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-xs)',
                }}
              >
                <p
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: 'transparent',
                      color: '#93c5fd',
                      boxShadow: 'inset 0 0 0 1px rgba(96,165,250,0.6)',
                    }}
                  >
                    🏷️
                  </span>
                  Category Rules
                </p>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'List in correct category only',
                    'No miscategorization',
                    'One listing per unique product',
                    'No duplicate listings allowed',
                    'Proper subcategory required',
                    'Seasonal items in correct section',
                    'Digital goods in digital category',
                  ].map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'transparent', border: '1px solid #f97316' }}
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Inventory Rules */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-xs)',
                }}
              >
                <p
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: 'transparent',
                      color: '#38bdf8',
                      boxShadow: 'inset 0 0 0 1px rgba(56,189,248,0.6)',
                    }}
                  >
                    📊
                  </span>
                  Inventory Rules
                </p>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Accurate stock count always',
                    'Mark out-of-stock immediately',
                    'No overselling allowed',
                    'Set correct size/color variants',
                    'Pre-orders must be labeled',
                    'Restock notifications allowed',
                    'Minimum 1 unit to be listed',
                  ].map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'transparent', border: '1px solid #f97316' }}
                      />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Do / Don't table */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-4 md:grid-cols-2">
              {/* DOs */}
              <div
                style={{
                  background: 'var(--bg-secondary, #1a1e2c)',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="px-4 py-2"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(22,163,74,0.9), rgba(34,197,94,0.7))',
                  }}
                >
                  <p className="text-sm font-semibold text-white">✅ Do&apos;s</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    {
                      title: 'Use real product photos',
                      desc: 'Photos you personally took',
                    },
                    {
                      title: 'Write accurate descriptions',
                      desc: 'Exactly as the product is',
                    },
                    {
                      title: 'Price competitively',
                      desc: 'Research market prices first',
                    },
                    {
                      title: 'Update stock regularly',
                      desc: 'Daily if high volume',
                    },
                    {
                      title: 'Answer questions quickly',
                      desc: 'Helps conversion rate',
                    },
                    {
                      title: 'Include all product details',
                      desc: 'Dimensions, weight, material',
                    },
                    {
                      title: 'Disclose product condition',
                      desc: 'New, used, refurbished',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-3"
                    >
                      <div
                        className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#22c55e',
                        }}
                      >
                        ✓
                      </div>
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DON'Ts */}
              <div
                style={{
                  background: 'var(--bg-secondary, #1a1e2c)',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="px-4 py-2"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(248,113,113,0.8))',
                  }}
                >
                  <p className="text-sm font-semibold text-white">❌ Don&apos;ts</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    {
                      title: 'Use stock/internet photos',
                      desc: 'Misleads buyers',
                    },
                    {
                      title: 'Exaggerate features',
                      desc: 'Creates disputes',
                    },
                    {
                      title: 'Hide defects or damage',
                      desc: 'Grounds for return',
                    },
                    {
                      title: 'List unavailable items',
                      desc: 'Causes cancellations',
                    },
                    {
                      title: 'Copy competitor listings',
                      desc: 'Copyright violation',
                    },
                    {
                      title: 'Change price after order',
                      desc: 'Contract violation',
                    },
                    {
                      title: 'List in wrong category',
                      desc: 'Reduces visibility',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-3"
                    >
                      <div
                        className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                        style={{
                          background: 'rgba(239,68,68,0.18)',
                          color: '#f97373',
                        }}
                      >
                        ✗
                      </div>
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Listing approval process */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5"
              style={{ background: 'var(--bg-secondary, #1a1e2c)' }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Listing Approval Process
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:justify-between text-xs">
                {[
                  { label: 'Submit listing', time: 'Immediate' },
                  { label: 'Auto review', time: '≈ 5 minutes' },
                  { label: 'Human review', time: 'If flagged' },
                  { label: 'Approved / Rejected', time: 'You are notified' },
                  { label: 'Goes live', time: 'Immediately' },
                ].map((step, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="flex flex-1 items-center gap-3"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{
                        background: 'rgba(249,115,22,0.15)',
                        color: '#fb923c',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {step.label}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {step.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      );

    case 'prohibited':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Warning box */}
          <motion.div variants={contentItemVariants}>
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                boxShadow: 'inset 0 0 0 1.5px rgba(239,68,68,0.30)',
                borderRadius: 16,
                padding: '18px 22px',
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: '#f87171' }}
              >
                🚨 Zero Tolerance Policy
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: 'rgba(248,113,113,0.80)' }}
              >
                Selling ANY prohibited item results in: Immediate permanent ban + funds frozen +
                possible legal action.
              </p>
            </div>
          </motion.div>

          {/* Prohibited grid */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: '⚔️ Weapons & Firearms',
                  badge: 'Strictly Forbidden',
                  badgeColor: '#f97373',
                  items: [
                    'Firearms and ammunition',
                    'Explosive devices',
                    'Stun guns and tasers',
                    'Military grade weapons',
                    'Weapon modification parts',
                    'Switchblades over 3 inches',
                  ],
                },
                {
                  title: '💊 Drugs & Substances',
                  items: [
                    'Illegal narcotics (all types)',
                    'Prescription drugs without license',
                    'Drug paraphernalia',
                    'Synthetic drugs / research chemicals',
                    'Alcohol without proper licensing',
                    'Tobacco to minors',
                  ],
                },
                {
                  title: '🔞 Adult Content',
                  items: [
                    'Explicit sexual content',
                    'Adult-only services',
                    'Pornographic material',
                    'Escort or adult dating services',
                    'Content involving minors',
                  ],
                },
                {
                  title: '💰 Counterfeit Goods',
                  items: [
                    'Fake branded products',
                    'Replica designer goods',
                    'Pirated software/media',
                    'Forged documents',
                    'Unauthorized use of logos',
                    '"Inspired by" brand items',
                  ],
                },
                {
                  title: '☢️ Hazardous Materials',
                  items: [
                    'Dangerous chemicals',
                    'Radioactive materials',
                    'Flammable items (without permit)',
                    'Toxic substances',
                    'Asbestos-containing items',
                    'Unlabeled chemicals',
                  ],
                },
                {
                  title: '👶 Child Safety',
                  items: [
                    'Content exploiting minors',
                    'Items targeted at grooming',
                    'Age-restricted content to minors',
                    'Unsafe children\'s products',
                    'Choking hazards without warning',
                  ],
                },
                {
                  title: '🐾 Wildlife & Environment',
                  items: [
                    'Protected animal products',
                    'Ivory or animal parts',
                    'Endangered species',
                    'Illegally sourced timber',
                    'Products tested on animals (some)',
                  ],
                },
                {
                  title: '💻 Digital Crimes',
                  items: [
                    'Stolen accounts/credentials',
                    'Hacking tools/services',
                    'Malware or viruses',
                    'Cracked software licenses',
                    'Personal data for sale',
                    'Social media followers (fake)',
                  ],
                },
                {
                  title: '🎰 Gambling & Fraud',
                  items: [
                    'Gambling services or equipment',
                    'Pyramid scheme products',
                    'Get-rich-quick schemes',
                    'Fraudulent investment offers',
                    'Lottery tickets',
                    'Chain letter products',
                  ],
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: 'var(--bg-secondary, #171b28)',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: 'inset 4px 0 0 #ef4444, var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      boxShadow: 'inset 4px 0 0 #ef4444',
                      paddingLeft: 12,
                      marginLeft: -16,
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {card.title}
                    </p>
                    {card.badge && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: 'rgba(239,68,68,0.16)',
                          color: card.badgeColor,
                        }}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {card.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span
                          className="mt-1 h-1.5 w-1.5 rounded-full"
                          style={{ background: '#f97373' }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Gray area box */}
          <motion.div variants={contentItemVariants}>
            <div
              style={{
                background: 'rgba(96,165,250,0.08)',
                boxShadow: 'inset 0 0 0 1px rgba(96,165,250,0.20)',
                borderRadius: 14,
                padding: '18px 20px',
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: '#60a5fa' }}
              >
                🔵 Gray Area Items — Contact Us First
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: '#93c5fd' }}
              >
                These items MIGHT be allowed with proper documentation:
              </p>
              <ul className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {[
                  'Hunting equipment (with permit)',
                  'Medical devices (with license)',
                  'Alcohol (with vendor license)',
                  'Chemicals (with safety cert)',
                  'Animals (with proper papers)',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full"
                      style={{ background: '#60a5fa' }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p
                className="mt-3 text-xs"
                style={{ color: '#fb923c' }}
              >
                📧{' '}
                <a href="mailto:compliance@reaglex.com" style={{ color: '#fb923c' }}>
                  compliance@reaglex.com
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      );

    case 'shipping':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Shipping timeline card */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-6 py-6"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px var(--divider), var(--shadow-sm)',
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between">
                {[
                  {
                    step: 1,
                    label: '📦 Pack',
                    desc: 'Within 24 hours of order',
                    badge: '24h',
                  },
                  {
                    step: 2,
                    label: '🏷️ Label',
                    desc: 'Print & attach shipping label',
                    badge: 'Required',
                  },
                  {
                    step: 3,
                    label: '🚚 Ship',
                    desc: 'Drop off within 48 hours',
                    badge: '48h',
                  },
                  {
                    step: 4,
                    label: '✅ Confirm',
                    desc: 'Upload tracking number',
                    badge: 'Tracking',
                  },
                ].map((item, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="flex flex-1 items-center gap-3 md:flex-col md:items-start"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          background: 'transparent',
                          color: '#f97316',
                          boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.45)',
                        }}
                      >
                        {item.step}
                      </div>
                      <div className="text-lg">{item.label}</div>
                    </div>
                    <div className="flex flex-1 items-center justify-between md:w-full">
                      <p className="text-xs opacity-80">{item.desc}</p>
                      <span
                        className="ml-3 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: 'transparent',
                          color: '#f97316',
                          boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.45)',
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Shipping requirements table */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl overflow-hidden text-xs"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px var(--divider)',
              }}
            >
              <div
                className="grid grid-cols-4 px-4 py-2 font-semibold"
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 -1px 0 0 var(--divider)',
                }}
              >
                <div>Order Type</div>
                <div>Time to Ship</div>
                <div>Tracking</div>
                <div>Insurance</div>
              </div>
              {[
                {
                  type: 'Standard Products',
                  processing: '24hr processing | 48hr ship',
                  tracking: 'Required',
                  insurance: 'Optional',
                },
                {
                  type: 'Fragile/Electronics',
                  processing: 'Same day processing | 24hr ship',
                  tracking: 'Required',
                  insurance: 'Recommended',
                },
                {
                  type: 'Digital Products',
                  processing: '1 hour delivery | N/A',
                  tracking: 'Email proof',
                  insurance: 'N/A',
                },
                {
                  type: 'Pre-order Items',
                  processing: 'Label clearly | On release date',
                  tracking: 'Required',
                  insurance: 'Optional',
                },
                {
                  type: 'Bulky/Heavy Items',
                  processing: '48hr processing | 72hr ship',
                  tracking: 'Required',
                  insurance: 'Recommended',
                },
              ].map((row) => (
                <div
                  key={row.type}
                  className="grid grid-cols-4 px-4 py-2"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    boxShadow: 'inset 0 -1px 0 0 var(--divider)',
                  }}
                >
                  <div>{row.type}</div>
                  <div>{row.processing}</div>
                  <div>{row.tracking}</div>
                  <div>{row.insurance}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Packaging standards */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  icon: '📦',
                  title: 'Appropriate Box',
                  desc: 'Use correct size box. No oversized packaging.',
                },
                {
                  icon: '🛡️',
                  title: 'Protect Fragile Items',
                  desc: 'Bubble wrap, foam padding for breakable products.',
                },
                {
                  icon: '📋',
                  title: 'Packing Slip',
                  desc: 'Include order details and return address.',
                },
                {
                  icon: '🔒',
                  title: 'Seal Securely',
                  desc: 'Tape all edges. Waterproof if needed.',
                },
                {
                  icon: '🏷️',
                  title: 'Clear Labeling',
                  desc: 'Readable label outside. Barcode visible.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-2 rounded-2xl p-4"
                  style={{
                    background: 'transparent',
                    boxShadow: 'inset 0 0 0 1px var(--divider)',
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                    style={{
                      background: 'rgba(249,115,22,0.18)',
                      color: '#fed7aa',
                    }}
                  >
                    {item.icon}
                  </div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Shipping partners */}
          <motion.div variants={contentItemVariants}>
            <div className="space-y-3">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ✅ Accepted Carriers
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'Rwanda Post (Iposita)',
                    lines: ['Local delivery', '1–3 days', 'Tracking available'],
                  },
                  {
                    title: 'Moto Delivery',
                    lines: ['Bike couriers (Kigali)', 'Same day', 'Best for local'],
                  },
                  {
                    title: 'DHL International',
                    lines: ['Global delivery', '3–7 days', 'Full tracking'],
                  },
                  {
                    title: 'FedEx',
                    lines: ['International', '2–5 days', 'Premium option'],
                  },
                  {
                    title: 'Own Delivery',
                    lines: ['Local only', 'Same day possible', 'Must have proof'],
                  },
                ].map((carrier) => (
                  <div
                    key={carrier.title}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'transparent',
                      boxShadow: 'inset 0 0 0 1px var(--divider)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {carrier.title}
                    </p>
                    <ul className="space-y-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {carrier.lines.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Late shipping policy */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: '⚠️ 1st Late',
                  desc: 'Warning + email notice',
                  bg: 'rgba(234,179,8,0.08)',
                  border: 'rgba(234,179,8,0.5)',
                },
                {
                  title: '💸 2nd Late',
                  desc: '5% penalty of order value',
                  bg: 'rgba(249,115,22,0.10)',
                  border: 'rgba(249,115,22,0.8)',
                },
                {
                  title: '📉 3rd Late',
                  desc: 'Seller rating drops',
                  bg: 'rgba(248,113,113,0.10)',
                  border: 'rgba(248,113,113,0.7)',
                },
                {
                  title: '🔒 4th Late',
                  desc: 'Account review + suspension',
                  bg: 'rgba(239,68,68,0.12)',
                  border: 'rgba(239,68,68,0.9)',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: 'transparent',
                    boxShadow: `inset 0 0 0 1px ${item.border}`,
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      );

    case 'support':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Intro */}
          <motion.div variants={contentItemVariants}>
            <p
              className="text-sm italic"
              style={{ color: 'var(--text-muted)' }}
            >
              Great customer service = better ratings = more sales. This is non-negotiable.
            </p>
          </motion.div>

          {/* Response time requirements */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: '💬',
                  title: 'New Messages',
                  required: 'Within 2 hours',
                  note: 'Affects response rate metric',
                  urgency: 'normal',
                },
                {
                  icon: '📦',
                  title: 'Order Questions',
                  required: 'Within 1 hour',
                  note: 'Buyers need quick clarity',
                  urgency: 'high',
                },
                {
                  icon: '🚨',
                  title: 'Complaints',
                  required: 'Within 30 minutes',
                  note: 'Critical for dispute prevention',
                  urgency: 'critical',
                },
                {
                  icon: '⚖️',
                  title: 'Dispute Response',
                  required: 'Within 24 hours',
                  note: 'Required by platform policy',
                  urgency: 'info',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl p-4 space-y-2"
                  style={{
                    background: 'transparent',
                    boxShadow: 'inset 0 0 0 1px var(--divider)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{card.icon}</span>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {card.title}
                      </p>
                    </div>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background:
                          card.urgency === 'critical'
                            ? '#ef4444'
                            : card.urgency === 'high'
                            ? '#f97316'
                            : card.urgency === 'info'
                            ? '#38bdf8'
                            : '#22c55e',
                      }}
                    />
                  </div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Required: {card.required}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {card.note}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Performance metrics */}
          <motion.div variants={contentItemVariants}>
            <div className="space-y-3">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                📊 Your Required Metrics
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: 'Response Rate',
                    target: '> 90%',
                    desc: '% of messages answered',
                  },
                  {
                    title: 'Order Completion Rate',
                    target: '> 95%',
                    desc: 'Orders fulfilled vs cancelled',
                  },
                  {
                    title: 'On-Time Shipping',
                    target: '> 90%',
                    desc: 'Orders shipped on time',
                  },
                  {
                    title: 'Customer Rating',
                    target: '> 4.0 ★',
                    desc: 'Average buyer rating',
                  },
                ].map((metric) => (
                  <div
                    key={metric.title}
                    className="rounded-2xl p-4 space-y-2"
                    style={{
                      background: 'transparent',
                      boxShadow: 'inset 0 0 0 1px var(--divider)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {metric.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Target: {metric.target}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {metric.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Communication standards */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-4 md:grid-cols-2">
              {/* DOs */}
              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#4ade80' }}
                >
                  ✅ Communication Do&apos;s
                </p>
                <ul
                  className="space-y-1.5 text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <li>
                    ✓ <strong>Always acknowledge receipt</strong> — Reply even if you need time.
                  </li>
                  <li>
                    ✓ <strong>Be polite and professional</strong> — Even with difficult buyers.
                  </li>
                  <li>
                    ✓ <strong>Provide tracking updates</strong> — Proactively send tracking.
                  </li>
                  <li>
                    ✓ <strong>Offer solutions first</strong> — Don&apos;t wait for escalation.
                  </li>
                  <li>
                    ✓ <strong>Follow up post-delivery</strong> — Check buyer satisfaction.
                  </li>
                  <li>
                    ✓ <strong>Use clear language</strong> — Avoid jargon or slang.
                  </li>
                  <li>
                    ✓ <strong>Keep all communication on platform</strong> — Never move to WhatsApp.
                  </li>
                </ul>
              </div>

              {/* DON'Ts */}
              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#fca5a5' }}
                >
                  ❌ Communication Don&apos;ts
                </p>
                <ul
                  className="space-y-1.5 text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <li>✗ Ignore any message — even 1 ignored = metric drop.</li>
                  <li>✗ Be rude or dismissive — grounds for account review.</li>
                  <li>✗ Make false promises — about delivery dates/quality.</li>
                  <li>✗ Ask to cancel escrow — immediate violation.</li>
                  <li>✗ Move deals off-platform — against terms of service.</li>
                  <li>✗ Pressure buyers to close dispute — manipulation violation.</li>
                  <li>✗ Post personal buyer info — privacy violation.</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Dispute handling steps */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px var(--divider)',
              }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Dispute Handling Steps
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:justify-between text-[11px]">
                {[
                  {
                    icon: '🔔',
                    title: 'Dispute Opened',
                    desc: 'Acknowledge within 24 hours',
                    color: '#fb923c',
                  },
                  {
                    icon: '📸',
                    title: 'Provide Evidence',
                    desc: 'Photos, tracking, messages',
                    color: '#60a5fa',
                  },
                  {
                    icon: '💬',
                    title: 'Offer Resolution',
                    desc: 'Replacement, refund, discount',
                    color: '#a855f7',
                  },
                  {
                    icon: '🤝',
                    title: 'Cooperate with Team',
                    desc: 'Answer all questions honestly',
                    color: '#4ade80',
                  },
                  {
                    icon: '✅',
                    title: 'Accept Decision',
                    desc: 'Platform decision is final',
                    color: '#4ade80',
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className="flex flex-1 items-center gap-3"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                      style={{ background: `${step.color}33`, color: step.color }}
                    >
                      {step.icon}
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {step.title}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Review management */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-4"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px var(--divider)',
              }}
            >
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ⭐ About Reviews
              </p>
              <ul className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <li>• Cannot delete genuine reviews.</li>
                <li>• Can respond professionally to any review.</li>
                <li>• Flag fake reviews for removal.</li>
                <li>• Reviews affect search ranking.</li>
                <li>• 4.5+ average gets &quot;Top Seller&quot; badge.</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      );

    case 'payouts':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Payment flow visual */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-6 py-6"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px var(--divider)',
              }}
            >
              <div className="flex flex-col gap-4 text-xs md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    BUYER 💳
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>Pays for order</p>
                  <p style={{ color: 'var(--text-muted)' }}>Money leaves buyer</p>
                </div>
                <div
                  className="text-center text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ↓ Held securely
                </div>
                <div className="space-y-1 text-center">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: '#fed7aa' }}
                  >
                    REAGLEX ESCROW 🔒
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Funds protected — neither party can access
                  </p>
                  <p
                    className="mt-1 inline-flex rounded-full px-3 py-1 text-[10px]"
                    style={{
                      background: 'transparent',
                      boxShadow: 'inset 0 0 0 1px var(--divider)',
                      color: '#fed7aa',
                    }}
                  >
                    On confirmation → Payout | On dispute → Refund
                  </p>
                </div>
                <div
                  className="text-center text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ↓ On confirmation
                </div>
                <div className="space-y-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    SELLER 💰
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>Receives payout</p>
                  <p style={{ color: 'var(--text-muted)' }}>Net amount after fees</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Accepted payment methods */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: '💳',
                  title: 'Visa / Mastercard',
                  lines: ['Supported cards', 'Processing: 1.4%', 'Instant processing'],
                },
                {
                  icon: '📱',
                  title: 'MTN Mobile Money',
                  lines: ['Most popular in Rwanda', 'Processing: 1.4%', 'Instant'],
                },
                {
                  icon: '📱',
                  title: 'Airtel Money',
                  lines: ['Alternative MoMo', 'Processing: 1.4%', 'Instant'],
                },
                {
                  icon: '🏦',
                  title: 'Bank Transfer',
                  lines: ['Local & international', 'Processing: varies', '1–2 days'],
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{card.icon}</span>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {card.title}
                    </p>
                  </div>
                  <ul className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {card.lines.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Payout schedule */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px var(--divider)',
              }}
            >
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: '#fb923c' }}
              >
                💸 Payout Schedule
              </p>
              <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <li>• Every Tuesday &amp; Friday</li>
                <li>• Minimum payout: $10.00</li>
                <li>• Processing time: 1–3 days</li>
                <li>• Below minimum rolls to next cycle</li>
              </ul>
            </div>
          </motion.div>

          {/* Fee table */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Fees Overview
              </p>
              <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex justify-between">
                  <span>Platform Commission</span>
                  <span>5% per sale</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Processing</span>
                  <span>1.4% per transaction</span>
                </div>
                <div className="flex justify-between">
                  <span>Withdrawal Fee</span>
                  <span>0.5% + $0.30</span>
                </div>
                <div className="flex justify-between">
                  <span>Dispute Fee</span>
                  <span>$2.00 (if you lose)</span>
                </div>
                <div className="flex justify-between">
                  <span>Listing Fee</span>
                  <span>FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Fee</span>
                  <span>FREE</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Payment rules critical */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-4 md:grid-cols-2">
              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#4ade80' }}
                >
                  ALWAYS
                </p>
                <ul
                  className="space-y-1.5 text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <li>✓ Use Reaglex checkout only</li>
                  <li>✓ Keep payment records</li>
                  <li>✓ Report suspicious requests</li>
                  <li>✓ Verify buyer payment before ship</li>
                  <li>✓ Use provided invoice system</li>
                </ul>
              </div>
              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#fca5a5' }}
                >
                  NEVER
                </p>
                <ul
                  className="space-y-1.5 text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <li>✗ Accept WhatsApp payments</li>
                  <li>✗ Request off-platform payment</li>
                  <li>✗ Share bank details in chat</li>
                  <li>✗ Accept cash for online orders</li>
                  <li>✗ Manipulate invoice amounts</li>
                  <li>✗ Chargeback disputes fraudulently</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Payout methods */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'MTN Mobile Money', fee: '0.3% + $0.10 (instant)' },
                { title: 'Airtel Money', fee: '0.3% + $0.10 (instant)' },
                { title: 'Local Bank', fee: '$0.50 flat (1–2 days)' },
                { title: 'International Bank', fee: '1% + $2.00 (3–5 days)' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-secondary, #1a1e2c)' }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="mt-1 text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.fee}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tax info */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-4"
              style={{ background: 'rgba(37,99,235,0.08)' }}
            >
              <p
                className="mb-1 text-sm font-semibold"
                style={{ color: '#60a5fa' }}
              >
                📋 Tax Responsibility
              </p>
              <p
                className="text-[11px]"
                style={{ color: '#93c5fd' }}
              >
                You are responsible for declaring all Reaglex income to your local tax authority.
                Reaglex may provide annual earnings statements.
              </p>
            </div>
          </motion.div>
        </motion.div>
      );

    case 'conduct':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Intro box */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-3 sm:px-5 sm:py-4"
              style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: '#fb923c' }}
              >
                Your account represents your brand. Maintain professionalism at all times.
              </p>
            </div>
          </motion.div>

          {/* Required conduct */}
          <motion.div variants={contentItemVariants}>
            <div className="space-y-3">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ✅ You Must Always:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    title: '🎯 Maintain Accurate Store Info',
                    desc: 'Keep name, description, contact details current and truthful.',
                  },
                  {
                    title: '📸 Use Real Identity',
                    desc: 'Profile must represent real person or registered business.',
                  },
                  {
                    title: '🤝 Respect All Buyers',
                    desc: 'No discrimination based on race, gender, religion, location.',
                  },
                  {
                    title: '⚖️ Follow Local Laws',
                    desc: 'All sales must comply with Rwanda law and regulations.',
                  },
                  {
                    title: '🛡️ Protect Buyer Data',
                    desc: 'Never share or misuse buyer personal information.',
                  },
                  {
                    title: '🔔 Stay Active',
                    desc: "If on vacation, set store to away mode. Don't ignore orders.",
                  },
                  {
                    title: '📊 Accurate Reporting',
                    desc: "Don't manipulate metrics, reviews or sales data.",
                  },
                  {
                    title: '🚨 Report Incidents',
                    desc: 'Report security breaches or fraud immediately.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'transparent',
                      boxShadow: 'inset 4px 0 0 #34d399, inset 0 0 0 1px var(--divider)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {card.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Prohibited conduct */}
          <motion.div variants={contentItemVariants}>
            <div className="space-y-3">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ❌ You Must Never:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    title: '👥 Multiple Accounts',
                    desc: 'One seller account per person. Ban for duplicates.',
                  },
                  {
                    title: '🛒 Self-Purchasing',
                    desc: 'Never buy your own products to boost ratings.',
                  },
                  {
                    title: '⭐ Fake Reviews',
                    desc: 'Never solicit, buy or create false reviews.',
                  },
                  {
                    title: '🔗 Off-Platform Deals',
                    desc: 'Never direct buyers to complete deals elsewhere.',
                  },
                  {
                    title: '🎭 Impersonation',
                    desc: 'Never pretend to be another seller or brand.',
                  },
                  {
                    title: '💻 Platform Attacks',
                    desc: 'Never attempt to hack, scrape or abuse platform.',
                  },
                  {
                    title: '📱 Account Sharing',
                    desc: 'Never share login with anyone else.',
                  },
                  {
                    title: '🔄 Fee Circumvention',
                    desc: 'Never attempt to avoid platform fees.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'transparent',
                      boxShadow: 'inset 4px 0 0 #ef4444, inset 0 0 0 1px var(--divider)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {card.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Community standards */}
          <motion.div variants={contentItemVariants}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  icon: '🤝',
                  title: 'Integrity',
                  desc: 'Be honest in everything you do on Reaglex.',
                },
                {
                  icon: '🎯',
                  title: 'Transparency',
                  desc: 'No hidden terms or surprise conditions.',
                },
                {
                  icon: '⚖️',
                  title: 'Fairness',
                  desc: 'Treat all buyers equally and fairly.',
                },
                {
                  icon: '🛡️',
                  title: 'Accountability',
                  desc: 'Take responsibility for your actions.',
                },
                {
                  icon: '🌍',
                  title: 'Community',
                  desc: 'Help Reaglex grow as a trusted market.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl p-4 space-y-1.5"
                  style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
                    style={{
                      background: 'transparent',
                      boxShadow: 'inset 0 0 0 1px var(--divider)',
                    }}
                  >
                    {item.icon}
                  </div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Account security requirements */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5 space-y-3"
              style={{ background: 'var(--bg-secondary, #1a1e2c)' }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                🔒 Security Requirements
              </p>
              <ul className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {[
                  'Enable two-factor authentication',
                  'Use strong unique password',
                  'Never share login credentials',
                  'Log out on shared devices',
                  'Review login history monthly',
                  'Report suspicious activity',
                  'Update email address if changed',
                  'Set up backup authentication',
                ].map((item, index) => (
                  <li key={item} className="flex gap-2">
                    <span
                      className="mt-0.5 h-3 w-3 flex items-center justify-center rounded-sm text-[9px]"
                      style={{
                        background:
                          index === 7 ? 'transparent' : 'rgba(249,115,22,0.15)',
                        boxShadow:
                          index === 7
                            ? 'inset 0 0 0 1px rgba(148,163,184,0.6)'
                            : 'inset 0 0 0 1px rgba(249,115,22,0.85)',
                        color: index === 7 ? '#9ca3af' : '#fb923c',
                      }}
                    >
                      {index === 7 ? '○' : '✓'}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Link
                  to="/account/settings"
                  className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{
                    background: 'transparent',
                    boxShadow: 'inset 0 0 0 1px var(--divider)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Enable 2FA now →
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      );

    case 'violations':
      return (
        <motion.div
          variants={contentContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-xs sm:text-sm"
        >
          {/* Intro warning */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-4"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.35)',
              }}
            >
              <p
                className="text-xs sm:text-sm"
                style={{ color: '#f87171' }}
              >
                ⚠️ All violations are recorded and reviewed by our Trust &amp; Safety team. Repeat
                violations escalate automatically.
              </p>
            </div>
          </motion.div>

          {/* Strike system */}
          <motion.div variants={contentItemVariants}>
            <div className="space-y-3">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ⚡ Strike System
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    title: '⚡ 1 Strike',
                    consequence: 'Consequence: Warning',
                    bg: 'rgba(251,191,36,0.06)',
                    accent: '#fbbf24',
                    details: [
                      'Email warning sent',
                      'Violation recorded',
                      'Guidance provided',
                      '30 days to improve',
                      'No restrictions yet',
                    ],
                    footer: 'Resets after 6 months of compliance',
                  },
                  {
                    title: '⚡⚡ 2 Strikes',
                    consequence: 'Consequence: Restrictions',
                    bg: 'rgba(249,115,22,0.08)',
                    accent: '#fb923c',
                    details: [
                      '7-day listing restriction',
                      'New products need approval',
                      'Seller rating badge lowered',
                      'Priority support removed',
                      'Performance review required',
                    ],
                  },
                  {
                    title: '⚡⚡⚡ 3 Strikes',
                    consequence: 'Consequence: Suspension',
                    bg: 'rgba(248,113,113,0.08)',
                    accent: '#fb7185',
                    details: [
                      '30-day account suspension',
                      'All listings deactivated',
                      'Pending payouts held',
                      'Must complete re-training',
                      'Probation on reinstatement',
                    ],
                  },
                  {
                    title: '⚡⚡⚡⚡ 4+ Strikes',
                    consequence: 'Consequence: Permanent Ban',
                    bg: 'rgba(239,68,68,0.12)',
                    accent: '#ef4444',
                    details: [
                      'Account permanently closed',
                      'All funds reviewed',
                      'Cannot create new account',
                      'Reported to authorities (fraud)',
                      'Name added to blocklist',
                    ],
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl p-4 space-y-2"
                    style={{
                      background: 'transparent',
                      boxShadow: `inset 4px 0 0 ${card.accent}, inset 0 0 0 1px var(--divider)`,
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {card.title}
                    </p>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {card.consequence}
                    </p>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {card.details.map((d) => (
                        <li key={d}>• {d}</li>
                      ))}
                    </ul>
                    {card.footer && (
                      <p
                        className="pt-1 text-[10px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {card.footer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Violation examples */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl overflow-hidden text-xs"
              style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
            >
              <div
                className="grid grid-cols-[2fr_1fr_1fr] px-4 py-2 font-semibold"
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 -1px 0 0 var(--divider)',
                }}
              >
                <div>Violation</div>
                <div>Level</div>
                <div>Consequence</div>
              </div>
              {[
                {
                  v: 'Late shipping (1st time)',
                  level: 'Minor',
                  cons: 'Warning',
                },
                {
                  v: 'Poor packaging',
                  level: 'Minor',
                  cons: 'Warning',
                },
                {
                  v: 'Slow response rate',
                  level: 'Minor',
                  cons: 'Warning + guidance',
                },
                {
                  v: 'Misleading description',
                  level: 'Moderate',
                  cons: 'Listing removed + warning',
                },
                {
                  v: 'Hiding product defects',
                  level: 'Moderate',
                  cons: 'Strike + review',
                },
                {
                  v: 'Ignoring dispute',
                  level: 'Moderate',
                  cons: 'Strike + fee',
                },
                {
                  v: 'Selling prohibited item',
                  level: 'Severe',
                  cons: 'Immediate ban',
                },
                {
                  v: 'Buyer fraud',
                  level: 'Severe',
                  cons: 'Ban + legal',
                },
                {
                  v: 'Fake reviews',
                  level: 'Severe',
                  cons: 'Ban + funds frozen',
                },
                {
                  v: 'Off-platform payment',
                  level: 'Severe',
                  cons: 'Immediate ban',
                },
              ].map((row) => (
                <div
                  key={row.v}
                  className="grid grid-cols-[2fr_1fr_1fr] px-4 py-1.5"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    boxShadow: 'inset 0 -1px 0 0 var(--divider)',
                  }}
                >
                  <div>{row.v}</div>
                  <div>{row.level}</div>
                  <div>{row.cons}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Appeal process */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--divider)' }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Appeal Process
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:justify-between text-[11px]">
                {[
                  {
                    icon: '📩',
                    title: 'Receive Violation Notice',
                    desc: 'Email sent with full details',
                    time: 'Immediately',
                  },
                  {
                    icon: '📖',
                    title: 'Review Your Case',
                    desc: 'Read violation carefully',
                    time: 'Within 24 hours',
                  },
                  {
                    icon: '✍️',
                    title: 'Submit Appeal',
                    desc: 'Use appeal form below',
                    time: 'Within 7 days of notice',
                  },
                  {
                    icon: '📋',
                    title: 'Team Reviews',
                    desc: 'Trust & Safety reviews',
                    time: 'Within 3 business days',
                  },
                  {
                    icon: '📬',
                    title: 'Decision Communicated',
                    desc: 'Final decision emailed',
                    time: 'Cannot be appealed again',
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className="flex flex-1 items-center gap-3"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                      style={{ background: 'rgba(249,115,22,0.18)', color: '#fed7aa' }}
                    >
                      {step.icon}
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {step.title}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {step.desc}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {step.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Appeal mini form */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5 space-y-3"
              style={{ background: 'var(--bg-secondary, #1a1e2c)' }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Submit an Appeal
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Violation ticket number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VIOL-2026-000123"
                    className="w-full rounded-lg bg-[#0e1118] px-3 py-2 text-[11px] outline-none"
                    style={{ color: 'var(--text-primary)', border: 'none' }}
                    readOnly
                  />
                  <p
                    className="text-[10px]"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    Use the ticket ID from your violation email.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Evidence (screenshots, receipts, etc.)
                  </label>
                  <div
                    className="flex h-[96px] items-center justify-center rounded-lg border border-dashed text-[11px]"
                    style={{
                      borderColor: 'rgba(148,163,184,0.6)',
                      background: '#0e1118',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Drag &amp; drop files (mock)
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Explanation
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain clearly why you believe this violation is incorrect..."
                  className="w-full resize-none rounded-lg bg-[#0e1118] px-3 py-2 text-[11px] outline-none"
                  style={{ color: 'var(--text-primary)', border: 'none' }}
                  readOnly
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold"
                  style={{
                    background: 'linear-gradient(135deg,#f97316,#ea580c)',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  Submit Appeal
                </button>
                <p
                  className="text-[11px]"
                  style={{ color: '#fb923c' }}
                >
                  Or email{' '}
                  <a href="mailto:seller-appeals@reaglex.com" style={{ color: '#fb923c' }}>
                    seller-appeals@reaglex.com
                  </a>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Reinstatement process */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{ background: 'var(--bg-secondary, #1a1e2c)' }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Reinstatement After Suspension
              </p>
              <ol className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <li>1. Wait out suspension period.</li>
                <li>2. Complete seller re-training (📚 Takes ~30 minutes online).</li>
                <li>3. Submit reinstatement request.</li>
                <li>4. 30-day probation period (all orders monitored closely).</li>
                <li>5. Full access restored if no further violations.</li>
              </ol>
            </div>
          </motion.div>

          {/* How to avoid violations */}
          <motion.div variants={contentItemVariants}>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-4"
              style={{ background: 'rgba(22,163,74,0.08)' }}
            >
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: '#4ade80' }}
              >
                ✅ Stay Violation-Free:
              </p>
              <ul className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <li>• Ship on time, every time.</li>
                <li>• Respond within 2 hours always.</li>
                <li>• List products accurately.</li>
                <li>• Never sell prohibited items.</li>
                <li>• Keep metrics above thresholds.</li>
                <li>• Cooperate with all disputes.</li>
                <li>• Read guideline updates monthly.</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      );

    default:
      return null;
  }
}

export default function SellerGuidelines() {
  const { isSeller } = useSellerAccess();
  const [openIds, setOpenIds] = useState<string[]>([SECTIONS[0].id]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(SECTIONS[0].id);
  const [readSections, setReadSections] = useState<string[]>([]);
  const timersRef = useRef<Record<string, number>>({});
  const contentRef = useRef<HTMLDivElement | null>(null);

  const markSectionRead = (id: string) => {
    setReadSections((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(GUIDELINES_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(GUIDELINES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((id: unknown): id is string =>
            typeof id === 'string' && SECTIONS.some((s) => s.id === id),
          );
          if (valid.length) {
            setReadSections(valid);
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // start timers for newly opened, unread sections
    openIds.forEach((id) => {
      if (!readSections.includes(id) && !timersRef.current[id]) {
        timersRef.current[id] = window.setTimeout(() => {
          markSectionRead(id);
          delete timersRef.current[id];
        }, 5000);
      }
    });

    // clear timers for sections that are no longer open
    Object.keys(timersRef.current).forEach((id) => {
      if (!openIds.includes(id)) {
        window.clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    });
  }, [openIds, readSections]);

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      Object.values(timersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    },
    [],
  );

  const handleToggleSection = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((sectionId) => sectionId !== id) : [...prev, id],
    );
  };

  const allRead = readSections.length >= SECTIONS.length;
  const progressPercent = (readSections.length / SECTIONS.length) * 100;
  const progressDegrees = Math.min(360, Math.max(0, (progressPercent / 100) * 360));

  const scrollToSection = (sectionId: string) => {
    const contentEl = contentRef.current;
    const targetSection = document.getElementById(`guideline-${sectionId}`);

    if (contentEl && targetSection) {
      const stickyOffset = 56;
      const targetTop = Math.max(0, targetSection.offsetTop - stickyOffset);
      contentEl.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const handleScroll = () => {
      const scrollTop = contentEl.scrollTop;
      const sectionEls = Array.from(
        contentEl.querySelectorAll<HTMLElement>('[data-guideline-section="true"]'),
      );

      let currentId: string | null = null;

      for (const el of sectionEls) {
        const top = el.offsetTop - 120;
        const bottom = top + el.offsetHeight;
        if (scrollTop >= top && scrollTop < bottom) {
          const rawId = el.getAttribute('id') || '';
          currentId = rawId.startsWith('guideline-') ? rawId.replace('guideline-', '') : rawId;
          break;
        }
      }

      if (currentId) {
        setActiveSectionId((prev) => (prev === currentId ? prev : currentId));
        setOpenIds((prev) => (prev.includes(currentId as string) ? prev : [...prev, currentId!]));
      }
    };

    contentEl.addEventListener('scroll', handleScroll);
    return () => {
      contentEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <BuyerLayout>
      <main className="min-h-[60vh] w-full px-4 py-10 sm:px-6 lg:px-10 space-y-10">
        <section
          className="rounded-[24px] px-6 py-10 sm:px-10"
          style={{
            background:
              'linear-gradient(135deg,#020617 0%,#020617 15%,#0f172a 60%,#020617 100%)',
          }}
        >
          <div className="mx-auto max-w-4xl text-center space-y-4">
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              📋 Seller Guidelines
            </p>
            <p
              className="text-sm sm:text-base"
              style={{ color: 'rgba(241,245,249,0.8)' }}
            >
              Everything you need to know to sell successfully on Reaglex.
            </p>
          </div>
        </section>

        <section className="w-full space-y-6">
          {allRead && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.8, 0.4, 1] }}
              className="rounded-2xl px-5 py-4 md:px-6 md:py-5 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
              style={{
                background:
                  'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(21,128,61,0.15))',
              }}
            >
              <div>
                <p
                  className="text-sm md:text-base font-semibold"
                  style={{ color: '#ecfdf5' }}
                >
                  🎉 You&apos;ve read all guidelines!
                </p>
                <p
                  className="text-xs md:text-sm"
                  style={{ color: '#bbf7d0' }}
                >
                  You can now acknowledge below or start applying these best practices in your
                  store.
                </p>
              </div>
            </motion.div>
          )}

          <div className="space-y-1 max-w-xl">
            <p
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-faint)' }}
            >
              Seller guideline sections
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Expand each section to learn how to sell safely and successfully on Reaglex.
            </p>
          </div>

          <div className="guidelines-layout">
            {/* TOC / progress */}
            <aside className="space-y-4 guidelines-sidebar">
              <div
                className="rounded-2xl p-4 sm:p-5 space-y-4"
                style={{ background: 'var(--card-bg)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(#22c55e ${progressDegrees}deg, rgba(15,23,42,0.9) 0deg)`,
                    }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                      style={{
                        background: '#020617',
                      }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Guideline Progress
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {readSections.length} of {SECTIONS.length} sections read
                    </p>
                  </div>
                </div>
              </div>

              <nav
                className="rounded-2xl p-3 sm:p-4 space-y-1"
                style={{ background: 'var(--card-bg)' }}
              >
                {SECTIONS.map((section) => {
                  const read = readSections.includes(section.id);
                  const active = activeSectionId === section.id;
                  const isOpen = openIds.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      data-section={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setOpenIds((prev) =>
                          prev.includes(section.id) ? prev : [...prev, section.id],
                        );
                      }}
                      className="toc-item group flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-xs transition-colors"
                      style={{
                        background:
                          active || isOpen ? 'rgba(15,23,42,0.85)' : 'transparent',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{section.icon}</span>
                        <span>{section.title}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: read ? '#22c55e' : 'rgba(148,163,184,0.6)',
                          }}
                        />
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--text-faint)' }}
                        >
                          {read ? 'Read' : 'Unread'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Sections */}
            <div ref={contentRef} className="guidelines-content">
              <div className="guidelines-content-inner space-y-4">
              {SECTIONS.map((section) => {
                const open = openIds.includes(section.id);
                const read = readSections.includes(section.id);
                return (
                  <motion.div
                    key={section.id}
                    id={`guideline-${section.id}`}
                    data-guideline-section="true"
                    initial={false}
                    animate={{
                      backgroundColor: open ? 'var(--bg-secondary)' : 'var(--card-bg)',
                    }}
                    className="overflow-hidden rounded-[16px]"
                    style={{
                      boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => handleToggleSection(section.id)}
                      className="relative flex w-full items-center justify-between gap-3 px-5 py-4 text-left overflow-hidden"
                    >
                      <motion.div
                        className="pointer-events-none absolute inset-0"
                        initial={{ opacity: 0, scaleX: 0, originX: 0 }}
                        whileHover={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(249,115,22,0.14), transparent)',
                        }}
                      />
                      <div className="relative z-10 flex items-center gap-3">
                        <span className="text-xl">{section.icon}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {section.title}
                          </span>
                          {read && (
                            <span
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                              style={{
                                background: 'rgba(34,197,94,0.1)',
                                color: '#4ade80',
                              }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Read
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{
                            background: 'rgba(15,23,42,0.9)',
                            boxShadow: '0 0 0 1px rgba(148,163,184,0.3)',
                          }}
                        >
                          <ChevronDown
                            size={16}
                            strokeWidth={1.8}
                            style={{ color: 'var(--text-secondary)' }}
                          />
                        </motion.span>
                      </div>
                    </motion.button>

                    <div
                      className="overflow-hidden"
                      style={{
                        maxHeight: open ? 2000 : 0,
                        transition: open
                          ? 'max-height 0.4s ease, opacity 0.4s ease 0.15s'
                          : 'max-height 0.3s ease-in, opacity 0.15s ease-in',
                        opacity: open ? 1 : 0,
                      }}
                    >
                      <div
                        style={{
                          padding: '0 28px 32px',
                          background: 'rgba(255,255,255,0.01)',
                          borderTop:
                            '1px solid transparent',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            height: 1,
                            background:
                              'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
                          }}
                        />
                        <div className="pt-5">
                          {renderSectionContent(section.id)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full grid gap-6 md:grid-cols-2">
          <div
            className="rounded-[18px] p-5 space-y-2"
            style={{ background: 'var(--card-bg)' }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              🚫 Prohibited Items
            </p>
            <ul className="space-y-1 text-xs">
              {[
                'Weapons / firearms',
                'Illegal substances',
                'Counterfeit goods',
                'Adult content',
                'Stolen items',
                'Hazardous materials',
              ].map((item) => (
                <li key={item} style={{ color: 'var(--text-muted)' }}>
                  ✗ {item}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-[18px] p-5 grid gap-4 md:grid-cols-2 text-xs"
            style={{ background: 'var(--card-bg)' }}
          >
            <div>
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ✅ Do&apos;s
              </p>
              <ul className="space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Provide accurate product information.</li>
                <li>Ship orders on time.</li>
                <li>Respond to buyers quickly.</li>
                <li>Use secure packaging.</li>
              </ul>
            </div>
            <div>
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ❌ Don&apos;ts
              </p>
              <ul className="space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Sell prohibited or counterfeit items.</li>
                <li>Mislead buyers about condition or brand.</li>
                <li>Encourage off-platform payments.</li>
                <li>Harass or threaten buyers.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="w-full text-center space-y-3">
          {isSeller ? (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Ready to manage your store?
              </p>
              <Link
                to="/seller"
                className="inline-flex items-center justify-center rounded-[999px] px-6 py-2 text-sm font-semibold"
                style={{
                  background:
                    'linear-gradient(135deg,#f97316,#ea580c)',
                  color: '#ffffff',
                }}
              >
                Back to Seller Dashboard →
              </Link>
            </>
          ) : (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Ready to start selling?
              </p>
              <Link
                to="/become-seller"
                className="inline-flex items-center justify-center rounded-[999px] px-6 py-2 text-sm font-semibold"
                style={{
                  background:
                    'linear-gradient(135deg,#f97316,#ea580c)',
                  color: '#ffffff',
                }}
              >
                Apply Now →
              </Link>
            </>
          )}
        </section>
        <style>
          {`
:root {
  --header-total-height: 264px;
}

.guidelines-layout {
  display: flex;
  align-items: flex-start;
  height: calc(100vh - var(--header-total-height));
  max-height: calc(100vh - var(--header-total-height));
  overflow: hidden;
  position: relative;
  gap: 24px;
  padding: 24px 0;
}

.guidelines-sidebar {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: calc(100vh - var(--header-total-height));
  scrollbar-width: thin;
  scrollbar-color: #1e2234 transparent;
}

.guidelines-sidebar::-webkit-scrollbar {
  width: 4px;
}
.guidelines-sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.guidelines-sidebar::-webkit-scrollbar-thumb {
  background: #1e2234;
  border-radius: 4px;
}
.guidelines-sidebar::-webkit-scrollbar-thumb:hover {
  background: #28304a;
}

.guidelines-content {
  flex: 1;
  min-width: 0;
  height: calc(100vh - var(--header-total-height));
  max-height: calc(100vh - var(--header-total-height));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  padding-bottom: 40px;
  padding-top: 4px;
  scroll-behavior: smooth;
  scroll-padding-top: 72px;
  scrollbar-width: thin;
  scrollbar-color: #1e2234 transparent;
}

.guidelines-content::-webkit-scrollbar {
  width: 5px;
}
.guidelines-content::-webkit-scrollbar-track {
  background: transparent;
}
.guidelines-content::-webkit-scrollbar-thumb {
  background: #1e2234;
  border-radius: 4px;
}
.guidelines-content::-webkit-scrollbar-thumb:hover {
  background: #28304a;
}

.guidelines-content-inner {
  padding-top: 12px;
}

@media (max-width: 768px) {
  .guidelines-layout {
    flex-direction: column;
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .guidelines-sidebar {
    width: 100%;
    min-width: 0;
    height: auto;
    max-height: none;
    position: relative;
    top: 0;
    overflow: visible;
  }

  .guidelines-content {
    width: 100%;
    height: auto;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}

[data-theme="dark"] .guidelines-sidebar::-webkit-scrollbar-thumb,
[data-theme="dark"] .guidelines-content::-webkit-scrollbar-thumb {
  background: #1e2234;
}

[data-theme="dark"] .guidelines-sidebar::-webkit-scrollbar-thumb:hover,
[data-theme="dark"] .guidelines-content::-webkit-scrollbar-thumb:hover {
  background: #28304a;
}
          `}
        </style>
      </main>
    </BuyerLayout>
  );
}

