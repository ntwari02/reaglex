import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { Link } from 'react-router-dom';

type CookiePrefs = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  social: boolean;
  performance: boolean;
  savedAt?: string;
  version: '1.0';
};

const STORAGE_KEY = 'reaglex-cookie-prefs';

const DEFAULT_PREFS: CookiePrefs = {
  essential: true,
  analytics: true,
  marketing: false,
  personalization: true,
  social: false,
  performance: true,
  version: '1.0',
};

const formatDate = (iso?: string) => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

type ToggleProps = {
  on: boolean;
  locked?: boolean;
  onChange?: (next: boolean) => void;
};

function CookieToggle({ on, locked, onChange }: ToggleProps) {
  const trackColor = locked ? '#34d399' : on ? '#f97316' : 'var(--toggle-off-bg, #e2e8f0)';
  const thumbX = on ? 24 : 2;

  return (
    <div
      role="button"
      tabIndex={locked ? -1 : 0}
      className="relative inline-flex items-center"
      style={{
        width: 50,
        height: 26,
        borderRadius: 999,
        background: trackColor,
        boxShadow: on
          ? '0 0 0 3px rgba(249,115,22,0.20)'
          : '0 0 0 0 rgba(0,0,0,0)',
        padding: 0,
        border: 'none',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.85 : 1,
        transition: 'background 0.25s ease, box-shadow 0.25s ease',
      }}
      onClick={() => {
        if (locked || !onChange) return;
        onChange(!on);
      }}
      onKeyDown={(e) => {
        if (locked || !onChange) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!on);
        }
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 22,
          height: 22,
          borderRadius: '999px',
          background: '#ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          transform: `translateX(${thumbX}px)`,
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />
    </div>
  );
}

type CategoryKey =
  | 'essential'
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'social'
  | 'performance';

function CookieSettings() {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const [savedPrefs, setSavedPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const [expanded, setExpanded] = useState<Record<CategoryKey, boolean>>({
    essential: true,
    analytics: true,
    marketing: false,
    personalization: false,
    social: false,
    performance: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [pendingDangerAction, setPendingDangerAction] = useState<
    null | 'clear-cookies' | 'reset-prefs' | 'delete-data'
  >(null);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as CookiePrefs;
      if (parsed && parsed.version === '1.0') {
        setPrefs(parsed);
        setSavedPrefs(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    const keys: CategoryKey[] = [
      'analytics',
      'marketing',
      'personalization',
      'social',
      'performance',
    ];
    return keys.some((k) => prefs[k] !== savedPrefs[k]);
  }, [prefs, savedPrefs]);

  const modifiedCount = useMemo(() => {
    const keys: CategoryKey[] = [
      'analytics',
      'marketing',
      'personalization',
      'social',
      'performance',
    ];
    return keys.filter((k) => prefs[k] !== savedPrefs[k]).length;
  }, [prefs, savedPrefs]);

  useEffect(() => {
    setShowStickyBar(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  const updateCategory = (key: CategoryKey, value: boolean) => {
    if (key === 'essential') return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleAcceptAll = () => {
    setPrefs((prev) => ({
      ...prev,
      analytics: true,
      marketing: true,
      personalization: true,
      social: true,
      performance: true,
    }));
  };

  const handleRejectAll = () => {
    setPrefs((prev) => ({
      ...prev,
      analytics: false,
      marketing: false,
      personalization: false,
      social: false,
      performance: false,
    }));
  };

  const handleResetDefault = () => {
    setPrefs((prev) => ({ ...DEFAULT_PREFS, savedAt: prev.savedAt }));
  };

  const persistPrefs = async () => {
    setSaving(true);
    setSaveSuccess(false);
    const next: CookiePrefs = {
      ...prefs,
      essential: true,
      version: '1.0',
      savedAt: new Date().toISOString(),
    };
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      setSavedPrefs(next);
      setPrefs(next);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPrefs(savedPrefs);
  };

  const lastUpdatedLabel = useMemo(
    () => `Last updated: ${formatDate(savedPrefs.savedAt)}`,
    [savedPrefs.savedAt],
  );

  const quickStatusText = saveSuccess ? 'Preferences Saved' : hasUnsavedChanges ? 'Unsaved changes' : 'Preferences Up to Date';

  return (
    <BuyerLayout>
      <div className="w-full" style={{ color: 'var(--text-primary)' }}>
        {/* HERO */}
        <section
          className="relative w-full overflow-hidden"
          style={{
            padding: '80px 40px',
            background:
              'linear-gradient(135deg,#0f0c24 0%, #1a0f3a 40%, #0d1f3a 70%, #0a1628 100%)',
          }}
        >
          {/* floating blobs */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              initial={{ opacity: 0.4, y: -10 }}
              animate={{ opacity: 0.9, y: 10 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -top-32 -left-24 rounded-full"
              style={{
                width: 260,
                height: 260,
                background: 'rgba(249,115,22,0.20)',
                filter: 'blur(90px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.4, x: -10 }}
              animate={{ opacity: 0.8, x: 10 }}
              transition={{ duration: 2.4, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute inset-y-1/4 left-1/2 rounded-full"
              style={{
                width: 220,
                height: 220,
                background: 'rgba(96,165,250,0.18)',
                filter: 'blur(80px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.4, y: 10 }}
              animate={{ opacity: 0.8, y: -10 }}
              transition={{ duration: 2.6, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -bottom-40 -right-24 rounded-full"
              style={{
                width: 260,
                height: 260,
                background: 'rgba(124,58,237,0.20)',
                filter: 'blur(90px)',
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-4xl text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center">
              <span
                style={{
                  background: 'rgba(249,115,22,0.15)',
                  color: '#fb923c',
                  borderRadius: 999,
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                🍪 Cookie Preferences
              </span>
            </div>
            <div className="space-y-3">
              <h1
                className="font-extrabold leading-tight"
                style={{ color: '#ffffff', fontSize: 48 }}
              >
                Your Privacy,
              </h1>
              <p
                className="font-extrabold leading-tight"
                style={{
                  fontSize: 48,
                  background: 'linear-gradient(135deg,#f97316,#fb923c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Your Choice
              </p>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: 'rgba(255,255,255,0.60)', fontSize: 16 }}
              >
                Control how Reaglex uses cookies to personalize your experience. Your
                preferences are saved instantly.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[13px]">
              {['🔒 GDPR Compliant', '✓ Instant Save', '🛡️ Your Data is Safe'].map(
                (label) => (
                  <span
                    key={label}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.85)',
                      borderRadius: 999,
                      padding: '6px 16px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          </motion.div>
        </section>

        {/* TIER 2 — Quick action bar */}
        <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-[20px] md:flex-row md:items-center md:justify-between"
            style={{
              background: 'var(--card-bg)',
              padding: '24px 32px',
              boxShadow:
                'var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-xl"
                style={{
                  background: 'linear-gradient(135deg,#f97316,#ea580c)',
                  boxShadow: '0 0 24px rgba(234,88,12,0.6)',
                }}
              >
                🍪
              </div>
              <div>
                <p
                  className="text-base font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Cookie Preferences
                </p>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {lastUpdatedLabel}
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: '#34d399' }}
                />
                <span style={{ color: '#34d399' }}>{quickStatusText}</span>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-[12px] px-4 py-2 text-sm font-semibold text-white"
                  style={{
                    background:
                      'linear-gradient(135deg,#059669,#047857)',
                    boxShadow: '0 4px 16px rgba(5,150,105,0.35)',
                  }}
                >
                  ✓ Accept All
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="rounded-[12px] px-4 py-2 text-sm font-semibold"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    boxShadow: '0 0 0 1.5px var(--divider)',
                  }}
                >
                  ✗ Reject All
                </button>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="rounded-[12px] px-3 py-2 text-[13px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ↺ Reset to Default
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* BODY */}
        <main className="w-full px-4 pt-10 pb-20 sm:px-6 lg:px-10 space-y-14">
          {/* TIER 3 — What are cookies */}
          <section className="space-y-6 max-w-6xl mx-auto">
            <h2
              className="text-xl md:text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              🍪 What Are Cookies?
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="grid gap-8 rounded-[24px] px-6 py-8 md:grid-cols-[1.2fr_1fr]"
              style={{
                background: 'linear-gradient(145deg,#1a0f3a 0%,#0d1f3a 100%)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div className="space-y-4">
                <p
                  className="text-sm md:text-[15px]"
                  style={{ color: 'rgba(255,255,255,0.80)', lineHeight: 1.8 }}
                >
                  Cookies are small text files stored on your device when you visit Reaglex.
                  They help us remember your preferences and improve your experience.
                </p>
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: 'rgba(255,255,255,0.70)' }}
                >
                  We use cookies to:
                </p>
                <ul className="grid gap-1 text-[13px] sm:grid-cols-2">
                  {[
                    'Keep you signed in securely',
                    'Remember your cart items',
                    'Show relevant products',
                    'Improve site performance',
                    'Analyze how you use Reaglex',
                    'Personalize your experience',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: '#f97316' }}
                      />
                      <span style={{ color: 'rgba(248,250,252,0.90)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                {[
                  {
                    label: 'Essential',
                    value: 100,
                    color: 'linear-gradient(135deg,#f97316,#ea580c)',
                  },
                  {
                    label: 'Analytics',
                    value: prefs.analytics ? 60 : 0,
                    color: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  },
                  {
                    label: 'Marketing',
                    value: prefs.marketing ? 40 : 0,
                    color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                  },
                  {
                    label: 'Preferences',
                    value: prefs.personalization ? 80 : 0,
                    color: 'linear-gradient(135deg,#22c55e,#16a34a)',
                  },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span style={{ color: 'rgba(248,250,252,0.95)' }}>{bar.label}</span>
                      <span style={{ color: 'rgba(148,163,184,0.9)' }}>
                        {bar.value}%
                      </span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full"
                      style={{ background: 'rgba(255,255,255,0.10)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${bar.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2 }}
                        className="h-full rounded-full"
                        style={{ background: bar.color }}
                      />
                    </div>
                  </div>
                ))}
                <p
                  className="pt-1 text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.40)' }}
                >
                  Based on your current settings
                </p>
              </div>
            </motion.div>
          </section>

          {/* TIER 4 — Cookie categories heading */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  className="text-xl md:text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ⚙️ Manage Cookie Categories
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Toggle each category on or off to control your privacy.
                </p>
              </div>
              <AnimatePresence>
                {hasUnsavedChanges && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-3 rounded-full px-3 py-2"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: '#f97316' }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ● Unsaved changes
                    </span>
                    <button
                      type="button"
                      onClick={persistPrefs}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{
                        background:
                          'linear-gradient(135deg,#f97316,#ea580c)',
                      }}
                    >
                      Save Preferences
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category cards */}
            <div className="space-y-4">
              {/* Essential */}
              <CategoryCard
                type="essential"
                title="Essential Cookies"
                subtitle="Required for the site to function"
                description="These cookies are necessary for Reaglex to function properly. They enable core features like security, network management, and account access. You cannot disable these."
                icon="🔒"
                iconGradient="linear-gradient(135deg,#059669,#047857)"
                cookiesCount={8}
                badges={[
                  { label: '8 cookies', tone: 'neutral' },
                  { label: 'Always Active', tone: 'success' },
                ]}
                cookies={[
                  ['session_id', 'Login session', 'Session', 'Reaglex'],
                  ['csrf_token', 'Security', 'Session', 'Reaglex'],
                  ['cart_data', 'Shopping cart', '7 days', 'Reaglex'],
                  ['auth_token', 'Authentication', '30 days', 'Reaglex'],
                  ['user_prefs', 'UI preferences', '1 year', 'Reaglex'],
                  ['lang', 'Language', '1 year', 'Reaglex'],
                  ['currency', 'Currency pref', '1 year', 'Reaglex'],
                  ['theme', 'Dark/light mode', '1 year', 'Reaglex'],
                ]}
                value={prefs.essential}
                locked
                expanded={expanded.essential}
                onToggleExpand={() =>
                  setExpanded((prev) => ({ ...prev, essential: !prev.essential }))
                }
                onChange={undefined}
              />

              {/* Analytics */}
              <CategoryCard
                type="analytics"
                title="Analytics Cookies"
                subtitle="Help us understand how you use Reaglex"
                description="These cookies collect anonymous information about how visitors use Reaglex. This helps us improve the site, fix bugs, and understand which features are most useful. All data is anonymized."
                icon="📊"
                iconGradient="linear-gradient(135deg,#3b82f6,#1d4ed8)"
                cookiesCount={6}
                badges={[{ label: '6 cookies', tone: 'neutral' }]}
                cookies={[
                  ['_ga', 'Google Analytics', '2 years', 'Google'],
                  ['_gid', 'Analytics session', '24hrs', 'Google'],
                  ['_gat', 'Rate limiting', '1 min', 'Google'],
                  ['reaglex_analytics', 'Page views', '30 days', 'Reaglex'],
                  ['session_duration', 'Time on site', 'Session', 'Reaglex'],
                  ['feature_usage', 'Feature tracking', '90 days', 'Reaglex'],
                ]}
                value={prefs.analytics}
                expanded={expanded.analytics}
                onToggleExpand={() =>
                  setExpanded((prev) => ({ ...prev, analytics: !prev.analytics }))
                }
                onChange={(next) => updateCategory('analytics', next)}
                extraContent={
                  !prefs.analytics ? (
                    <div
                      className="mt-3 rounded-[12px] px-4 py-3 text-xs"
                      style={{
                        background: 'var(--status-info-bg, #060f22)',
                        color: '#60a5fa',
                      }}
                    >
                      ℹ️ Disabling analytics means we can&apos;t improve your experience
                      based on usage patterns.
                    </div>
                  ) : null
                }
              />

              {/* Marketing */}
              <CategoryCard
                type="marketing"
                title="Marketing Cookies"
                subtitle="Enable personalized ads and offers"
                description="Marketing cookies track your browsing activity to show you relevant ads and promotions. Disabling these means you may see less relevant advertisements."
                icon="📢"
                iconGradient="linear-gradient(135deg,#8b5cf6,#7c3aed)"
                cookiesCount={5}
                badges={[{ label: '5 cookies', tone: 'neutral' }]}
                cookies={[
                  ['_fbp', 'Facebook pixel', '90 days', 'Meta'],
                  ['ad_session', 'Ad tracking', 'Session', 'Google'],
                  ['retarget', 'Retargeting', '30 days', 'Reaglex'],
                  ['promo_seen', 'Promotion tracking', '7 days', 'Reaglex'],
                  ['campaign_id', 'Campaign source', '30 days', 'Reaglex'],
                ]}
                value={prefs.marketing}
                expanded={expanded.marketing}
                onToggleExpand={() =>
                  setExpanded((prev) => ({ ...prev, marketing: !prev.marketing }))
                }
                onChange={(next) => updateCategory('marketing', next)}
                extraContent={
                  <div
                    className="mt-3 rounded-[12px] px-4 py-3 text-xs"
                    style={{
                      background: 'rgba(248,153,90,0.10)',
                      color: '#fb923c',
                    }}
                  >
                    We never sell your data to third parties. Marketing cookies are used
                    only to improve ad relevance.
                  </div>
                }
              />

              {/* Personalization */}
              <CategoryCard
                type="personalization"
                title="Personalization Cookies"
                subtitle="Remember your preferences and history"
                description="These cookies remember your preferences and browsing history to show you personalized product recommendations, recently viewed items, and tailored content."
                icon="🎯"
                iconGradient="linear-gradient(135deg,#fbbf24,#f59e0b)"
                cookiesCount={7}
                badges={[{ label: '7 cookies', tone: 'neutral' }]}
                cookies={[
                  ['recently_viewed', 'Product history', '30 days', 'Reaglex'],
                  ['wishlist_temp', 'Temp wishlist', '7 days', 'Reaglex'],
                  ['search_history', 'Search queries', '30 days', 'Reaglex'],
                  ['recommendations', 'Product recs', '14 days', 'Reaglex'],
                  ['category_pref', 'Category interest', '60 days', 'Reaglex'],
                  ['price_filter', 'Last used filters', '7 days', 'Reaglex'],
                  ['sort_pref', 'Sort preference', '30 days', 'Reaglex'],
                ]}
                value={prefs.personalization}
                expanded={expanded.personalization}
                onToggleExpand={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    personalization: !prev.personalization,
                  }))
                }
                onChange={(next) => updateCategory('personalization', next)}
                extraContent={
                  !prefs.personalization ? (
                    <div
                      className="mt-3 rounded-[12px] px-4 py-3 text-xs"
                      style={{
                        background: 'rgba(251,191,36,0.08)',
                        color: '#facc15',
                      }}
                    >
                      Disabling personalization means product recommendations won&apos;t be
                      tailored to your interests.
                    </div>
                  ) : null
                }
              />

              {/* Social */}
              <CategoryCard
                type="social"
                title="Social Media Cookies"
                subtitle="Enable social sharing features"
                description="Social cookies enable features like sharing products to Facebook, Twitter, or WhatsApp. They may also allow social networks to track your visit."
                icon="👥"
                iconGradient="linear-gradient(135deg,#f97316,#ec4899)"
                cookiesCount={4}
                badges={[{ label: '4 cookies', tone: 'neutral' }]}
                cookies={[
                  ['fb_login', 'Facebook login', '90 days', 'Meta'],
                  ['google_login', 'Google login', '1 year', 'Google'],
                  ['whatsapp_share', 'Share tracking', '7 days', 'Meta'],
                  ['social_session', 'Social auth', 'Session', 'Reaglex'],
                ]}
                value={prefs.social}
                expanded={expanded.social}
                onToggleExpand={() =>
                  setExpanded((prev) => ({ ...prev, social: !prev.social }))
                }
                onChange={(next) => updateCategory('social', next)}
              />

              {/* Performance */}
              <CategoryCard
                type="performance"
                title="Performance Cookies"
                subtitle="Improve site speed and reliability"
                description="Performance cookies help us deliver a faster, more reliable experience. They track things like page load times, error logs, and CDN performance."
                icon="⚡"
                iconGradient="linear-gradient(135deg,#22c55e,#14b8a6)"
                cookiesCount={4}
                badges={[{ label: '4 cookies', tone: 'neutral' }]}
                cookies={[
                  ['cdn_pref', 'CDN routing', '7 days', 'Cloudflare'],
                  ['perf_monitor', 'Performance data', '1 day', 'Reaglex'],
                  ['error_log', 'Error tracking', '30 days', 'Reaglex'],
                  ['load_balance', 'Server routing', 'Session', 'Reaglex'],
                ]}
                value={prefs.performance}
                expanded={expanded.performance}
                onToggleExpand={() =>
                  setExpanded((prev) => ({ ...prev, performance: !prev.performance }))
                }
                onChange={(next) => updateCategory('performance', next)}
              />
            </div>
          </section>

          {/* TIER 6 — Consent history */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  📋 Consent History
                </h2>
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Track of all your previous preference changes.
                </p>
              </div>
              <button
                type="button"
                className="rounded-[999px] px-4 py-2 text-xs font-semibold"
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 0 0 1px var(--divider)',
                }}
              >
                📥 Export Consent History
              </button>
            </div>
            <div
              className="overflow-hidden rounded-[20px]"
              style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
            >
              <div
                className="flex gap-4 px-6 py-4 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  background:
                    'linear-gradient(135deg,#1a0f3a,#0d1f3a)',
                  color: 'rgba(255,255,255,0.60)',
                }}
              >
                <div className="flex-[1.6]">Date</div>
                <div className="flex-[1.4]">Action</div>
                <div className="flex-[2]">Categories</div>
                <div className="flex-[1.4]">Device</div>
              </div>
              <div className="divide-y divide-[var(--divider)] text-xs">
                {[
                  [
                    'Mar 5, 2026 9:14 AM',
                    'Preferences Updated',
                    'Analytics ON, Marketing OFF',
                    'Chrome / Windows',
                    'updated',
                  ],
                  [
                    'Mar 1, 2026 2:30 PM',
                    'Accepted All',
                    'All categories enabled',
                    'Mobile / Android',
                    'accepted',
                  ],
                  [
                    'Feb 28, 2026 11:00 AM',
                    'Initial Setup',
                    'Default preferences applied',
                    'Chrome / Windows',
                    'default',
                  ],
                ].map(([date, action, cats, device, kind]) => (
                  <div
                    key={`${date}-${action}`}
                    className="flex items-center gap-4 px-6 py-4"
                    style={{ cursor: 'default' }}
                  >
                    <div className="flex-[1.6]" style={{ color: 'var(--text-secondary)' }}>
                      {date}
                    </div>
                    <div className="flex-[1.4]">
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{
                          background:
                            kind === 'accepted'
                              ? 'rgba(34,197,94,0.15)'
                              : kind === 'updated'
                              ? 'rgba(249,115,22,0.15)'
                              : 'rgba(148,163,184,0.15)',
                          color:
                            kind === 'accepted'
                              ? '#22c55e'
                              : kind === 'updated'
                              ? '#f97316'
                              : '#9ca3af',
                          boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.15)',
                        }}
                      >
                        {action}
                      </span>
                    </div>
                    <div className="flex-[2]" style={{ color: 'var(--text-secondary)' }}>
                      {cats}
                    </div>
                    <div className="flex-[1.4]" style={{ color: 'var(--text-faint)' }}>
                      {device}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TIER 7 — Privacy rights */}
          <section className="space-y-6 max-w-6xl mx-auto">
            <div>
              <h2
                className="text-xl md:text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                ⚖️ Your Privacy Rights
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Under GDPR and local privacy laws, you have these rights.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '👁️',
                  title: 'Right to Access',
                  desc: 'Request a copy of all personal data we hold about you.',
                  link: 'Request Data →',
                  color: '#3b82f6',
                },
                {
                  icon: '🗑️',
                  title: 'Right to Erasure',
                  desc: 'Request deletion of your personal data from our systems.',
                  link: 'Delete My Data →',
                  color: '#f87171',
                },
                {
                  icon: '✏️',
                  title: 'Right to Rectification',
                  desc: 'Correct any inaccurate personal data we hold about you.',
                  link: 'Update Data →',
                  color: '#f97316',
                },
                {
                  icon: '📦',
                  title: 'Right to Portability',
                  desc: 'Export your data in a machine-readable format.',
                  link: 'Export Data →',
                  color: '#22c55e',
                },
                {
                  icon: '🚫',
                  title: 'Right to Object',
                  desc: 'Object to processing of your data for marketing.',
                  link: 'Opt Out →',
                  color: '#a855f7',
                },
                {
                  icon: '⏸️',
                  title: 'Right to Restrict',
                  desc: 'Limit how we process your personal data.',
                  link: 'Restrict Processing →',
                  color: '#fbbf24',
                },
              ].map((r) => (
                <motion.div
                  key={r.title}
                  whileHover={{ y: -4 }}
                  className="rounded-[16px] p-6"
                  style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-full text-xl"
                    style={{
                      background: 'rgba(59,130,246,0.15)',
                      color: r.color,
                    }}
                  >
                    {r.icon}
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {r.title}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {r.desc}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold"
                    style={{ color: r.color }}
                  >
                    {r.link}
                  </button>
                </motion.div>
              ))}
            </div>
            <div
              className="rounded-[20px] p-6 md:p-7"
              style={{
                background: 'linear-gradient(145deg,#1a0f3a,#0d1f3a)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <p
                className="text-base font-bold mb-3"
                style={{ color: '#ffffff' }}
              >
                📬 Submit a Data Request
              </p>
              <form className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      className="mb-1 block text-xs font-semibold"
                      style={{ color: '#e5e7eb' }}
                    >
                      Request type
                    </label>
                    <select
                      className="w-full rounded-lg border-none bg-[#020617] px-3 py-2 text-xs"
                      style={{ color: '#e5e7eb' }}
                      defaultValue="access"
                    >
                      <option value="access">Access / Export</option>
                      <option value="delete">Delete</option>
                      <option value="correct">Correct</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs font-semibold"
                      style={{ color: '#e5e7eb' }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-lg border-none bg-[#020617] px-3 py-2 text-xs"
                      style={{ color: '#e5e7eb' }}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs font-semibold"
                    style={{ color: '#e5e7eb' }}
                  >
                    Details
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border-none bg-[#020617] px-3 py-2 text-xs"
                    style={{ color: '#e5e7eb' }}
                    placeholder="Describe your request..."
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    className="rounded-[12px] px-5 py-2 text-xs font-semibold text-white"
                    style={{
                      background:
                        'linear-gradient(135deg,#f97316,#ea580c)',
                    }}
                  >
                    Submit Request
                  </button>
                  <p
                    className="text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.50)' }}
                  >
                    Requests processed within 30 days as required by GDPR.
                  </p>
                </div>
              </form>
            </div>
          </section>

          {/* TIER 8 — Third party services */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                🌐 Third-Party Services
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                External services that may set cookies on Reaglex.
              </p>
            </div>
            <div
              className="space-y-2 rounded-[20px] p-4 sm:p-5"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {[
                {
                  name: 'Google Analytics',
                  color: '#3b82f6',
                  desc: 'Website analytics & performance',
                  badge: 'Analytics',
                  key: 'analytics' as const,
                  locked: false,
                  defaultOn: true,
                },
                {
                  name: 'Google Ads',
                  color: '#ef4444',
                  desc: 'Advertising & remarketing',
                  badge: 'Marketing',
                  key: 'marketing' as const,
                  locked: false,
                  defaultOn: false,
                },
                {
                  name: 'Facebook Pixel',
                  color: '#2563eb',
                  desc: 'Social advertising tracking',
                  badge: 'Marketing',
                  key: 'marketing' as const,
                  locked: false,
                  defaultOn: false,
                },
                {
                  name: 'Cloudflare',
                  color: '#f97316',
                  desc: 'Performance & security CDN',
                  badge: 'Performance',
                  key: 'performance' as const,
                  locked: true,
                  defaultOn: true,
                },
                {
                  name: 'Flutterwave',
                  color: '#a855f7',
                  desc: 'Payment processing',
                  badge: 'Essential',
                  key: 'essential' as const,
                  locked: true,
                  defaultOn: true,
                },
                {
                  name: 'WhatsApp Share',
                  color: '#22c55e',
                  desc: 'Social sharing button',
                  badge: 'Social',
                  key: 'social' as const,
                  locked: false,
                  defaultOn: false,
                },
              ].map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col gap-3 rounded-[14px] p-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        background: s.color,
                        color: '#ffffff',
                      }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div className="text-xs">
                      <p
                        className="font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {s.name}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {s.desc}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: 'rgba(148,163,184,0.18)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {s.badge}
                        </span>
                        <button
                          type="button"
                          className="text-[11px] font-semibold"
                          style={{ color: '#f97316' }}
                        >
                          Privacy Policy →
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px] sm:justify-end">
                    {s.locked ? (
                      <span style={{ color: 'var(--text-muted)' }}>Locked</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        Follows {s.badge.toLowerCase()} preference
                      </span>
                    )}
                    <CookieToggle
                      on={prefs[s.key]}
                      locked={s.locked}
                      onChange={(next) => updateCategory(s.key, next)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* TIER 9 — Cookie banner preview */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                👁️ Cookie Banner Preview
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                This is what new visitors see.
              </p>
            </div>
            <div
              className="rounded-[20px] p-6"
              style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
            >
              <div
                className="rounded-[12px] p-4"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: '#f97373' }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: '#facc15' }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: '#4ade80' }}
                    />
                  </div>
                  <div
                    className="rounded-full px-3 py-1 text-[11px]"
                    style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}
                  >
                    reaglex.com
                  </div>
                  <div className="w-10" />
                </div>
                <div className="flex justify-center pt-4">
                  <div
                    className="w-full max-w-xl rounded-[16px] px-5 py-4"
                    style={{
                      background: '#0c0f1a',
                      boxShadow: 'var(--shadow-xl)',
                    }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🍪</span>
                        <div className="text-xs">
                          <p
                            className="font-semibold"
                            style={{ color: '#ffffff' }}
                          >
                            We use cookies to improve your experience on Reaglex.
                          </p>
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-semibold"
                            style={{ color: '#fb923c' }}
                          >
                            Learn more →
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] mt-3 sm:mt-0">
                        <button
                          type="button"
                          className="rounded-[10px] px-3 py-1.5 font-semibold text-white"
                          style={{
                            background:
                              'linear-gradient(135deg,#059669,#047857)',
                          }}
                        >
                          Accept All
                        </button>
                        <button
                          type="button"
                          className="rounded-[10px] px-3 py-1.5 font-semibold"
                          style={{
                            background: 'transparent',
                            color: 'rgba(249,250,251,0.8)',
                            boxShadow: '0 0 0 1px rgba(148,163,184,0.4)',
                          }}
                        >
                          Reject All
                        </button>
                        <button
                          type="button"
                          className="rounded-[10px] px-3 py-1.5 font-semibold"
                          style={{
                            background: 'transparent',
                            color: '#f97316',
                            boxShadow: '0 0 0 1px rgba(249,115,22,0.6)',
                          }}
                        >
                          Customize
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 rounded-[12px] px-4 py-2 text-xs font-semibold"
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 0 0 1px var(--divider)',
                }}
              >
                Reset &amp; Preview Banner
              </button>
            </div>
          </section>

          {/* TIER 10 — Cookie FAQs */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              ❓ Cookie FAQs
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                [
                  'What happens if I disable all cookies?',
                  "The site will still work but some features will be limited. Your cart won't be saved, you'll need to log in each visit, and content won't be personalized to your interests.",
                ],
                [
                  'How do I delete existing cookies?',
                  "You can delete cookies through your browser settings. In Chrome: Settings → Privacy → Clear browsing data. You can also click 'Clear All My Cookies' button below.",
                ],
                [
                  'Do cookies contain personal info?',
                  'Essential cookies may contain your session ID but not personal details. Analytics cookies are fully anonymized. We never store passwords or payment info in cookies.',
                ],
                [
                  'How long are cookies stored?',
                  'It depends on the cookie type. Session cookies are deleted when you close your browser. Persistent cookies can last from 1 day to 2 years depending on purpose.',
                ],
                [
                  'Can I change my preferences later?',
                  'Yes! Return to this page anytime to update your preferences. Your new settings take effect immediately.',
                ],
                [
                  'Are cookies the same as tracking?',
                  'Not all cookies track you. Essential cookies just help the site work. Only analytics and marketing cookies involve behavioral tracking, and these are optional.',
                ],
                [
                  'Do you share cookie data with others?',
                  'We never sell cookie data. We share anonymized analytics data with Google Analytics only. Marketing cookies may share data with ad networks but only if you enable them.',
                ],
                [
                  'What about mobile app cookies?',
                  'Mobile apps use similar technology called device identifiers. Your preferences here apply to the web version. The mobile app has separate privacy settings in your account.',
                ],
              ].map(([q, a], idx) => (
                <FaqItem key={String(idx)} question={q as string} answer={a as string} />
              ))}
            </div>
          </section>

          {/* TIER 11 — Danger zone */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              ⚠️ Cookie Management
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <DangerCard
                icon="🗑️"
                color="#f59e0b"
                title="Clear All My Cookies"
                description="Removes all Reaglex cookies from your browser. You'll be logged out and preferences reset."
                buttonLabel="Clear Cookies"
                onClick={() => setPendingDangerAction('clear-cookies')}
              />
              <DangerCard
                icon="↺"
                color="#60a5fa"
                title="Reset to Default"
                description="Resets all cookie preferences to their default values. Essential ON, others as originally set."
                buttonLabel="Reset All"
                onClick={() => setPendingDangerAction('reset-prefs')}
              />
              <DangerCard
                icon="🚨"
                color="#f87171"
                title="Delete All My Data"
                description="Permanently deletes ALL data Reaglex holds about you including cookies, account data and history."
                buttonLabel="Delete Everything"
                onClick={() => setPendingDangerAction('delete-data')}
              />
            </div>
          </section>

          {/* TIER 12 — Bottom CTA */}
          <section className="space-y-4 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col gap-5 rounded-[24px] px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10"
              style={{
                background:
                  'linear-gradient(135deg,#1a0f3a 0%,#0d1f3a 50%,#111420 100%)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="mt-1 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                  style={{
                    background: 'linear-gradient(135deg,#f97316,#fb923c)',
                    boxShadow: '0 0 30px rgba(248,153,90,0.6)',
                  }}
                >
                  🔒
                </div>
                <div className="space-y-2 text-sm">
                  <p
                    className="text-lg font-bold"
                    style={{ color: '#ffffff' }}
                  >
                    Your Privacy Matters to Us
                  </p>
                  <p
                    className="text-[13px] sm:text-[15px]"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                  >
                    We&apos;re committed to being transparent about how we use your data. If
                    you have any questions, our privacy team is always available.
                  </p>
                  <p
                    className="pt-1 text-[12px]"
                    style={{ color: 'rgba(255,255,255,0.40)' }}
                  >
                    🔒 Reaglex is committed to GDPR compliance and data privacy.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm sm:items-end">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-[12px] px-4 py-2 text-xs font-semibold"
                    style={{
                      background: 'transparent',
                      color: '#f97316',
                      boxShadow: '0 0 0 1px rgba(249,115,22,0.7)',
                    }}
                  >
                    📧 Email Privacy Team
                  </button>
                  <Link
                    to="/privacy-policy"
                    className="rounded-[12px] px-4 py-2 text-xs font-semibold"
                    style={{
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.9)',
                      boxShadow: '0 0 0 1px rgba(148,163,184,0.7)',
                    }}
                  >
                    📋 Read Privacy Policy
                  </Link>
                  <button
                    type="button"
                    className="rounded-[12px] px-4 py-2 text-xs font-semibold text-white"
                    style={{
                      background:
                        'linear-gradient(135deg,#f97316,#ea580c)',
                    }}
                  >
                    💬 Chat With Us
                  </button>
                </div>
              </div>
            </motion.div>
          </section>
        </main>

        {/* Sticky save bar */}
        <AnimatePresence>
          {showStickyBar && hasUnsavedChanges && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 24 }}
              className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-3 sm:px-6"
            >
              <div
                className="flex w-full max-w-4xl flex-col items-start gap-3 rounded-t-[20px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
                }}
              >
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <span
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{ background: '#f97316' }}
                  />
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ● You have unsaved changes
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      {modifiedCount} categories modified
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="rounded-[12px] px-4 py-2 font-semibold"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      boxShadow: '0 0 0 1px var(--divider)',
                    }}
                  >
                    Discard Changes
                  </button>
                  <button
                    type="button"
                    onClick={persistPrefs}
                    disabled={saving}
                    className="rounded-[12px] px-4 py-2 font-semibold text-white"
                    style={{
                      background: saving
                        ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                        : 'linear-gradient(135deg,#f97316,#ea580c)',
                      boxShadow: '0 0 20px rgba(249,115,22,0.6)',
                    }}
                  >
                    {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save My Preferences →'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Danger confirmation modal */}
        <AnimatePresence>
          {pendingDangerAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] p-6"
                style={{ boxShadow: 'var(--shadow-xl)' }}
              >
                <p
                  className="text-lg font-bold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Are you sure?
                </p>
                <p
                  className="mb-4 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {pendingDangerAction === 'clear-cookies' &&
                    "This will clear Reaglex cookies from this browser. You'll be logged out and preferences reset."}
                  {pendingDangerAction === 'reset-prefs' &&
                    'This will reset all cookie preferences back to their default values.'}
                  {pendingDangerAction === 'delete-data' &&
                    'This is a critical action. In a real environment this would request deletion of all data associated with your account.'}
                </p>
                <div className="flex justify-end gap-2 text-sm">
                  <button
                    type="button"
                    className="rounded-[10px] px-4 py-2"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      boxShadow: '0 0 0 1px var(--divider)',
                    }}
                    onClick={() => setPendingDangerAction(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-[10px] px-4 py-2 text-white"
                    style={{
                      background:
                        pendingDangerAction === 'delete-data'
                          ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
                          : 'linear-gradient(135deg,#f97316,#ea580c)',
                    }}
                    onClick={() => setPendingDangerAction(null)}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BuyerLayout>
  );
}

type CategoryCardProps = {
  type: CategoryKey;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconGradient: string;
  cookiesCount: number;
  badges: { label: string; tone: 'neutral' | 'success' }[];
  cookies: [string, string, string, string][];
  value: boolean;
  locked?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange?: (next: boolean) => void;
  extraContent?: JSX.Element | null;
};

function CategoryCard({
  title,
  subtitle,
  description,
  icon,
  iconGradient,
  cookiesCount,
  badges,
  cookies,
  value,
  locked,
  expanded,
  onToggleExpand,
  onChange,
  extraContent,
}: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35 }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        boxShadow:
          'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-4 px-6 py-5 text-left"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-xl"
          style={{ background: iconGradient }}
        >
          <span className="text-white">{icon}</span>
        </div>
        <div className="flex-1">
          <p
            className="text-[16px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </p>
          <p
            className="text-[13px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {subtitle}
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span
            className="rounded-full px-3 py-1 text-[11px]"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            {cookiesCount} cookies
          </span>
          {badges.map((b) => (
            <span
              key={b.label}
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background:
                  b.tone === 'success'
                    ? 'rgba(52,211,153,0.12)'
                    : 'var(--bg-tertiary)',
                color: b.tone === 'success' ? '#34d399' : 'var(--text-muted)',
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1">
          <CookieToggle on={value} locked={locked} onChange={onChange} />
          {locked && (
            <span className="text-[11px]" style={{ color: '#34d399' }}>
              Required
            </span>
          )}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            className="mt-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            ˅
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 pb-5 text-sm">
              <div
                className="mb-3 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(148,163,184,0.7), transparent)',
                }}
              />
              <p
                className="mb-3 text-[14px]"
                style={{ color: 'var(--text-muted)' }}
              >
                {description}
              </p>
              {extraContent}
              <div className="mt-3 space-y-2 text-[12px]">
                {cookies.map(([name, purpose, duration, provider]) => (
                  <div
                    key={name}
                    className="grid gap-2 rounded-[10px] bg-[var(--bg-elevated)] px-3 py-2 sm:grid-cols-[1.2fr_1.6fr_1fr_1fr]"
                  >
                    <span
                      className="inline-flex items-center justify-start rounded-[6px] px-2 py-1 font-mono text-[11px]"
                      style={{
                        background: '#1a1e2c',
                        color: '#fb923c',
                      }}
                    >
                      {name}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {purpose}
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>{duration}</span>
                    <span style={{ color: 'var(--text-faint)' }}>{provider}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type FaqItemProps = { question: string; answer: string };

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: open ? 'var(--bg-secondary)' : 'var(--card-bg)',
        boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      }}
      className="cursor-pointer rounded-[14px]"
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {question}
        </p>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          ›
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-4 pb-3">
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}
              >
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type DangerCardProps = {
  icon: string;
  color: string;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
};

function DangerCard({
  icon,
  color,
  title,
  description,
  buttonLabel,
  onClick,
}: DangerCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-[16px] p-5"
      style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-xl"
        style={{ background: 'rgba(248,181,80,0.15)', color }}
      >
        {icon}
      </div>
      <p
        className="text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </p>
      <p
        className="mt-1 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-3 w-full rounded-[10px] px-3 py-2 text-xs font-semibold"
        style={{
          background: 'var(--bg-secondary)',
          color,
          boxShadow: `0 0 0 1px ${color}40`,
        }}
      >
        {buttonLabel}
      </button>
    </motion.div>
  );
}

export default CookieSettings;

