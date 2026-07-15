import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { paymentAPI } from '../services/api';

/**
 * Flutterwave redirect_url lands here with ?transaction_id=...&order_id=...
 * Server finalizes escrow via GET /api/payments/verify
 */
export default function PaymentVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');

  const transactionId = searchParams.get('transaction_id') || searchParams.get('tx_ref') || '';
  const orderId = searchParams.get('order_id') || '';

  useEffect(() => {
    if (!transactionId || !orderId) {
      setMsg('Missing payment details. Return to checkout and try again.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const out = await paymentAPI.verify(transactionId, orderId);
        if (cancelled) return;
        if (out?.success) {
          const unpaidRaw = sessionStorage.getItem('spacilly_unpaid_order_ids');
          if (unpaidRaw) {
            try {
              const rest = JSON.parse(unpaidRaw);
              if (Array.isArray(rest) && rest.length) {
                sessionStorage.setItem('spacilly_unpaid_order_ids', JSON.stringify(rest));
              } else {
                sessionStorage.removeItem('spacilly_unpaid_order_ids');
              }
            } catch {
              sessionStorage.removeItem('spacilly_unpaid_order_ids');
            }
          }
          navigate(`/order-confirmation/${encodeURIComponent(orderId)}`, { replace: true });
          return;
        }
        setMsg('Payment could not be confirmed. Check your orders or contact support.');
      } catch (e) {
        if (!cancelled) {
          setMsg(e?.response?.data?.message || e?.message || 'Could not confirm payment.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactionId, orderId, navigate]);

  return (
    <BuyerLayout>
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        {!msg && transactionId && orderId ? (
          <>
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--brand-primary)]" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Confirming your payment…</p>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">{msg}</p>
            <Link to="/checkout" className="text-sm font-semibold text-[var(--brand-primary)] hover:underline">
              Back to checkout
            </Link>
          </>
        )}
      </div>
    </BuyerLayout>
  );
}
