import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import BuyerLayout from '../buyer/BuyerLayout';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Distraction-free checkout shell: no storefront navbar, bottom nav, or footer.
 */
export default function CheckoutFocusLayout({
  children,
  backTo,
  onBack,
  backLabelKey = 'checkout.backToCart',
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <BuyerLayout focused>
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--divider)',
          boxShadow: '0 1px 0 color-mix(in srgb, var(--divider) 65%, transparent)',
        }}
      >
        <div
          className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 justify-self-start text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t(backLabelKey)}</span>
          </button>

          <Link to="/" className="justify-self-center" aria-label="Spacilly home">
            <img
              src="/logo.jpg"
              alt="Spacilly"
              className="h-9 w-9 rounded-full object-cover"
              style={{ boxShadow: 'var(--shadow-card)' }}
            />
          </Link>

          <div
            className="flex items-center justify-end gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--badge-success-text)' }}
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{t('checkout.secureCheckout')}</span>
          </div>
        </div>
      </header>
      {children}
    </BuyerLayout>
  );
}
