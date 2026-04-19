import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { paymentAPI } from '../services/api';

/**
 * Stripe Checkout success_url lands here with ?session_id=...
 * Server finalizes escrow via GET /api/payments/stripe/complete
 */
export default function StripeReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');

  const sessionId = searchParams.get('session_id') || '';

  useEffect(() => {
    if (!sessionId) {
      setMsg('Missing payment session. Return to checkout and try again.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const out = await paymentAPI.stripeComplete(sessionId);
        if (cancelled) return;
        if (out?.ok && out?.orderId) {
          navigate(`/order-confirmation/${encodeURIComponent(out.orderId)}`, { replace: true });
          return;
        }
        setMsg(out?.message || 'Payment could not be confirmed. Check your orders or contact support.');
      } catch (e) {
        if (!cancelled) {
          setMsg(e?.response?.data?.message || e?.message || 'Could not confirm Stripe payment.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  return (
    <BuyerLayout>
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        {!msg && sessionId ? (
          <>
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Confirming your payment…</p>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">{msg}</p>
            <Link to="/checkout" className="text-sm font-semibold text-orange-500 hover:underline">
              Back to checkout
            </Link>
          </>
        )}
      </div>
    </BuyerLayout>
  );
}
