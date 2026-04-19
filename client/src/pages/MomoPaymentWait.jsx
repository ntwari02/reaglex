import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Smartphone, CheckCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { paymentAPI } from '../services/api';
import { useTranslation } from '../i18n/useTranslation';

const POLL_MS = 3500;
const MAX_MS = 3 * 60 * 1000;

function isTerminalMomoFailure(status) {
  const u = String(status || '').toUpperCase();
  return ['FAILED', 'REJECTED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u);
}

function isTerminalAirtelFailure(status) {
  const u = String(status || '').toUpperCase();
  return ['FAILED', 'FAILURE', 'TF', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u);
}

export default function MomoPaymentWait() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referenceId = searchParams.get('ref') || '';
  const orderId = searchParams.get('orderId') || '';
  const provider = (searchParams.get('provider') || 'momo').toLowerCase();
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const started = useRef(0);

  useEffect(() => {
    if (!referenceId || !orderId) {
      setStatus('error');
      setMessage(t('checkout.momoWait.missingParams'));
      return;
    }
    started.current = Date.now();
    let cancelled = false;
    let timer;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - started.current > MAX_MS) {
        setStatus('timeout');
        setMessage(t('checkout.momoWait.timeout'));
        return;
      }
      try {
        const res =
          provider === 'airtel'
            ? await paymentAPI.getAirtelStatus(referenceId)
            : await paymentAPI.getMomoStatus(referenceId);
        if (cancelled) return;
        if (res?.success) {
          navigate(`/order-confirmation/${encodeURIComponent(orderId)}`, { replace: true });
          return;
        }
        if (provider === 'airtel') {
          if (res?.failed === true || isTerminalAirtelFailure(res?.airtelStatus)) {
            setStatus('failed');
            setMessage(t('checkout.airtelWait.failed'));
            return;
          }
          setMessage(
            String(res?.airtelStatus || '').toUpperCase() === 'PENDING'
              ? t('checkout.airtelWait.pending')
              : `${t('checkout.momoWait.status')}: ${res?.airtelStatus || '—'}`
          );
        } else {
          if (res?.failed === true || isTerminalMomoFailure(res?.momoStatus)) {
            setStatus('failed');
            setMessage(t('checkout.momoWait.failed'));
            return;
          }
          setMessage(
            res?.momoStatus === 'PENDING'
              ? t('checkout.momoWait.pending')
              : `${t('checkout.momoWait.status')}: ${res?.momoStatus || '—'}`
          );
        }
      } catch (e) {
        if (!cancelled) setMessage(e?.response?.data?.message || e?.message || t('checkout.momoWait.pollError'));
      }
      timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [referenceId, orderId, navigate, t, provider]);

  return (
    <BuyerLayout>
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12">
        <Link
          to="/account"
          className="mb-8 flex items-center gap-2 self-start text-sm font-semibold text-gray-500 hover:text-orange-500"
        >
          <ArrowLeft className="h-4 w-4" /> {t('checkout.backToCart')}
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-gray-100 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
        >
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg,#ffcd00,#ffc400)' }}
          >
            <Smartphone className="h-8 w-8 text-gray-900" />
          </div>
          <h1 className="mb-2 text-center text-xl font-black text-gray-900 dark:text-white">
            {provider === 'airtel' ? t('checkout.airtelWait.title') : t('checkout.momoWait.title')}
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {provider === 'airtel' ? t('checkout.airtelWait.subtitle') : t('checkout.momoWait.subtitle')}
          </p>
          <div className="mb-6 rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
            <p className="font-mono break-all">
              <span className="font-semibold text-gray-800 dark:text-gray-200">Ref</span> {referenceId}
            </p>
          </div>
          {status === 'success' ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">{message}</span>
            </div>
          ) : status === 'timeout' ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">{message}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/30"
              >
                <RefreshCw className="h-4 w-4" /> {t('checkout.momoWait.retry')}
              </button>
            </div>
          ) : status === 'failed' ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/30"
              >
                {t('checkout.momoWait.backCheckout')}
              </Link>
            </div>
          ) : status === 'error' ? (
            <p className="text-center text-sm text-red-600">{message}</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">{message || t('checkout.momoWait.waiting')}</p>
            </div>
          )}
        </motion.div>
      </div>
    </BuyerLayout>
  );
}
