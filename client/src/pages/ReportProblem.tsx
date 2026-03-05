import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useAuthStore } from '../stores/authStore';

type ReportCategory =
  | 'order'
  | 'payment'
  | 'seller'
  | 'counterfeit'
  | 'harassment'
  | 'security'
  | 'shipping'
  | 'reviews'
  | 'bug';

type Severity = 'low' | 'medium' | 'high';
type Status = 'open' | 'under_review' | 'resolved' | 'closed';

interface ReportSummary {
  id: string;
  category: ReportCategory;
  title: string;
  related?: string;
  status: Status;
  date: string;
  preview: string;
}

const CATEGORY_META: Record<ReportCategory, { label: string; desc: string; icon: string }> =
  {
    order: {
      label: 'Order Problem',
      desc: 'Issues with your order, delivery or items',
      icon: '🛒',
    },
    payment: {
      label: 'Payment Issue',
      desc: 'Payment failed, double charge, billing errors',
      icon: '💳',
    },
    seller: {
      label: 'Seller Misconduct',
      desc: 'Fake products, scam seller, fraud or deception',
      icon: '🏪',
    },
    counterfeit: {
      label: 'Counterfeit Product',
      desc: 'Fake branded goods, copyright violations',
      icon: '🚫',
    },
    harassment: {
      label: 'Harassment / Abuse',
      desc: 'Threatening messages, inappropriate behavior',
      icon: '💬',
    },
    security: {
      label: 'Account & Security',
      desc: 'Hacked account, unauthorized access, identity theft',
      icon: '🔒',
    },
    shipping: {
      label: 'Shipping Problem',
      desc: 'Lost package, wrong address, damaged in transit',
      icon: '📦',
    },
    reviews: {
      label: 'Fake Reviews',
      desc: 'Suspicious or incentivized reviews on products',
      icon: '⭐',
    },
    bug: {
      label: 'Technical Bug',
      desc: 'App errors, broken features, website issues',
      icon: '🔧',
    },
  };

const MOCK_REPORTS: ReportSummary[] = [
  {
    id: 'RPT-00847',
    category: 'seller',
    title: 'Seller sent a different used phone instead of new one',
    related: 'ORD-1002',
    status: 'under_review',
    date: 'Feb 28, 2026',
    preview: 'Received a used device with scratches while listing said new.',
  },
  {
    id: 'RPT-00810',
    category: 'payment',
    title: 'Charged twice for the same order',
    related: 'TXN-9921',
    status: 'open',
    date: 'Feb 25, 2026',
    preview: 'My card was billed two times when checkout failed the first time.',
  },
  {
    id: 'RPT-00796',
    category: 'bug',
    title: 'Unable to apply discount code on mobile',
    related: undefined,
    status: 'resolved',
    date: 'Feb 18, 2026',
    preview: 'Promo code field shows error even for valid codes on Android app.',
  },
];

const statusLabel: Record<Status, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  closed: 'Closed',
};

const ReportProblem = () => {
  const [heroReady, setHeroReady] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [whenDate, setWhenDate] = useState('');
  const [whenTime, setWhenTime] = useState('');
  const [notSureWhen, setNotSureWhen] = useState(false);
  const [ongoing, setOngoing] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | Status>('all');
  const [activeReport, setActiveReport] = useState<ReportSummary | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const { user } = useAuthStore();
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const navigate = useNavigate();
  const params = useParams<{ ticketId?: string }>();

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // open side panel from route
  useEffect(() => {
    if (!params.ticketId) return;
    const found = MOCK_REPORTS.find((r) => r.id === params.ticketId);
    if (found) {
      setActiveReport(found);
      setPanelOpen(true);
    }
  }, [params.ticketId]);

  const descriptionLength = description.length;
  const descriptionColor =
    descriptionLength >= 1900
      ? '#ef4444'
      : descriptionLength >= 1600
      ? '#f97316'
      : 'var(--text-faint)';

  const canNextFromStep1 =
    !!category && !!severity && description.trim().length > 0;

  const evidenceCount = files.length + urls.length;

  const canSubmit = !!category && !!severity && description.trim() && contactEmail.trim();

  const filteredReports = useMemo(() => {
    if (filter === 'all') return MOCK_REPORTS;
    return MOCK_REPORTS.filter((r) => r.status === filter);
  }, [filter]);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming].slice(0, 10));
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    const id = `RPT-${Math.floor(10000 + Math.random() * 89999)}`;
    setTicketId(id);
    setSubmitting(false);
  };

  const openPanel = (report: ReportSummary) => {
    setActiveReport(report);
    setPanelOpen(true);
    navigate(`/report-problem/${report.id}`, { replace: false });
  };

  const closePanel = () => {
    setPanelOpen(false);
    navigate('/report-problem', { replace: true });
  };

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
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              initial={{ opacity: 0.7, y: -20 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -top-32 -left-32 rounded-full"
              style={{
                width: 260,
                height: 260,
                background: 'rgba(239,68,68,0.16)',
                filter: 'blur(90px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.6, y: 10 }}
              animate={{ opacity: 0.9, y: -10 }}
              transition={{ duration: 1.8, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -bottom-40 -right-24 rounded-full"
              style={{
                width: 280,
                height: 280,
                background: 'rgba(249,115,22,0.16)',
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
                background: 'rgba(124,58,237,0.20)',
                filter: 'blur(80px)',
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroReady ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-4xl text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center">
              <span
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  borderRadius: 999,
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                🚨 Report Center
              </span>
            </div>

            <div className="space-y-3">
              <h1
                className="font-extrabold leading-tight"
                style={{ color: '#ffffff', fontSize: 48 }}
              >
                Report a Problem
              </h1>
              <p
                className="font-extrabold leading-tight"
                style={{
                  fontSize: 24,
                  background:
                    'linear-gradient(135deg,#f97316,#fb923c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                We Take Every Report Seriously
              </p>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: 'rgba(255,255,255,0.60)', fontSize: 16 }}
              >
                Help us keep Reaglex safe and fair for everyone. Reports are
                reviewed within 24 hours.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[13px]">
              {['🔒 Confidential', '⚡ 24hr Response', '🛡️ Action Guaranteed'].map(
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

        {/* STATS ROW */}
        <section className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.08, delayChildren: 0.05 },
              },
            }}
            className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                title: '98%',
                label: 'Resolution rate',
                sub: 'Last 30 days',
                color: '#34d399',
              },
              {
                title: '< 24hrs',
                label: 'Average response',
                sub: 'Business hours',
                color: '#f97316',
              },
              {
                title: '1,247',
                label: 'Reports handled',
                sub: 'This month',
                color: '#60a5fa',
              },
              {
                title: '99.2%',
                label: 'Platform safety',
                sub: 'Verified sellers',
                color: '#a78bfa',
              },
            ].map((card) => (
              <motion.div
                key={card.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4 }}
                className="rounded-[20px] text-center"
                style={{
                  background: 'var(--card-bg)',
                  padding: 24,
                  boxShadow:
                    'var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <p
                  className="text-3xl font-extrabold"
                  style={{ color: card.color }}
                >
                  {card.title}
                </p>
                <p className="mt-1 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  {card.label}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                  {card.sub}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* BODY */}
        <main className="w-full px-4 pt-12 pb-16 sm:px-6 lg:px-10 space-y-12">
          {/* Category selector */}
          <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  className="text-xl md:text-[22px] font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  What would you like to report?
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Select the category that best describes your problem.
                </p>
              </div>
              <Link
                to="/help"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: '#f97316' }}
              >
                View help center
              </Link>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.05 },
                },
              }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {(Object.keys(CATEGORY_META) as ReportCategory[]).map((key) => {
                const meta = CATEGORY_META[key];
                const selected = category === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setCategory(key);
                      setStep(1);
                    }}
                    className="text-left"
                    style={{ border: 'none', background: 'transparent' }}
                  >
                    <div
                      className="h-full rounded-[20px] p-6 text-center"
                      style={{
                        background: selected ? 'var(--brand-tint)' : 'var(--card-bg)',
                        boxShadow: selected
                          ? '0 0 0 2px #f97316, var(--shadow-md)'
                          : 'var(--shadow-sm)',
                      }}
                    >
                      <div
                        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                        style={{
                          background: 'rgba(249,115,22,0.16)',
                          color: '#ffffff',
                        }}
                      >
                        {meta.icon}
                      </div>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: selected ? 'var(--brand-primary)' : 'var(--text-primary)',
                        }}
                      >
                        {meta.label}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {meta.desc}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </section>

          {/* Form + success */}
          {ticketId ? (
            <section className="space-y-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mx-auto max-w-3xl rounded-[24px] p-10 text-center"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg,#059669,#047857)',
                    boxShadow: '0 0 0 0 rgba(16,185,129,0.45)',
                  }}
                >
                  <span className="text-4xl text-white">✓</span>
                </motion.div>
                <h2
                  className="mb-2 text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Report Submitted! 🎉
                </h2>
                <p
                  className="mx-auto mb-5 max-w-md text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Thank you{user?.full_name ? `, ${user.full_name}` : ''}. We&apos;ve
                  received your report and our safety team will review it within 24
                  hours.
                </p>
                <div
                  className="mx-auto mb-6 rounded-[16px] px-6 py-4 text-left"
                  style={{
                    maxWidth: 420,
                    background: 'var(--brand-tint)',
                    boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.30)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    🎫 Ticket Number
                  </p>
                  <p
                    className="mt-1 text-[22px] font-extrabold"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    #{ticketId}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    📧 Confirmation sent to:{' '}
                    <span className="font-semibold">
                      {contactEmail || user?.email || 'your email'}
                    </span>
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    className="w-full rounded-[14px] px-6 py-3 text-sm font-bold sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg,#f97316,#ea580c)',
                      color: '#ffffff',
                      boxShadow: '0 10px 28px rgba(249,115,22,0.50)',
                    }}
                  >
                    Track My Report →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketId(null);
                      setStep(1);
                      setDescription('');
                      setFiles([]);
                      setUrls([]);
                      setSeverity(null);
                      setCategory(null);
                    }}
                    className="w-full rounded-[14px] px-6 py-3 text-sm font-semibold sm:w-auto"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      boxShadow: '0 0 0 1px rgba(148,163,184,0.5)',
                    }}
                  >
                    Report Another Problem
                  </button>
                </div>
              </motion.div>
            </section>
          ) : (
            <section className="space-y-8">
              {/* Form card */}
              {category && (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                  className="mx-auto max-w-5xl rounded-[24px] p-8"
                  style={{
                    background: 'var(--card-bg)',
                    boxShadow:
                      'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Header */}
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                        style={{
                          background: 'var(--brand-tint)',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        {CATEGORY_META[category].icon} Reporting:{' '}
                        {CATEGORY_META[category].label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(null);
                        setStep(1);
                      }}
                      className="text-xs font-semibold"
                      style={{ color: '#f97316' }}
                    >
                      Change category
                    </button>
                  </div>

                  {/* Progress */}
                  <div className="mb-6 flex items-center justify-between gap-3">
                    {['Details', 'Evidence', 'Review'].map((label, idx) => {
                      const index = idx + 1;
                      const current = step === index;
                      const completed = step > index;
                      return (
                        <div key={label} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center gap-1">
                            <motion.div
                              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                              animate={{ scale: current ? [1, 1.05, 1] : 1 }}
                              transition={{
                                duration: current ? 0.6 : 0.2,
                                repeat: current ? Infinity : 0,
                                repeatType: 'mirror',
                              }}
                              style={{
                                background: completed || current ? '#f97316' : 'var(--bg-secondary)',
                                color: completed || current ? '#ffffff' : 'var(--text-muted)',
                              }}
                            >
                              {index}
                            </motion.div>
                            <span
                              className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                              style={{
                                color: current ? 'var(--text-primary)' : 'var(--text-muted)',
                              }}
                            >
                              {label}
                            </span>
                          </div>
                          {index < 3 && (
                            <div className="ml-2 h-0.5 flex-1 rounded-full bg-[var(--divider)]" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step content */}
                  <AnimatePresence mode="wait" initial={false}>
                    {step === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-6"
                      >
                        {/* Severity */}
                        <div className="space-y-2">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            How urgent is this?
                          </p>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              {
                                key: 'low',
                                label: '🟢 Low — Minor inconvenience',
                                color: '#22c55e',
                              },
                              {
                                key: 'medium',
                                label: '🟡 Medium — Significant issue',
                                color: '#eab308',
                              },
                              {
                                key: 'high',
                                label: '🔴 High — Fraud or safety risk',
                                color: '#ef4444',
                              },
                            ].map((opt) => {
                              const selected = severity === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setSeverity(opt.key as Severity)}
                                  className="text-left"
                                  style={{ border: 'none', background: 'transparent' }}
                                >
                                  <div
                                    className="rounded-[14px] px-4 py-3 text-sm"
                                    style={{
                                      background: 'var(--bg-secondary)',
                                      boxShadow: selected
                                        ? `0 0 0 1.5px ${opt.color}`
                                        : '0 0 0 1px var(--divider)',
                                      color: 'var(--text-secondary)',
                                    }}
                                  >
                                    {opt.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Describe the problem in detail *
                          </p>
                          <div
                            className="rounded-[14px]"
                            style={{
                              background: 'var(--bg-secondary)',
                              boxShadow: '0 0 0 1px var(--input-ring)',
                            }}
                          >
                            <textarea
                              value={description}
                              onChange={(e) =>
                                setDescription(e.target.value.slice(0, 2000))
                              }
                              rows={6}
                              placeholder={
                                'Please include:\n- What happened\n- When it happened\n- How it affected you\n- Any relevant details...'
                              }
                              className="w-full resize-y bg-transparent p-4 text-sm outline-none"
                              style={{
                                minHeight: 160,
                                color: 'var(--text-primary)',
                              }}
                            />
                            <div className="flex justify-end pb-2 pr-3">
                              <span className="text-xs" style={{ color: descriptionColor }}>
                                {descriptionLength} / 2000
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Date & ongoing */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              When did this happen?
                            </p>
                            {!notSureWhen && (
                              <div className="flex gap-3">
                                <input
                                  type="date"
                                  value={whenDate}
                                  onChange={(e) => setWhenDate(e.target.value)}
                                  className="flex-1 rounded-[12px] border-none bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none"
                                  style={{
                                    boxShadow: '0 0 0 1px var(--input-ring)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                                <input
                                  type="time"
                                  value={whenTime}
                                  onChange={(e) => setWhenTime(e.target.value)}
                                  className="w-32 rounded-[12px] border-none bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none"
                                  style={{
                                    boxShadow: '0 0 0 1px var(--input-ring)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                              </div>
                            )}
                            <label className="mt-1 flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={notSureWhen}
                                onChange={(e) => setNotSureWhen(e.target.checked)}
                              />
                              <span style={{ color: 'var(--text-muted)' }}>I&apos;m not sure</span>
                            </label>
                          </div>
                          <div className="space-y-2">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              Is this still happening?
                            </p>
                            <button
                              type="button"
                              onClick={() => setOngoing((v) => !v)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                              style={{
                                background: ongoing ? '#f97316' : 'var(--bg-secondary)',
                                color: ongoing ? '#ffffff' : 'var(--text-secondary)',
                              }}
                            >
                              <span
                                className="relative inline-flex h-4 w-7 items-center rounded-full"
                                style={{
                                  background: ongoing ? '#facc15' : '#9ca3af',
                                }}
                              >
                                <span
                                  className="absolute h-3 w-3 rounded-full bg-white transition-all"
                                  style={{ left: ongoing ? 14 : 2 }}
                                />
                              </span>
                              Yes, this is still happening
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            disabled={!canNextFromStep1}
                            onClick={() => canNextFromStep1 && setStep(2)}
                            className="w-full rounded-[14px] px-5 py-3 text-sm font-bold sm:w-auto"
                            style={{
                              background: canNextFromStep1
                                ? 'linear-gradient(135deg,#f97316,#ea580c)'
                                : 'var(--bg-secondary)',
                              color: canNextFromStep1 ? '#ffffff' : 'var(--text-muted)',
                            }}
                          >
                            Next: Add Evidence →
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-6"
                      >
                        <div className="space-y-3">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Evidence (optional but recommended)
                          </p>
                          <label
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOver(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setDragOver(false);
                            }}
                            onDrop={handleDrop}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-6 py-10 text-center"
                            style={{
                              borderColor: dragOver ? '#f97316' : 'var(--divider)',
                              background: dragOver ? 'var(--brand-tint)' : 'var(--bg-secondary)',
                              transition: 'all 0.2s ease',
                              transform: dragOver ? 'scale(1.01)' : 'scale(1)',
                            }}
                          >
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleFiles(e.target.files)}
                            />
                            <div
                              className="mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                              style={{
                                background: 'rgba(249,115,22,0.12)',
                                color: '#f97316',
                              }}
                            >
                              📎
                            </div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Drag &amp; drop files here
                            </p>
                            <p
                              className="text-sm"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              or click to browse
                            </p>
                            <p
                              className="mt-1 text-[12px]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Screenshots, videos, documents
                            </p>
                            <p
                              className="text-[12px]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Max 10 files · 20MB each
                            </p>
                            <p
                              className="mt-1 text-[11px]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Supported: JPG, PNG, MP4, PDF, DOC
                            </p>
                          </label>
                        </div>

                        {files.length > 0 && (
                          <div className="space-y-2">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              Uploaded files
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {files.map((file, idx) => (
                                <motion.div
                                  key={`${file.name}-${idx}`}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="flex items-center gap-3 rounded-[12px] px-3 py-2 text-xs"
                                  style={{
                                    background: 'var(--bg-secondary)',
                                    boxShadow: 'var(--shadow-xs)',
                                  }}
                                >
                                  <div
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                                    style={{ background: 'rgba(148,163,184,0.18)' }}
                                  >
                                    {file.type.startsWith('image/')
                                      ? '🖼️'
                                      : file.type.startsWith('video/')
                                      ? '🎞️'
                                      : '📄'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate" style={{ color: 'var(--text-secondary)' }}>
                                      {file.name}
                                    </p>
                                    <p
                                      className="text-[11px]"
                                      style={{ color: 'var(--text-faint)' }}
                                    >
                                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFiles((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="rounded-full p-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    ✕
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* URL evidence */}
                        <div className="space-y-2">
                          <p
                            className="text-xs font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Or add a URL link to evidence
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <div
                              className="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-2 text-sm"
                              style={{
                                background: 'var(--bg-secondary)',
                                boxShadow: '0 0 0 1px var(--input-ring)',
                              }}
                            >
                              <span>🔗</span>
                              <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-transparent outline-none"
                                style={{ color: 'var(--text-primary)' }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = urlInput.trim();
                                if (!trimmed) return;
                                setUrls((prev) => [...prev, trimmed]);
                                setUrlInput('');
                              }}
                              className="rounded-[12px] px-4 py-2 text-sm font-semibold"
                              style={{
                                background: 'linear-gradient(135deg,#f97316,#ea580c)',
                                color: '#ffffff',
                              }}
                            >
                              + Add URL
                            </button>
                          </div>

                          {urls.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {urls.map((u) => (
                                <span
                                  key={u}
                                  className="inline-flex items-center gap-2 rounded-full px-3 py-1"
                                  style={{ background: 'var(--bg-secondary)' }}
                                >
                                  <span
                                    className="max-w-[200px] truncate"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {u}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setUrls((prev) => prev.filter((x) => x !== u))
                                    }
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Info box */}
                        <div
                          className="rounded-[16px] p-4 text-sm"
                          style={{
                            background: '#060f22',
                            boxShadow: 'inset 0 0 0 1px rgba(96,165,250,0.25)',
                            color: '#60a5fa',
                          }}
                        >
                          <p className="mb-1 font-semibold">💡 Good evidence includes:</p>
                          <ul className="ml-4 list-disc space-y-1 text-xs">
                            <li>Screenshots of conversations</li>
                            <li>Order confirmation emails</li>
                            <li>Product photos (if damaged/fake)</li>
                            <li>Payment receipts</li>
                            <li>Video recordings</li>
                          </ul>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full rounded-[14px] px-5 py-3 text-sm font-semibold sm:w-auto"
                            style={{
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="w-full rounded-[14px] px-5 py-3 text-sm font-bold sm:w-auto"
                            style={{
                              background: 'linear-gradient(135deg,#f97316,#ea580c)',
                              color: '#ffffff',
                            }}
                          >
                            Next: Review →
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-6"
                      >
                        <div
                          className="space-y-3 rounded-[20px] p-5"
                          style={{
                            background: 'var(--bg-secondary)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.12em]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Category
                            </p>
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold"
                              style={{
                                background: 'var(--brand-tint)',
                                color: 'var(--brand-primary)',
                              }}
                            >
                              {CATEGORY_META[category].icon}{' '}
                              {CATEGORY_META[category].label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.12em]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Severity
                            </p>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {severity ? severity.toUpperCase() : '--'}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className="mt-1 text-xs font-semibold uppercase tracking-[0.12em]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Description
                            </p>
                            <p
                              className="flex-1 text-sm"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {description || '--'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.12em]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Evidence
                            </p>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {evidenceCount} item{evidenceCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.12em]"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              Ongoing
                            </p>
                            <span
                              className="text-xs font-semibold"
                              style={{
                                color: ongoing ? '#f97316' : 'var(--text-secondary)',
                              }}
                            >
                              {ongoing ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              Contact email
                            </p>
                            <input
                              type="email"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="w-full rounded-[12px] border-none bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none"
                              style={{
                                boxShadow: '0 0 0 1px var(--input-ring)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full rounded-[14px] px-5 py-3 text-sm font-semibold sm:w-auto"
                            style={{
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            disabled={!canSubmit || submitting}
                            onClick={handleSubmit}
                            className="w-full rounded-[14px] px-5 py-3 text-sm font-bold sm:w-auto"
                            style={{
                              background: canSubmit
                                ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                                : 'var(--bg-secondary)',
                              color: canSubmit ? '#ffffff' : 'var(--text-muted)',
                              boxShadow: canSubmit
                                ? '0 6px 24px rgba(239,68,68,0.40)'
                                : 'none',
                            }}
                          >
                            {submitting ? 'Submitting...' : '🚨 Submit Report'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* My reports */}
              {user && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3
                      className="text-lg font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      📋 My Previous Reports
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { k: 'all', label: 'All' },
                      { k: 'open', label: 'Open' },
                      { k: 'under_review', label: 'Under Review' },
                      { k: 'resolved', label: 'Resolved' },
                      { k: 'closed', label: 'Closed' },
                    ].map((t) => (
                      <button
                        key={t.k}
                        type="button"
                        onClick={() => setFilter(t.k as typeof filter)}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          background:
                            filter === t.k ? 'var(--brand-tint)' : 'transparent',
                          color:
                            filter === t.k
                              ? 'var(--brand-primary)'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {filteredReports.length === 0 ? (
                    <div
                      className="mt-3 flex flex-col items-center gap-2 rounded-[16px] p-8 text-center text-sm"
                      style={{
                        background: 'var(--card-bg)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div className="mb-2 text-3xl">🛡️</div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        No reports yet
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Help keep Reaglex safe by reporting any problems you find.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredReports.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => openPanel(r)}
                          className="flex w-full flex-col gap-2 rounded-[16px] p-4 text-left text-sm"
                          style={{
                            background: 'var(--card-bg)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                                style={{
                                  background: 'rgba(249,115,22,0.15)',
                                }}
                              >
                                {CATEGORY_META[r.category].icon}
                              </div>
                              <div>
                                <p
                                  className="text-xs font-semibold"
                                  style={{ color: '#f97316' }}
                                >
                                  #{r.id}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {CATEGORY_META[r.category].label}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                style={{
                                  background:
                                    r.status === 'open'
                                      ? '#dbeafe'
                                      : r.status === 'under_review'
                                      ? '#fef3c7'
                                      : r.status === 'resolved'
                                      ? '#dcfce7'
                                      : '#e5e7eb',
                                  color:
                                    r.status === 'open'
                                      ? '#1d4ed8'
                                      : r.status === 'under_review'
                                      ? '#b45309'
                                      : r.status === 'resolved'
                                      ? '#15803d'
                                      : '#4b5563',
                                }}
                              >
                                {statusLabel[r.status]}
                              </span>
                              <p
                                className="mt-1 text-[11px]"
                                style={{ color: 'var(--text-faint)' }}
                              >
                                {r.date}
                              </p>
                            </div>
                          </div>
                          <p
                            className="line-clamp-2 text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {r.preview}
                          </p>
                          {r.related && (
                            <p className="text-xs" style={{ color: '#f97316' }}>
                              Related: {r.related}
                            </p>
                          )}
                          <span
                            className="text-xs font-semibold"
                            style={{ color: '#f97316' }}
                          >
                            View Details →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Safety tips + emergency banner could be added here */}
            </section>
          )}
        </main>

        {/* Side panel basic skeleton */}
        <AnimatePresence>
          {panelOpen && activeReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={closePanel}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--card-bg)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[var(--divider)] px-5 py-4">
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      #{activeReport.id}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {CATEGORY_META[activeReport.category].label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4 px-5 py-4 text-sm">
                  <p
                    className="font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {activeReport.title}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {activeReport.preview}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    Submitted: {activeReport.date}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BuyerLayout>
  );
};

export default ReportProblem;

