import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { PageSeo } from '../components/seo/PageSeo';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import { buildLocaleAlternates } from '../utils/localeAlternateLinks';

const TOPIC_PILLS = [
  { id: 'order', label: '📦 Order Issue' },
  { id: 'payment', label: '💳 Payment' },
  { id: 'return', label: '↩ Return' },
  { id: 'escrow', label: '🛡️ Escrow' },
  { id: 'account', label: '👤 Account' },
  { id: 'seller', label: '🏪 Seller' },
  { id: 'other', label: '💡 Other' },
];

const PRIORITY_OPTIONS = [
  { id: 'normal', label: '🟢 Normal', tint: 'rgba(34,197,94,0.12)', color: '#16a34a' },
  { id: 'high', label: '🟡 High', tint: 'rgba(234,179,8,0.12)', color: '#eab308' },
  { id: 'urgent', label: '🔴 Urgent', tint: 'rgba(239,68,68,0.12)', color: '#ef4444' },
];

const FAQ_ITEMS = [
  {
    id: 'reply-time',
    question: 'How long until I get a reply?',
    answer:
      'Email: within 24 hours. Live chat: under 2 minutes. Phone: immediate during office hours.',
  },
  {
    id: 'what-to-include',
    question: 'What info should I include?',
    answer:
      'Your order ID, account email, and a clear description of the issue. Screenshots help speed up resolution.',
  },
  {
    id: 'track-ticket',
    question: 'Can I track my support ticket?',
    answer:
      "Yes! You\'ll receive an email with your ticket number. Reply to that email to add more information.",
  },
];

const MAX_MESSAGE_CHARS = 1000;

function validateField(name, value) {
  const trimmed = typeof value === 'string' ? value.trim() : value;

  if (name === 'firstName') {
    if (!trimmed) return 'First name is required';
  }
  if (name === 'lastName') {
    if (!trimmed) return 'Last name is required';
  }
  if (name === 'email') {
    if (!trimmed) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email';
  }
  if (name === 'subject') {
    if (!trimmed) return 'Subject is required';
  }
  if (name === 'message') {
    if (!trimmed) return 'Message is required';
    if (trimmed.length > MAX_MESSAGE_CHARS) return 'Message is too long';
  }

  return '';
}

function generateTicketId() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `#TKT-0${n}`;
}

function computeReplyTimeLabel() {
  const now = new Date();
  const hours = now.getHours();
  if (hours < 18) {
    return 'Today 6PM';
  }
  return 'Tomorrow 10AM';
}

export default function Contact() {
  const origin = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';
  const canonicalUrl = origin ? `${origin}/contact` : '/contact';
  const contactHreflangAlternates = origin ? buildLocaleAlternates(origin, '/contact') : undefined;
  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Spacilly',
    url: canonicalUrl,
    description:
      'Reach Spacilly support for order, payment, escrow, return, and seller inquiries — typical email response within 24 hours.',
    ...(origin
      ? {
          isPartOf: { '@id': `${origin}/#website` },
          mainEntity: { '@id': `${origin}/#organization` },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Contact', item: canonicalUrl },
            ],
          },
        }
      : {}),
  };
  const [topic, setTopic] = useState('order');
  const [priority, setPriority] = useState('normal');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    orderId: '',
    subject: '',
    message: '',
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState(generateTicketId);

  const todayKey = useMemo(() => {
    const d = new Date().getDay();
    if (d === 0) return 'sun';
    if (d === 6) return 'sat';
    return 'mon-fri';
  }, []);

  const handleChange = (field, value) => {
    if (field === 'message') {
      const limited = value.slice(0, MAX_MESSAGE_CHARS);
      setForm((prev) => ({ ...prev, [field]: limited }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
    setActiveField((prev) => (prev === field ? null : prev));
  };

  const handleFocus = (field) => {
    setActiveField(field);
  };

  const fieldStatus = (field) => {
    if (!touched[field]) return 'idle';
    if (errors[field]) return 'invalid';
    const v = form[field];
    const hasValue = typeof v === 'string' ? v.trim().length > 0 : !!v;
    return hasValue ? 'valid' : 'idle';
  };

  const fieldRingStyle = (field) => {
    const status = fieldStatus(field);

    if (status === 'invalid') {
      return {
        boxShadow: '0 0 0 2px rgba(239,68,68,0.35)',
      };
    }
    if (status === 'valid') {
      return {
        boxShadow: '0 0 0 2px rgba(16,185,129,0.35)',
      };
    }
    if (activeField === field) {
      return {
        boxShadow: '0 0 0 2.5px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
      };
    }
    return {
      boxShadow: '0 0 0 1.5px var(--input-ring)',
    };
  };

  const messageCounterColor = () => {
    const len = form.message.length;
    if (len >= 950) return '#ef4444';
    if (len >= 800) return 'var(--brand-primary)';
    return 'var(--text-faint)';
  };

  const handleFiles = (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;
    const merged = [...files, ...list].slice(0, 3);
    const tooBig = merged.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      setFileError('One or more files exceed 5MB. Please remove large files.');
      return;
    }
    setFileError('');
    setFiles(merged);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const nextTouched = {
      firstName: true,
      lastName: true,
      email: true,
      subject: true,
      message: true,
    };
    setTouched((prev) => ({ ...prev, ...nextTouched }));

    const nextErrors = {};
    ['firstName', 'lastName', 'email', 'subject', 'message'].forEach((field) => {
      const err = validateField(field, form[field]);
      if (err) nextErrors[field] = err;
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      setTicketId(generateTicketId());
    }, 900);
  };

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      orderId: '',
      subject: '',
      message: '',
    });
    setTouched({});
    setErrors({});
    setFiles([]);
    setFileError('');
    setPriority('normal');
    setTopic('order');
    setSuccess(false);
    setTicketId(generateTicketId());
  };

  const replyTimeLabel = useMemo(() => computeReplyTimeLabel(), []);

  const schedule = [
    { key: 'mon-fri', label: 'Mon – Fri', hours: '8:00 AM — 8:00 PM', status: 'Open' },
    { key: 'sat', label: 'Saturday', hours: '9:00 AM — 5:00 PM', status: 'Open' },
    { key: 'sun', label: 'Sunday', hours: 'Closed', status: 'Closed' },
  ];

  return (
    <BuyerLayout>
      <PageSeo
        title="Contact Spacilly — buyer & seller support"
        description="Reach Spacilly for order, payment, escrow, return, and seller inquiries. Typical email reply within 24 hours; live chat in under 2 minutes."
        canonicalUrl={canonicalUrl}
        ogImage={origin ? `${origin}/logo.jpg` : undefined}
        ogType="website"
        hreflangAlternates={contactHreflangAlternates}
        jsonLd={contactJsonLd}
      />
      <div className="contact-page">
        {/* HERO */}
        <motion.section
          className="contact-hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="contact-hero-overlay">
            <div className="auth-blob auth-blob--orange contact-blob contact-blob-1" />
            <div className="auth-blob auth-blob--purple contact-blob contact-blob-2" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center">
              <span className="contact-pill-hero">
                📞 We&apos;re here to help
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight" style={{ color: 'var(--hero-marketing-heading)' }}>
                <span>Get in Touch </span>
                <span className="block md:inline text-[18px] md:text-[22px] font-normal md:mx-2" style={{ color: 'var(--hero-marketing-subtitle)' }}>
                  with
                </span>
                <span className="contact-hero-gradient">
                  Our Support Team
                </span>
              </h1>
              <p className="text-base md:text-lg" style={{ color: 'var(--hero-marketing-subtitle)' }}>
                We typically respond within 2 hours. Available 24/7 for urgent issues.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {['⚡ 2hr Email Response', '💬 2min Live Chat', '📞 24/7 Support'].map((label) => (
                <div key={label} className="contact-response-pill">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* CONTACT CARDS ROW */}
        <section className="relative z-10 -mt-10 md:-mt-12 px-4 sm:px-6 lg:px-10">
          <div className="w-full grid gap-5 md:grid-cols-3 items-stretch">
            {/* Live Chat */}
            <motion.div
              className="contact-card"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-lg)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              whileHover={{ y: -4 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className="contact-card-icon-circle"
                  style={{
                    background: 'var(--badge-success-bg)',
                    border: '1px solid var(--badge-success-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <MessageCircle className="w-8 h-8" style={{ color: 'var(--badge-success-text)' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Live Chat
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Chat with our support team in real time
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-in-stock)' }}>
                  <span className="contact-status-dot" />
                  Online Now
                </div>
                <motion.button
                  type="button"
                  whileHover={{ y: -2, boxShadow: 'var(--shadow-cta)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-2 text-sm font-semibold"
                  style={{
                    borderRadius: 12,
                    padding: '12px 24px',
                    border: 'none',
                    color: 'var(--text-on-accent)',
                    background: 'var(--gradient-brand-cta)',
                    boxShadow: 'var(--shadow-cta)',
                  }}
                  onClick={() => window.dispatchEvent(new Event('spacilly:assistant:open'))}
                >
                  Start Chatting →
                </motion.button>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Average wait: 2 minutes
                </p>
              </div>
            </motion.div>

            {/* Email Support (featured — same surface family, subtle brand ring) */}
            <motion.div
              className="contact-card contact-card-featured"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--brand-border-subtle)',
                boxShadow: 'var(--shadow-xl)',
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              whileHover={{ y: -4 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className="contact-card-icon-circle"
                  style={{
                    background: 'var(--brand-tint-strong)',
                    border: '1px solid var(--brand-border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <Mail className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Email Support
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Send us a detailed message and we&apos;ll get back to you
                </p>
                <button
                  type="button"
                  className="text-sm font-semibold"
                  style={{
                    color: 'var(--link-color)',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                  }}
                  onClick={() => {
                    window.location.href = 'mailto:reaglerobust2020@gmail.com';
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--link-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--link-color)';
                  }}
                >
                  reaglerobust2020@gmail.com
                </button>
                <motion.button
                  type="button"
                  whileHover={{ y: -2, boxShadow: 'var(--shadow-cta-hover)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-2 text-sm font-semibold"
                  style={{
                    borderRadius: 12,
                    padding: '12px 24px',
                    border: 'none',
                    color: 'var(--text-on-accent)',
                    background: 'var(--gradient-brand-cta)',
                    boxShadow: 'var(--shadow-cta)',
                  }}
                  onClick={() => {
                    window.location.href = 'mailto:reaglerobust2020@gmail.com';
                  }}
                >
                  Send Email →
                </motion.button>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Reply within 24 hours
                </p>
              </div>
            </motion.div>

            {/* WhatsApp / Phone */}
            <motion.div
              className="contact-card"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-lg)',
              }}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              whileHover={{ y: -4 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className="contact-card-icon-circle"
                  style={{
                    background: 'var(--badge-info-bg)',
                    border: '1px solid var(--badge-info-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <Phone className="w-8 h-8" style={{ color: 'var(--badge-info-text)' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  WhatsApp / Phone
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Call or message us directly for urgent support
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  +250787057751
                </p>
                <motion.button
                  type="button"
                  whileHover={{ y: -2, boxShadow: 'var(--shadow-cta-hover)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-2 text-sm font-semibold"
                  style={{
                    borderRadius: 12,
                    padding: '12px 24px',
                    border: '1px solid var(--btn-secondary-border)',
                    color: 'var(--btn-secondary-text)',
                    background: 'var(--btn-secondary-bg)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onClick={() => {
                    window.open('https://wa.me/250787057751', '_blank');
                  }}
                >
                  Open WhatsApp →
                </motion.button>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Available 24/7
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <main className="w-full px-4 sm:px-6 lg:px-10 py-12 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,3.2fr)_minmax(0,2.2fr)] items-start">
            {/* LEFT: FORM / SUCCESS */}
            <AnimatePresence mode="wait">
              {!success && (
                <motion.section
                  key="contact-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="rounded-[24px]"
                  style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04)',
                    padding: 36,
                  }}
                >
                  <header className="mb-6 space-y-1">
                    <h2
                      className="text-xl md:text-2xl font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      ✉️ Send us a Message
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Fill out the form and we&apos;ll respond within 24 hours.
                    </p>
                  </header>

                  {/* Topic selector */}
                  <div className="mb-6 space-y-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      What&apos;s this about?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TOPIC_PILLS.map((pill) => {
                        const selected = topic === pill.id;
                        return (
                          <motion.button
                            key={pill.id}
                            type="button"
                            whileHover={{ y: -1, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setTopic(pill.id)}
                            className="text-xs md:text-[13px] font-medium"
                            style={{
                              borderRadius: 999,
                              padding: '8px 16px',
                              border: 'none',
                              background: selected
                                ? 'var(--brand-tint)'
                                : 'var(--bg-secondary)',
                              color: selected
                                ? 'var(--brand-primary)'
                                : 'var(--text-muted)',
                              boxShadow: selected
                                ? '0 0 0 2px color-mix(in srgb, var(--brand-primary) 40%, transparent)'
                                : '0 0 0 1.5px var(--divider)',
                            }}
                          >
                            {pill.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name row */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {['firstName', 'lastName'].map((field) => (
                        <div key={field} className="space-y-1">
                          <label
                            className="text-xs font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {field === 'firstName' ? 'First Name *' : 'Last Name *'}
                          </label>
                          <div
                            className="flex items-center rounded-[12px]"
                            style={{
                              background: 'var(--bg-secondary)',
                              height: 50,
                              paddingInline: 16,
                              ...fieldRingStyle(field),
                            }}
                          >
                            <input
                              type="text"
                              value={form[field]}
                              onChange={(e) => handleChange(field, e.target.value)}
                              onBlur={() => handleBlur(field)}
                              onFocus={() => handleFocus(field)}
                              placeholder={field === 'firstName' ? 'First name' : 'Last name'}
                              className="flex-1 bg-transparent text-sm outline-none"
                              style={{
                                color: 'var(--text-primary)',
                                caretColor: 'var(--brand-primary)',
                              }}
                            />
                            {fieldStatus(field) === 'valid' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                            {fieldStatus(field) === 'invalid' && (
                              <XCircle className="w-4 h-4 text-rose-500" />
                            )}
                          </div>
                          {errors[field] && (
                            <motion.p
                              className="text-xs"
                              style={{ color: '#f87171' }}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {errors[field]}
                            </motion.p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Email + Phone */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Email */}
                      <div className="space-y-1">
                        <label
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Email Address *
                        </label>
                        <div
                          className="flex items-center gap-2 rounded-[12px]"
                          style={{
                            background: 'var(--bg-secondary)',
                            height: 50,
                            paddingInline: 16,
                            ...fieldRingStyle('email'),
                          }}
                        >
                          <span className="text-base" style={{ color: 'var(--text-faint)' }}>
                            ✉️
                          </span>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            onBlur={() => handleBlur('email')}
                            onFocus={() => handleFocus('email')}
                            placeholder="your@email.com"
                            className="flex-1 bg-transparent text-sm outline-none"
                            style={{
                              color: 'var(--text-primary)',
                              caretColor: 'var(--brand-primary)',
                            }}
                          />
                          {fieldStatus('email') === 'valid' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          {fieldStatus('email') === 'invalid' && (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                        {errors.email && (
                          <motion.p
                            className="text-xs"
                            style={{ color: '#f87171' }}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {errors.email}
                          </motion.p>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Phone Number
                        </label>
                        <div
                          className="flex items-center gap-2 rounded-[12px]"
                          style={{
                            background: 'var(--bg-secondary)',
                            height: 50,
                            paddingInline: 16,
                            boxShadow: '0 0 0 1.5px var(--input-ring)',
                          }}
                        >
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{
                              borderRadius: 999,
                              padding: '4px 8px',
                              border: 'none',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            🇷🇼 +250
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="Phone number"
                            className="flex-1 bg-transparent text-sm outline-none"
                            style={{
                              color: 'var(--text-primary)',
                              caretColor: 'var(--brand-primary)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Order ID */}
                    <div className="space-y-1">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Order ID (Optional)
                      </label>
                      <div
                        className="flex items-center gap-2 rounded-[12px]"
                        style={{
                          background: 'var(--bg-secondary)',
                          height: 50,
                          paddingInline: 16,
                          boxShadow: '0 0 0 1.5px var(--input-ring)',
                        }}
                      >
                        <span className="text-base" style={{ color: 'var(--text-faint)' }}>
                          📦
                        </span>
                        <input
                          type="text"
                          value={form.orderId}
                          onChange={(e) => handleChange('orderId', e.target.value)}
                          placeholder="ORD-0000 (if related to order)"
                          className="flex-1 bg-transparent text-sm outline-none"
                          style={{
                            color: 'var(--text-primary)',
                            caretColor: 'var(--brand-primary)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Subject *
                      </label>
                      <div
                        className="flex items-center rounded-[12px]"
                        style={{
                          background: 'var(--bg-secondary)',
                          height: 50,
                          paddingInline: 16,
                          ...fieldRingStyle('subject'),
                        }}
                      >
                        <input
                          type="text"
                          value={form.subject}
                          onChange={(e) => handleChange('subject', e.target.value)}
                          onBlur={() => handleBlur('subject')}
                          onFocus={() => handleFocus('subject')}
                          placeholder="Brief description of your issue"
                          className="flex-1 bg-transparent text-sm outline-none"
                          style={{
                            color: 'var(--text-primary)',
                            caretColor: 'var(--brand-primary)',
                          }}
                        />
                        {fieldStatus('subject') === 'valid' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {fieldStatus('subject') === 'invalid' && (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                      {errors.subject && (
                        <motion.p
                          className="text-xs"
                          style={{ color: '#f87171' }}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {errors.subject}
                        </motion.p>
                      )}
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Message *
                      </label>
                      <div
                        className="rounded-[16px] relative"
                        style={{
                          background: 'var(--bg-secondary)',
                          padding: 12,
                          ...fieldRingStyle('message'),
                        }}
                      >
                        <textarea
                          value={form.message}
                          onChange={(e) => handleChange('message', e.target.value)}
                          onBlur={() => handleBlur('message')}
                          onFocus={() => handleFocus('message')}
                          placeholder="Please describe your issue in detail. Include any relevant information..."
                          rows={5}
                          className="w-full bg-transparent text-sm outline-none resize-y"
                          style={{
                            minHeight: 140,
                            color: 'var(--text-primary)',
                            caretColor: 'var(--brand-primary)',
                          }}
                        />
                        <div className="flex justify-end mt-1">
                          <span
                            className="text-xs"
                            style={{ color: messageCounterColor() }}
                          >
                            {form.message.length} / {MAX_MESSAGE_CHARS}
                          </span>
                        </div>
                      </div>
                      {errors.message && (
                        <motion.p
                          className="text-xs"
                          style={{ color: '#f87171' }}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {errors.message}
                        </motion.p>
                      )}
                    </div>

                    {/* Priority selector */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Priority level:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {PRIORITY_OPTIONS.map((opt) => {
                          const selected = priority === opt.id;
                          return (
                            <motion.button
                              key={opt.id}
                              type="button"
                              whileHover={{ y: -1, scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setPriority(opt.id)}
                              className="text-xs font-medium"
                              style={{
                                borderRadius: 999,
                                padding: '8px 16px',
                                border: 'none',
                                background: selected ? opt.tint : 'var(--bg-secondary)',
                                color: selected ? opt.color : 'var(--text-muted)',
                                boxShadow: selected
                                  ? `0 0 0 2px ${opt.tint}`
                                  : '0 0 0 1.5px var(--divider)',
                              }}
                            >
                              {opt.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* File attachment */}
                    <div className="space-y-2">
                      <div
                        className="contact-dropzone"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={handleDrop}
                        onClick={() => {
                          const input = document.getElementById('contact-attachments-input');
                          if (input) input.click();
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          borderColor: fileError ? 'var(--brand-primary)' : 'var(--divider)',
                        }}
                      >
                        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                          📎 Attach screenshots (optional)
                        </p>
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                          Max 3 files, 5MB each. Drag &amp; drop or click to browse.
                        </p>
                      </div>
                      <input
                        id="contact-attachments-input"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files || [])}
                      />
                      {fileError && (
                        <p className="text-xs" style={{ color: 'var(--brand-primary)' }}>
                          {fileError}
                        </p>
                      )}
                      {files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {files.map((file) => (
                            <div
                              key={file.name + file.size}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                              style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span>
                                {file.name}{' '}
                                <span style={{ color: 'var(--text-faint)' }}>
                                  ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFiles((prev) =>
                                    prev.filter((f) => f.name !== file.name || f.size !== file.size),
                                  )
                                }
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--text-faint)',
                                  cursor: 'pointer',
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit + privacy */}
                    <div className="space-y-3 pt-1">
                      <motion.button
                        type="submit"
                        whileHover={!submitting ? { y: -2, boxShadow: '0 8px 28px color-mix(in srgb, var(--brand-primary) 55%, transparent)' } : {}}
                        whileTap={!submitting ? { scale: 0.98 } : {}}
                        disabled={submitting}
                        className="w-full font-bold text-base flex items-center justify-center gap-2"
                        style={{
                          height: 54,
                          borderRadius: 14,
                          border: 'none',
                          color: '#ffffff',
                          cursor: submitting ? 'default' : 'pointer',
                          background: submitting
                            ? 'var(--gradient-brand-cta)'
                            : 'var(--gradient-brand-cta)',
                          boxShadow: '0 6px 24px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
                        }}
                      >
                        {submitting && (
                          <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                        )}
                        {submitting ? 'Sending...' : 'Send Message →'}
                      </motion.button>
                      <p
                        className="text-[12px] text-center"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        🔒 Your information is secure and will never be shared with third parties
                      </p>
                    </div>
                  </form>
                </motion.section>
              )}

              {success && (
                <motion.section
                  key="contact-success"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="rounded-[24px] flex flex-col items-center text-center"
                  style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-md)',
                    padding: '60px 40px',
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="flex items-center justify-center mb-5"
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#059669,#047857)',
                        boxShadow: '0 0 0 0 rgba(16,185,129,0.5)',
                      }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                  <h2
                    className="text-2xl md:text-[26px] font-bold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Message Sent! 🎉
                  </h2>
                  <p
                    className="text-sm md:text-[15px] mb-4 max-w-md"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Thanks {form.firstName || 'there'}! We&apos;ve received your message and will
                    respond to {form.email || 'your email'} within 24 hours.
                  </p>
                  <div
                    className="mb-5 text-sm font-semibold"
                    style={{
                      borderRadius: 10,
                      padding: '10px 20px',
                      background: 'var(--brand-tint)',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    {ticketId}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mb-4">
                    <motion.button
                      type="button"
                      whileHover={{ y: -2, boxShadow: '0 8px 24px color-mix(in srgb, var(--brand-primary) 55%, transparent)' }}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 text-sm font-semibold rounded-full text-white"
                      style={{
                        border: 'none',
                        background: 'var(--gradient-brand-cta)',
                      }}
                    >
                      Track Ticket
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 text-sm font-semibold rounded-full"
                      style={{
                        border: 'none',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                      onClick={resetForm}
                    >
                      Send Another
                    </motion.button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ⏱ Expected reply by: {replyTimeLabel}
                  </p>
                </motion.section>
              )}
            </AnimatePresence>

            {/* RIGHT: INFO & FAQ */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-4"
            >
              {/* Contact info card */}
              <section
                className="rounded-[20px] space-y-4"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                  padding: 28,
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Contact Information
                </h3>

                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--accent-marketing-gradient)',
                      }}
                    >
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        reaglerobust2020@gmail.com
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        General inquiries
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#22c55e,#15803d)',
                      }}
                    >
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        +250787057751
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Mon–Fri 8AM–8PM
                      </p>
                    </div>
                  </div>

                  {/* Live chat */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--gradient-brand-cta)',
                      }}
                    >
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Available 24/7
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        2 minute average response
                      </p>
                    </div>
                  </div>

                  {/* Office */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                      }}
                    >
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Kigali, Rwanda
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        KG 123 St, Nyarugenge
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="my-3"
                  style={{
                    height: 1,
                    background:
                      'linear-gradient(to right, transparent, rgba(148,163,184,0.4), transparent)',
                  }}
                />

                {/* Social row */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Follow us:
                  </p>
                  <div className="flex items-center gap-2">
                    {[Twitter, Facebook, Instagram, Linkedin].map((Icon, idx) => {
                      const brandColors = ['#1da1f2', '#1877f2', '#e1306c', '#0a66c2'];
                      const brand = brandColors[idx];
                      return (
                        <motion.button
                          // eslint-disable-next-line react/no-array-index-key
                          key={idx}
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          className="flex items-center justify-center"
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'var(--bg-secondary)',
                            boxShadow: 'var(--shadow-xs)',
                            color: 'var(--text-muted)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.background = brand;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Office hours */}
              <section
                className="rounded-[20px] space-y-3"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: 24,
                  marginTop: 16,
                }}
              >
                <h3
                  className="text-base font-bold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  🕐 Office Hours
                </h3>
                <div className="space-y-2">
                  {schedule.map((row) => {
                    const isToday = row.key === todayKey;
                    const isClosed = row.status === 'Closed';
                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between gap-3 text-sm"
                        style={{
                          padding: '8px 10px',
                          borderRadius: 12,
                          boxShadow: isToday ? 'inset 4px 0 0 var(--brand-primary)' : 'none',
                          background: isToday ? 'var(--brand-tint)' : 'transparent',
                          color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span>{row.label}</span>
                          {isToday && (
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: 'var(--brand-primary)',
                                color: 'var(--text-on-accent)',
                              }}
                            >
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs md:text-[13px]">{row.hours}</span>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: isClosed ? 'var(--badge-error-bg)' : 'var(--badge-success-bg)',
                              color: isClosed ? 'var(--badge-error-text)' : 'var(--badge-success-text)',
                            }}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-faint)' }}>
                  All times in CAT (UTC+2)
                </p>
              </section>

              {/* FAQ quick card */}
              <section
                className="rounded-[20px]"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: 24,
                  marginTop: 16,
                }}
              >
                <h3
                  className="text-base font-bold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ❓ Quick Answers
                </h3>
                <div className="space-y-2">
                  <FAQList items={FAQ_ITEMS} />
                </div>
              </section>
            </motion.aside>
          </div>

          {/* MAP SECTION */}
          <section className="mt-12 md:mt-16 space-y-4">
            <h3
              className="text-xl md:text-[22px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              📍 Find Our Office
            </h3>

            <div
              className="rounded-[20px] overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-md)',
                height: 300,
              }}
            >
              <div className="contact-map-inner">
                <div className="contact-map-grid" />
                <div className="contact-map-pin">
                  <div className="contact-map-pin-pulse" />
                  <div className="contact-map-pin-icon">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="contact-map-label">
                  Kigali, Rwanda
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
              {[
                '🏢 Kigali, Rwanda',
                '🕐 Mon-Sat: 8AM-8PM',
                '📞 +250787057751',
              ].map((label) => (
                <div
                  key={label}
                  className="text-xs md:text-sm"
                  style={{
                    borderRadius: 999,
                    padding: '8px 16px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Contact-specific styles */}
      <style>{`
        .contact-hero {
          position: relative;
          width: 100%;
          padding: 80px 40px;
          background: var(--hero-marketing-bg);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .contact-hero {
            padding: 40px 20px;
          }
        }
        .contact-hero-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .contact-blob {
          opacity: 0.9;
          filter: blur(80px);
        }
        .contact-blob-1 {
          width: 260px;
          height: 260px;
          top: -40px;
          left: -60px;
          animation: auth-float-12 16s ease-in-out infinite;
        }
        .contact-blob-2 {
          width: 260px;
          height: 260px;
          bottom: -60px;
          right: -40px;
          animation: auth-float-10 13s ease-in-out infinite;
        }
        .contact-pill-hero {
          background: var(--badge-info-bg);
          color: var(--badge-info-text);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
        }
        .contact-hero-gradient {
          background: var(--hero-marketing-line2-gradient);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .contact-response-pill {
          background: var(--hero-marketing-chip-bg);
          color: var(--hero-marketing-chip-text);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 13px;
          backdrop-filter: blur(10px);
        }
        .contact-card {
          border-radius: 20px;
          padding: 28px;
          border: 1px solid var(--border-card);
        }
        .contact-card-featured {
          padding: 32px;
        }
        .contact-card-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .contact-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--text-in-stock);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--text-in-stock) 45%, transparent);
          animation: helpchat-status 2s ease-out infinite;
        }
        .contact-dropzone {
          border-radius: 16px;
          border: 2px dashed var(--divider);
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .contact-dropzone:hover {
          border-color: var(--brand-primary);
          background: var(--brand-tint);
        }
        .contact-map-inner {
          position: relative;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            circle at 10% 0%,
            var(--bg-tertiary) 0%,
            var(--bg-page) 55%
          );
          overflow: hidden;
        }
        .contact-map-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, color-mix(in srgb, var(--divider-strong) 55%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--divider-strong) 55%, transparent) 1px, transparent 1px);
          background-size: 32px 32px;
          opacity: 0.85;
        }
        .contact-map-pin {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .contact-map-pin-pulse {
          position: absolute;
          inset: -12px;
          border-radius: 999px;
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-primary) 55%, transparent);
          animation: helpchat-pulse 2.3s ease-out infinite;
        }
        .contact-map-pin-icon {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-brand-cta);
        }
        .contact-map-label {
          position: absolute;
          bottom: 22%;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--card-bg);
          color: var(--text-primary);
          font-size: 13px;
          border: 1px solid var(--divider);
          box-shadow: var(--shadow-md);
        }
        @media (max-width: 768px) {
          .contact-map-inner {
            height: 200px;
          }
        }
      `}</style>
    </BuyerLayout>
  );
}

function FAQList({ items }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-1">
      {items.map((faq) => {
        const open = openId === faq.id;
        return (
          <motion.div
            key={faq.id}
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            className="rounded-[12px]"
            style={{
              background: 'transparent',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : faq.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              <span className="text-[14px] font-semibold">{faq.question}</span>
              <motion.span
                animate={{ rotate: open ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="px-3 pb-3">
                    <p
                      className="text-[13px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

