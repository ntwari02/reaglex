import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useTranslation } from '../i18n/useTranslation';

const REASONS = [
  'Item not received', 'Wrong item delivered', 'Item damaged or defective',
  'Item not as described', 'Changed my mind', 'Duplicate order', 'Other',
];

const inp = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none border bg-[var(--card-bg)] placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition';
const inpStyle = { borderColor: '#e5e7eb' };

export default function Returns() {
  const { t } = useTranslation();
  const [sp] = useSearchParams();
  const prefillOrder = sp.get('order') || '';

  const [form, setForm] = useState({ orderId: prefillOrder, reason: '', description: '', evidence: [], refundMethod: 'original' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e) => {
    const files = [...e.target.files];
    setForm(f => ({ ...f, evidence: [...f.evidence, ...files].slice(0, 5) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason) return alert(t('returns.selectReasonError'));
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <BuyerLayout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 10px 32px rgba(34,197,94,0.35)' }}>
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-black mb-2" style={{ color: '#1a1a1a' }}>{t('returns.submittedTitle')}</h2>
        <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
          {t('returns.submittedMessage')}
        </p>
        <p className="text-xs font-bold px-4 py-1.5 rounded-full inline-block mb-6"
          style={{ background: '#fff7ed', color: '#ff8c42' }}>
          Case #RET-{Date.now().toString().slice(-6)}
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/account?tab=returns">
            <button className="w-full py-3 rounded-2xl text-white font-semibold"
              style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)' }}>
              {t('returns.viewStatus')}
            </button>
          </Link>
          <Link to="/">
            <button className="w-full py-3 rounded-2xl font-semibold"
              style={{ background: '#f3f4f6', color: '#374151' }}>
              {t('returns.continueShopping')}
            </button>
          </Link>
        </div>
      </div>
    </BuyerLayout>
  );

  return (
    <BuyerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-8">
        <div className="max-w-2xl">
        <Link to="/account?tab=returns">
          <motion.button whileHover={{ x: -3 }}
            className="flex items-center gap-2 mb-6 text-sm font-semibold" style={{ color: '#6b7280' }}>
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </motion.button>
        </Link>

        <h1 className="text-2xl font-black mb-2" style={{ color: '#1a1a1a' }}>{t('returns.requestTitle')}</h1>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
          {t('returns.requestSubtitle')}
        </p>

        {/* Buyer protection banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)' }}>
          <span className="text-2xl flex-shrink-0">🛡️</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#6c63ff' }}>{t('returns.buyerProtection')}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {t('returns.buyerProtectionNote')}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Order ID */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>{t('returns.orderId')}</label>
            <input type="text" value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
              placeholder={t('returns.orderIdPlaceholder')} className={inp} style={inpStyle} required />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>{t('returns.reason')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, reason: r }))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-medium transition text-left"
                  style={{
                    borderColor: form.reason === r ? '#ff8c42' : '#e5e7eb',
                    background: form.reason === r ? 'rgba(255,140,66,0.07)' : 'white',
                    color: form.reason === r ? '#ff8c42' : '#374151',
                  }}>
                  {form.reason === r && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>{t('returns.describeIssue')}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('returns.describePlaceholder')}
              rows={4} className={inp} style={{ ...inpStyle, resize: 'none' }} />
          </div>

          {/* Evidence upload */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
              {t('returns.uploadEvidence')} <span style={{ color: '#9ca3af', fontWeight: 400 }}>{t('returns.uploadEvidenceHint')}</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition hover:border-orange-400"
              style={{ borderColor: '#e5e7eb' }}>
              <Upload className="w-6 h-6" style={{ color: '#9ca3af' }} />
              <span className="text-xs" style={{ color: '#9ca3af' }}>{t('returns.clickUpload')}</span>
              <input type="file" accept="image/*,video/*" multiple onChange={handleFile} className="hidden" />
            </label>
            {form.evidence.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {form.evidence.map((f, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: '#f3f4f6', color: '#374151' }}>📎 {f.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Refund method */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>{t('returns.refundMethod')}</label>
            <div className="flex gap-3">
              {[['original', t('returns.originalPaymentMethod')], ['wallet', t('returns.reaglexWallet')]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, refundMethod: v }))}
                  className="flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition"
                  style={{
                    borderColor: form.refundMethod === v ? '#ff8c42' : '#e5e7eb',
                    background: form.refundMethod === v ? 'rgba(255,140,66,0.07)' : 'white',
                    color: form.refundMethod === v ? '#ff8c42' : '#374151',
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
            <p className="text-xs" style={{ color: '#92400e' }}>
              {t('returns.warning')}
            </p>
          </div>

          <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 8px 24px rgba(255,140,66,0.35)' }}>
            {submitting ? t('returns.submitting') : t('returns.submitRequest')}
          </motion.button>
        </form>
        </div>
      </div>
    </BuyerLayout>
  );
}
