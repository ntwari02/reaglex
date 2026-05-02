import { motion } from 'framer-motion';
import { MapPin, Truck, AlertCircle } from 'lucide-react';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useTranslation } from '../../i18n/useTranslation';

export default function CartSummary({
  subtotal,
  shippingTotal,
  tax,
  grand,
  quote,
  loading,
  error,
  shippingPreviewLocation,
  onChangeLocation,
  onCheckout,
}) {
  const { t } = useTranslation();
  const currencyPricing = useCurrencyPricing();
  const fmt = (n) => currencyPricing.formatLocalWithUsd(n);
  const isEstimate = quote?.isEstimate !== false;

  const freeThresholdHints = [];
  if (quote?.groups?.length) {
    for (const g of quote.groups) {
      for (const m of g.methods || []) {
        if (m.freeShippingThreshold != null && m.freeShippingThreshold > 0 && !m.freeShippingApplied) {
          freeThresholdHints.push({
            key: `${g.groupKey}-${m.key}`,
            label: g.warehouseLabel || g.groupKey,
            threshold: m.freeShippingThreshold,
          });
        }
      }
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-card)',
        }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {t('cart.shipToEstimate')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl text-xs outline-none border bg-[var(--card-bg)]"
            style={{ borderColor: 'var(--divider)' }}
            placeholder={t('checkout.fields.country')}
            value={shippingPreviewLocation.country}
            onChange={(e) => onChangeLocation({ ...shippingPreviewLocation, country: e.target.value })}
          />
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl text-xs outline-none border bg-[var(--card-bg)]"
            style={{ borderColor: 'var(--divider)' }}
            placeholder={t('checkout.fields.city')}
            value={shippingPreviewLocation.city}
            onChange={(e) => onChangeLocation({ ...shippingPreviewLocation, city: e.target.value })}
          />
        </div>
        <p className="text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {t('cart.shippingPreviewHint')}
        </p>
      </div>

      {loading && (
        <div className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          {t('cart.calculatingShipping')}
        </div>
      )}
      {error && !loading && (
        <div
          className="flex gap-2 rounded-xl p-3 text-xs items-start"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--text-secondary)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {quote?.groups?.length > 0 && !loading && (
        <div
          className="p-3 rounded-2xl space-y-2"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {isEstimate ? t('cart.estimatedShipping') : t('cart.shipping')}
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px]">
            {quote.groups.map((g) => {
              const std = (g.methods || []).find((m) => m.key === 'standard');
              const price = std?.freeShippingApplied ? 0 : Number(std?.price ?? 0);
              return (
                <li key={g.groupKey} className="flex justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="truncate">
                    {g.warehouseLabel}
                    {std?.freeShippingApplied ? ` · ${t('checkout.reaglexFree')}` : ''}
                  </span>
                  <span className="font-semibold shrink-0">{std?.freeShippingApplied ? t('checkout.reaglexFree') : fmt(price)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--divider)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('cart.shippingTotal')}</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {fmt(shippingTotal)}
            </span>
          </div>
          {(quote.warnings || []).length > 0 && (
            <p className="text-[10px] pt-1" style={{ color: 'var(--text-muted)' }}>
              {(quote.warnings || []).join(' ')}
            </p>
          )}
        </div>
      )}

      {freeThresholdHints.length > 0 && (
        <div className="text-[10px] space-y-1" style={{ color: 'var(--text-muted)' }}>
          {freeThresholdHints.slice(0, 3).map((h) => (
            <p key={h.key}>
              {h.label}: {t('cart.freeShippingOver')} {fmt(h.threshold)}.
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {[
          { label: t('cart.subtotal'), value: fmt(subtotal) },
          { label: t('cart.shipping'), value: loading ? '…' : fmt(shippingTotal) },
          { label: t('cart.tax'), value: fmt(tax) },
          { label: t('cart.estimatedTotal'), value: fmt(grand), bold: true },
        ].map(({ label, value, bold }) => (
          <div key={label} className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className="font-semibold" style={{ color: bold ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02, y: -2, boxShadow: 'var(--shadow-cta-hover)' }}
        whileTap={{ scale: 0.98 }}
        onClick={onCheckout}
        className="w-full py-4 text-sm font-bold tracking-widest uppercase rounded-2xl"
        style={{
          background: 'var(--gradient-brand-cta)',
          color: 'var(--text-on-accent)',
          letterSpacing: '0.12em',
          boxShadow: 'var(--shadow-cta)',
        }}
      >
        {t('checkout.title')}
      </motion.button>

      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        🔒 {t('cart.secureCheckout')}
      </p>
    </div>
  );
}
