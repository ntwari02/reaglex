import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { BadgePercent, Truck, ShieldCheck, Save, Loader2 } from 'lucide-react';

type MetadataResponse = {
  productId: string;
  product: {
    id: string;
    _id: string;
    name: string;
    sku: string;
    couponCode?: string;
    campaignLabel?: string;
    offerEndsAt?: string | null;
    shippingInfo?: {
      costLabel?: string;
      estimatedDeliveryLabel?: string;
      freeShipping?: boolean;
    };
    returnPolicy?: {
      label?: string;
      details?: string;
    };
    securityNote?: string;
    paymentSafetyNote?: string;
    serviceCommitments?: Array<{ title?: string; description?: string; icon?: string }>;
    detailSections?: Array<{ title?: string; content?: string }>;
    sizeGuide?: {
      chartImageUrl?: string;
      circumferenceNote?: string;
      rows?: Array<{ sizeLabel?: string; circumferenceMm?: number }>;
    };
  };
};

function Card({
  title,
  helper,
  icon,
  children,
}: {
  title: string;
  helper: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl p-4 sm:p-6 space-y-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            {title}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {helper}
          </p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        {hint ? (
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Example: {hint}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

const inputBase =
  'w-full rounded-2xl px-4 py-3 text-sm min-h-[44px] outline-none transition-shadow';

/** Matches primary actions on other admin pages (e.g. Product Management, Compliance export). */
const adminPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 min-h-[44px] touch-manipulation disabled:pointer-events-none disabled:opacity-60';

export default function ProductMetadataEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qpProductId = searchParams.get('productId') || '';

  const [productId, setProductId] = useState(qpProductId);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<null | 'promo' | 'shipping' | 'policy' | 'details'>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');

  // Promotion
  const [couponCode, setCouponCode] = useState('');
  const [campaignLabel, setCampaignLabel] = useState('');
  const [offerEndsAtLocal, setOfferEndsAtLocal] = useState(''); // yyyy-mm-ddThh:mm

  // Shipping
  const [shippingCostLabel, setShippingCostLabel] = useState('');
  const [estimatedDeliveryLabel, setEstimatedDeliveryLabel] = useState('');
  const [freeShipping, setFreeShipping] = useState(false);

  // Policy / trust
  const [returnPolicyLabel, setReturnPolicyLabel] = useState('');
  const [returnPolicyDetails, setReturnPolicyDetails] = useState('');
  const [securityNote, setSecurityNote] = useState('');
  const [paymentSafetyNote, setPaymentSafetyNote] = useState('');
  const [sizeChartImageUrl, setSizeChartImageUrl] = useState('');
  const [circumferenceNote, setCircumferenceNote] = useState('');
  const [sizeRowsText, setSizeRowsText] = useState('');
  const [serviceCommitmentsText, setServiceCommitmentsText] = useState('');
  const [detailSectionsText, setDetailSectionsText] = useState('');

  const normalizedProductId = useMemo(() => productId.trim(), [productId]);

  const load = async (id: string) => {
    const pid = id.trim();
    if (!pid) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await api.get<MetadataResponse>(`/admin/products/${encodeURIComponent(pid)}/metadata`);
      const p = r.data?.product;
      setProductName(String(p?.name || ''));
      setProductSku(String(p?.sku || ''));
      setCouponCode(String(p?.couponCode || ''));
      setCampaignLabel(String(p?.campaignLabel || ''));

      const endsAt = p?.offerEndsAt ? new Date(p.offerEndsAt) : null;
      if (endsAt && !Number.isNaN(endsAt.getTime())) {
        // Convert to local datetime-local value
        const pad = (n: number) => String(n).padStart(2, '0');
        const v = `${endsAt.getFullYear()}-${pad(endsAt.getMonth() + 1)}-${pad(endsAt.getDate())}T${pad(
          endsAt.getHours()
        )}:${pad(endsAt.getMinutes())}`;
        setOfferEndsAtLocal(v);
      } else {
        setOfferEndsAtLocal('');
      }

      setShippingCostLabel(String(p?.shippingInfo?.costLabel || ''));
      setEstimatedDeliveryLabel(String(p?.shippingInfo?.estimatedDeliveryLabel || ''));
      setFreeShipping(!!p?.shippingInfo?.freeShipping);

      setReturnPolicyLabel(String(p?.returnPolicy?.label || ''));
      setReturnPolicyDetails(String(p?.returnPolicy?.details || ''));
      setSecurityNote(String(p?.securityNote || ''));
      setPaymentSafetyNote(String(p?.paymentSafetyNote || ''));
      setSizeChartImageUrl(String(p?.sizeGuide?.chartImageUrl || ''));
      setCircumferenceNote(String(p?.sizeGuide?.circumferenceNote || ''));
      setSizeRowsText(
        (Array.isArray(p?.sizeGuide?.rows) ? p.sizeGuide.rows : [])
          .map((r) => `${String(r?.sizeLabel || '')}|${r?.circumferenceMm ?? ''}`)
          .join('\n')
      );
      setServiceCommitmentsText(
        (Array.isArray(p?.serviceCommitments) ? p.serviceCommitments : [])
          .map((c) => `${String(c?.title || '')}|${String(c?.description || '')}`)
          .join('\n')
      );
      setDetailSectionsText(
        (Array.isArray(p?.detailSections) ? p.detailSections : [])
          .map((s) => `${String(s?.title || '')}|${String(s?.content || '')}`)
          .join('\n')
      );

      setOk('Loaded product metadata.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load metadata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qpProductId) void load(qpProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePromo = async () => {
    const pid = normalizedProductId;
    if (!pid) return;
    setSavingKey('promo');
    setError(null);
    setOk(null);
    try {
      await api.patch(`/admin/products/${encodeURIComponent(pid)}/metadata`, {
        couponCode,
        campaignLabel,
        offerEndsAt: offerEndsAtLocal ? new Date(offerEndsAtLocal).toISOString() : null,
      });
      setOk('Promotion details saved.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save promotion details.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveShipping = async () => {
    const pid = normalizedProductId;
    if (!pid) return;
    setSavingKey('shipping');
    setError(null);
    setOk(null);
    try {
      await api.patch(`/admin/products/${encodeURIComponent(pid)}/metadata`, {
        shippingInfo: {
          costLabel: shippingCostLabel,
          estimatedDeliveryLabel,
          freeShipping,
        },
      });
      setOk('Shipping details saved.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save shipping details.');
    } finally {
      setSavingKey(null);
    }
  };

  const savePolicy = async () => {
    const pid = normalizedProductId;
    if (!pid) return;
    setSavingKey('policy');
    setError(null);
    setOk(null);
    try {
      await api.patch(`/admin/products/${encodeURIComponent(pid)}/metadata`, {
        returnPolicy: {
          label: returnPolicyLabel,
          details: returnPolicyDetails,
        },
        securityNote,
        paymentSafetyNote,
      });
      setOk('Policy details saved.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save policy details.');
    } finally {
      setSavingKey(null);
    }
  };
  const saveDetails = async () => {
    const pid = normalizedProductId;
    if (!pid) return;
    setSavingKey('details');
    setError(null);
    setOk(null);
    const sizeGuideRows = sizeRowsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sizeLabel, circumferenceMm] = line.split('|');
        return {
          sizeLabel: (sizeLabel || '').trim(),
          circumferenceMm: circumferenceMm != null && circumferenceMm.trim() !== '' ? Number(circumferenceMm.trim()) : undefined,
        };
      });
    const serviceCommitments = serviceCommitmentsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, description] = line.split('|');
        return { title: (title || '').trim(), description: (description || '').trim() };
      });
    const detailSections = detailSectionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, content] = line.split('|');
        return { title: (title || '').trim(), content: (content || '').trim() };
      });
    try {
      await api.patch(`/admin/products/${encodeURIComponent(pid)}/metadata`, {
        sizeGuide: {
          chartImageUrl: sizeChartImageUrl,
          circumferenceNote,
          rows: sizeGuideRows,
        },
        serviceCommitments,
        detailSections,
      });
      setOk('Size guide and expandable detail sections saved.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save size/details.');
    } finally {
      setSavingKey(null);
    }
  };

  const preview = useMemo(() => {
    const bits: string[] = [];
    if (campaignLabel.trim()) bits.push(`Campaign: ${campaignLabel.trim()}`);
    if (couponCode.trim()) bits.push(`Coupon: ${couponCode.trim()}`);
    if (offerEndsAtLocal.trim()) bits.push(`Ends: ${offerEndsAtLocal.replace('T', ' ')}`);
    return bits.join(' · ');
  }, [campaignLabel, couponCode, offerEndsAtLocal]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--text-faint)' }}>
            Admin Tools
          </p>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
            Product Metadata Editor
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Edit promotion, shipping, and policy metadata for a single product. Empty fields won’t render on the PDP.
          </p>
        </div>
      </div>

      <div
        className="rounded-3xl p-4 sm:p-5 space-y-3"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Field label="Product ID" hint="69f25ce0b145c44783d00c00">
              <input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={inputBase}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
                placeholder="Paste a product ObjectId…"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => {
              const pid = normalizedProductId;
              if (!pid) return;
              setSearchParams({ productId: pid });
              void load(pid);
            }}
            className={adminPrimaryButtonClass}
            disabled={loading || !normalizedProductId}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Load
          </button>
        </div>

        {(productName || productSku) && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {productName || 'Product'}
            </span>
            {productSku ? <span style={{ color: 'var(--text-muted)' }}> · SKU {productSku}</span> : null}
          </p>
        )}

        {preview ? (
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Preview: {preview}
          </p>
        ) : null}

        {error ? (
          <div className="px-4 py-3 rounded-2xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#b91c1c' }}>
            {error}
          </div>
        ) : null}
        {ok ? (
          <div className="px-4 py-3 rounded-2xl text-sm font-semibold" style={{ background: '#f0fdf4', color: '#166534' }}>
            {ok}
          </div>
        ) : null}
      </div>

      <Card
        title="Promotion details"
        helper="Optional marketing metadata shown on the product page only when present and active."
        icon={<BadgePercent className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Coupon code" hint="RWF555">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <Field label="Campaign label" hint="SUMMER READY">
            <input
              value={campaignLabel}
              onChange={(e) => setCampaignLabel(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Offer ends at" hint="2026-06-30 23:59">
              <input
                type="datetime-local"
                value={offerEndsAtLocal}
                onChange={(e) => setOfferEndsAtLocal(e.target.value)}
                className={inputBase}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Stored as a date/time; countdown logic can render elsewhere when in the future.
              </p>
            </Field>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void savePromo()}
            disabled={!normalizedProductId || savingKey != null}
            className={adminPrimaryButtonClass}
          >
            {savingKey === 'promo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save promotion
          </button>
        </div>
      </Card>
      <Card
        title="Size guide and expandable sections"
        helper="Structured support for ring sizing/circumference and dropdown service/detail content on PDP."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Size chart image URL" hint="https://.../ring-size-chart.jpg">
            <input
              value={sizeChartImageUrl}
              onChange={(e) => setSizeChartImageUrl(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <Field label="Circumference note" hint="Measure with thread and compare to chart">
            <input
              value={circumferenceNote}
              onChange={(e) => setCircumferenceNote(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Size rows (one per line)" hint="US 7|54.4">
              <textarea
                value={sizeRowsText}
                onChange={(e) => setSizeRowsText(e.target.value)}
                className={`${inputBase} min-h-[100px]`}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Service commitments (one per line)" hint="Fast dispatch|Ships in 24h">
              <textarea
                value={serviceCommitmentsText}
                onChange={(e) => setServiceCommitmentsText(e.target.value)}
                className={`${inputBase} min-h-[100px]`}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Detail sections (one per line)" hint="Materials|925 silver with zircon">
              <textarea
                value={detailSectionsText}
                onChange={(e) => setDetailSectionsText(e.target.value)}
                className={`${inputBase} min-h-[100px]`}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              />
            </Field>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void saveDetails()}
            disabled={!normalizedProductId || savingKey != null}
            className={adminPrimaryButtonClass}
          >
            {savingKey === 'details' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save size/details
          </button>
        </div>
      </Card>

      <Card
        title="Shipping details"
        helper="Buyer-facing shipping text shown on PDP only when provided."
        icon={<Truck className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Shipping cost label" hint="Free shipping · Kigali">
            <input
              value={shippingCostLabel}
              onChange={(e) => setShippingCostLabel(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <Field label="Estimated delivery label" hint="2–4 business days">
            <input
              value={estimatedDeliveryLabel}
              onChange={(e) => setEstimatedDeliveryLabel(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)' }}>
            <input
              type="checkbox"
              checked={freeShipping}
              onChange={(e) => setFreeShipping(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Mark as free shipping
            </span>
          </label>
        </div>
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void saveShipping()}
            disabled={!normalizedProductId || savingKey != null}
            className={adminPrimaryButtonClass}
          >
            {savingKey === 'shipping' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save shipping
          </button>
        </div>
      </Card>

      <Card
        title="Policy details"
        helper="Return policy + safety/trust notes. These blocks hide automatically on PDP when empty."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Return policy label" hint="30-day returns">
            <input
              value={returnPolicyLabel}
              onChange={(e) => setReturnPolicyLabel(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <Field label="Security note" hint="Your payment is protected">
            <input
              value={securityNote}
              onChange={(e) => setSecurityNote(e.target.value)}
              className={inputBase}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
              placeholder="Optional"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Return policy details" hint="30-day window. Item must be unused in original packaging.">
              <textarea
                value={returnPolicyDetails}
                onChange={(e) => setReturnPolicyDetails(e.target.value)}
                className={`${inputBase} min-h-[110px]`}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
                placeholder="Optional"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Payment safety note" hint="Encrypted checkout · no card data stored">
              <textarea
                value={paymentSafetyNote}
                onChange={(e) => setPaymentSafetyNote(e.target.value)}
                className={`${inputBase} min-h-[90px]`}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)', color: 'var(--text-primary)' }}
                placeholder="Optional"
              />
            </Field>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void savePolicy()}
            disabled={!normalizedProductId || savingKey != null}
            className={adminPrimaryButtonClass}
          >
            {savingKey === 'policy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save policy
          </button>
        </div>
      </Card>
    </div>
  );
}

