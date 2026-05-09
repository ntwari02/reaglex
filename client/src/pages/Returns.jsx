import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  MessageSquare,
  ShieldCheck,
  Upload,
  Video,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { buyerReturnsAPI } from '@/lib/api';

const REASON_DEFAULTS = [
  { code: 'wrong_item', label: 'Wrong item received' },
  { code: 'damaged', label: 'Damaged product' },
  { code: 'counterfeit', label: 'Counterfeit' },
  { code: 'missing_parts', label: 'Missing parts' },
  { code: 'not_as_described', label: 'Not as described' },
  { code: 'changed_mind', label: 'Changed mind' },
  { code: 'shipping_damage', label: 'Shipping damage' },
];

const RETURN_TYPES = [
  { code: 'refund_only', label: 'Refund Only' },
  { code: 'return_and_refund', label: 'Return & Refund' },
  { code: 'replacement', label: 'Replacement' },
  { code: 'exchange', label: 'Exchange' },
];

const STAGES = [
  { key: 'requested', label: 'Requested' },
  { key: 'seller_reviewing', label: 'Seller Reviewing' },
  { key: 'approved', label: 'Approved' },
  { key: 'item_returned', label: 'Item Returned' },
  { key: 'refund_processed', label: 'Refund Processed' },
];

function stageDone(caseItem, stageKey) {
  const idx = STAGES.findIndex((x) => x.key === stageKey);
  const current = STAGES.findIndex((x) => x.key === (caseItem?.status || 'requested'));
  return idx <= Math.max(0, current);
}

function groupBySeller(items) {
  const out = new Map();
  for (const item of items || []) {
    const key = item.sellerId || 'unknown';
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(item);
  }
  return out;
}

export default function Returns() {
  const [sp] = useSearchParams();
  const orderId = sp.get('order') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [reasonCode, setReasonCode] = useState('wrong_item');
  const [description, setDescription] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiRewrite, setAiRewrite] = useState('');
  const [returnType, setReturnType] = useState('return_and_refund');
  const [refundMethod, setRefundMethod] = useState('original_payment');
  const [selectedCourier, setSelectedCourier] = useState('DHL');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [files, setFiles] = useState([]);
  const [liveChatText, setLiveChatText] = useState('');
  const [activeCaseId, setActiveCaseId] = useState('');

  const reasons = preview?.reasons?.length ? preview.reasons : REASON_DEFAULTS;
  const returnTypes = preview?.returnTypes?.length ? preview.returnTypes : RETURN_TYPES;
  const activeCase = cases.find((x) => String(x._id) === String(activeCaseId)) || cases[0] || null;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const [p, c] = await Promise.all([
          buyerReturnsAPI.getOrderPreview(orderId),
          buyerReturnsAPI.listCases({ orderId }),
        ]);
        if (cancelled) return;
        setPreview(p);
        setCases(c.cases || []);
        if ((c.cases || [])[0]?._id) setActiveCaseId(String(c.cases[0]._id));
      } catch (e) {
        alert(e?.message || 'Failed to load return workflow');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const sellerGroups = useMemo(() => groupBySeller(preview?.items || []), [preview?.items]);
  const selectedCount = selectedItems.length;

  function toggleItem(orderItemId, eligible) {
    if (!eligible) return;
    setSelectedItems((cur) =>
      cur.includes(orderItemId) ? cur.filter((x) => x !== orderItemId) : [...cur, orderItemId],
    );
  }

  function addFiles(list) {
    const allowed = [];
    for (const f of list) {
      const ok = f.type.startsWith('image/') || f.type.startsWith('video/') || /pdf|officedocument|msword|text\//.test(f.type);
      if (ok) allowed.push(f);
    }
    setFiles((cur) => [...cur, ...allowed].slice(0, 12));
  }

  async function handleAiAssist() {
    if (!description.trim()) return;
    try {
      const r = await buyerReturnsAPI.aiAssistDescription(description.trim());
      setAiSummary(r.summary || '');
      setAiRewrite(r.rewritten || '');
      if (r.rewritten) setDescription(r.rewritten);
    } catch (e) {
      alert(e?.message || 'AI helper failed');
    }
  }

  async function submitCase() {
    if (!preview?.order?.orderId) return;
    if (!selectedItems.length) return alert('Select at least one eligible product');
    if (!description.trim()) return alert('Description is required');
    setSaving(true);
    try {
      const created = await buyerReturnsAPI.createCase({
        orderId: preview.order.orderId,
        selectedOrderItemIds: selectedItems,
        reasonCode,
        description: description.trim(),
        returnType,
        aiSummary: aiSummary || undefined,
        aiRewrittenDescription: aiRewrite || undefined,
        refundMethod,
        shipping: {
          selectedCourier,
          trackingNumber,
        },
      });
      const createdCases = created?.cases || [];
      for (const c of createdCases) {
        if (files.length > 0) {
          await buyerReturnsAPI.uploadEvidence(String(c._id), files, selectedItems[0]);
        }
      }
      const updated = await buyerReturnsAPI.listCases({ orderId: preview.order.orderId });
      setCases(updated.cases || []);
      if ((updated.cases || [])[0]?._id) setActiveCaseId(String(updated.cases[0]._id));
      setFiles([]);
      setLiveChatText('');
      alert(created.splitBySeller ? 'Return cases created and split by seller.' : 'Return case created.');
    } catch (e) {
      alert(e?.message || 'Failed to create return case');
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage() {
    if (!activeCase?._id || !liveChatText.trim()) return;
    try {
      const r = await buyerReturnsAPI.sendMessage(String(activeCase._id), { text: liveChatText.trim() });
      setCases((cur) => cur.map((x) => (String(x._id) === String(activeCase._id) ? { ...x, chat: r.chat } : x)));
      setLiveChatText('');
    } catch (e) {
      alert(e?.message || 'Failed to send message');
    }
  }

  if (!orderId) {
    return (
      <BuyerLayout>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Missing order ID. Open returns from your orders page.
          </p>
        </div>
      </BuyerLayout>
    );
  }

  if (loading) {
    return (
      <BuyerLayout>
        <div className="max-w-3xl mx-auto px-4 py-12">Loading returns workflow...</div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        <div className="max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          <div className="space-y-5 min-w-0">
            <Link to="/account?tab=orders" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft size={16} /> Back to Orders
            </Link>

            {/* Order Summary */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h1 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>Returns & Resolution Center</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><p style={{ color: 'var(--text-faint)' }}>Order ID</p><p className="font-bold">{preview?.order?.orderNumber || preview?.order?.orderId}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Order Date</p><p className="font-bold">{preview?.order?.orderDate ? new Date(preview.order.orderDate).toLocaleDateString() : '-'}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Payment</p><p className="font-bold">{preview?.order?.paymentStatus || '-'}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Delivery</p><p className="font-bold">{preview?.order?.deliveryStatus || '-'}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Escrow</p><p className="font-bold">{preview?.order?.escrowStatus || '-'}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Seller</p><p className="font-bold truncate">{preview?.order?.sellerId || '-'}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Delivered On</p><p className="font-bold">{preview?.order?.deliveryDate ? new Date(preview.order.deliveryDate).toLocaleDateString() : '-'}</p></div>
                <div><p style={{ color: 'var(--text-faint)' }}>Escrow Trust</p><p className="font-bold inline-flex items-center gap-1"><ShieldCheck size={14} /> Protected</p></div>
              </div>
            </section>

            {/* Returnable Products */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-3" style={{ color: 'var(--text-primary)' }}>Returnable Products</h2>
              {Array.from(sellerGroups.entries()).map(([sellerId, items]) => (
                <div key={sellerId} className="mb-4">
                  <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Seller: {sellerId}</p>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const selected = selectedItems.includes(item.orderItemId);
                      return (
                        <button
                          key={item.orderItemId}
                          type="button"
                          onClick={() => toggleItem(item.orderItemId, item.eligibility?.eligible)}
                          className="w-full rounded-xl p-3 text-left flex items-start gap-3"
                          style={{
                            border: `1px solid ${selected ? 'var(--brand-primary)' : 'var(--divider)'}`,
                            background: selected ? 'var(--brand-tint)' : 'var(--bg-secondary)',
                            opacity: item.eligibility?.eligible ? 1 : 0.62,
                          }}
                        >
                          <img src={item.image || '/placeholder-image.jpg'} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Qty {item.quantity} • Delivered {item.deliveredAt ? new Date(item.deliveredAt).toLocaleDateString() : '-'}
                            </p>
                            <p className="text-xs mt-1 font-semibold" style={{ color: item.eligibility?.eligible ? '#15803d' : '#b45309' }}>
                              {item.eligibility?.reason || 'Eligibility unknown'}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: selected ? 'var(--brand-primary)' : 'var(--bg-tertiary)', color: selected ? '#fff' : 'var(--text-secondary)' }}>
                            {selected ? 'Selected' : item.eligibility?.eligible ? 'Eligible' : 'Locked'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* Reason selection */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-3">Reason Selection</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {reasons.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setReasonCode(r.code)}
                    className="rounded-xl px-3 py-3 text-left text-sm font-semibold min-h-[44px]"
                    style={{
                      border: `1px solid ${reasonCode === r.code ? 'var(--brand-primary)' : 'var(--divider)'}`,
                      background: reasonCode === r.code ? 'var(--brand-tint)' : 'var(--bg-secondary)',
                      color: reasonCode === r.code ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Evidence Upload */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-3">Evidence Upload</h2>
              <div
                className="rounded-2xl border-2 border-dashed p-5 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles([...e.dataTransfer.files]);
                }}
                style={{ borderColor: 'var(--divider)' }}
              >
                <Upload size={22} className="mx-auto mb-2" />
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Drag & drop images/videos/docs or upload</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => addFiles([...(e.target.files || [])])}
                  className="block mx-auto text-xs"
                />
                <div className="mt-3 flex items-center justify-center gap-2">
                  <label className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl min-h-[44px] cursor-pointer" style={{ background: 'var(--brand-tint)', color: 'var(--brand-primary)' }}>
                    <Camera size={14} /> Live Camera
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => addFiles([...(e.target.files || [])])} className="hidden" />
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl min-h-[44px] cursor-pointer" style={{ background: 'var(--brand-tint)', color: 'var(--brand-primary)' }}>
                    <Video size={14} /> Video Proof
                    <input type="file" accept="video/*" capture="environment" onChange={(e) => addFiles([...(e.target.files || [])])} className="hidden" />
                  </label>
                </div>
              </div>
              {files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={`${f.name}-${i}`} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                      {f.type.startsWith('video/') ? '🎥' : '📎'} {f.name}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Return type + AI description */}
            <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black">Return Type & Description</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {returnTypes.map((rt) => (
                  <button
                    key={rt.code}
                    type="button"
                    onClick={() => setReturnType(rt.code)}
                    className="rounded-xl px-3 py-2 min-h-[44px] text-xs font-bold"
                    style={{
                      background: returnType === rt.code ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                      color: returnType === rt.code ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${returnType === rt.code ? 'var(--brand-primary)' : 'var(--divider)'}`,
                    }}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded-xl p-3 text-sm border"
                style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                placeholder="Explain the issue in detail."
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleAiAssist} className="px-3 py-2 rounded-xl text-xs font-bold min-h-[44px]" style={{ background: 'var(--brand-tint)', color: 'var(--brand-primary)' }}>
                  AI Rewrite & Summarize
                </button>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border min-h-[44px]"
                  style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                >
                  <option value="original_payment">Original Payment</option>
                  <option value="momo">MTN MoMo</option>
                  <option value="flutterwave_card">Flutterwave/Card</option>
                  <option value="wallet">Wallet Balance</option>
                </select>
              </div>
              {aiSummary && (
                <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)' }}>
                  <p className="font-black mb-1">AI Summary</p>
                  <p style={{ color: 'var(--text-muted)' }}>{aiSummary}</p>
                </div>
              )}
            </section>

            {/* Shipping + tracking */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-3">Shipping & Tracking</h2>
              <div className="grid sm:grid-cols-3 gap-2">
                <select value={selectedCourier} onChange={(e) => setSelectedCourier(e.target.value)} className="rounded-xl p-2.5 text-sm border min-h-[44px]" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                  <option>DHL</option>
                  <option>FedEx</option>
                  <option>Local Courier</option>
                </select>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking number"
                  className="rounded-xl p-2.5 text-sm border min-h-[44px]"
                  style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                />
                <button type="button" className="rounded-xl text-sm font-bold min-h-[44px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)' }}>
                  Generate QR Label
                </button>
              </div>
            </section>

            {/* Timeline */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-3">Resolution Timeline</h2>
              <div className="space-y-2">
                {STAGES.map((stage) => {
                  const done = stageDone(activeCase, stage.key);
                  return (
                    <div key={stage.key} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: done ? 'var(--brand-tint)' : 'var(--bg-secondary)' }}>
                      <span className="w-6 h-6 rounded-full inline-flex items-center justify-center">{done ? <CheckCircle2 size={15} /> : <Clock3 size={14} />}</span>
                      <p className="text-sm font-semibold">{stage.label}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Refund status */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-2">Refund Status</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Amount: {activeCase?.refund?.amount ?? 0} {activeCase?.refund?.currency || 'USD'} • Method: {activeCase?.refund?.method || refundMethod} • ETA: {activeCase?.refund?.etaLabel || '3-7 business days'}
              </p>
            </section>

            {/* Live chat */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <h2 className="text-lg font-black mb-2">Live Chat / Resolution Center</h2>
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {(activeCase?.chat || []).map((m, idx) => (
                  <div key={idx} className="rounded-xl p-2.5 text-xs" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="font-bold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>{m.actorRole}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{m.text}</p>
                    <p style={{ color: 'var(--text-faint)' }}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={liveChatText}
                  onChange={(e) => setLiveChatText(e.target.value)}
                  placeholder="Message seller/admin"
                  className="flex-1 rounded-xl p-2.5 text-sm border min-h-[44px]"
                  style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                />
                <button type="button" onClick={sendMessage} className="rounded-xl px-4 min-h-[44px] text-sm font-bold text-white" style={{ background: 'var(--gradient-brand-cta)' }}>
                  Send
                </button>
              </div>
            </section>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-20 h-fit space-y-3">
            <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <p className="text-sm font-black mb-2">Case Snapshot</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Selected products: {selectedCount}
                <br />
                Existing case(s): {cases.length}
                <br />
                Escrow: {preview?.order?.escrowStatus || '-'}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
              <p className="text-sm font-black mb-2">Return Analytics</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Return frequency: {preview?.analytics?.returnFrequency ?? 0}
                <br />
                Fraud probability: {Math.round((preview?.analytics?.fraudProbability || 0) * 100)}%
                <br />
                Seller defect rate: {Math.round((preview?.analytics?.sellerDefectRate || 0) * 100)}%
                <br />
                Est. resolution: {preview?.analytics?.resolutionHoursAvg || 72}h
              </p>
            </div>
            {preview?.policy?.blockReasons?.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--badge-warning-bg)', border: '1px solid var(--badge-warning-border)' }}>
                <p className="text-xs font-bold mb-1 inline-flex items-center gap-1"><AlertCircle size={14} /> Policy Alerts</p>
                <ul className="list-disc pl-4 text-xs">
                  {preview.policy.blockReasons.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            )}
            <motion.button
              type="button"
              disabled={saving}
              onClick={submitCase}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60 min-h-[48px]"
              style={{ background: 'var(--gradient-brand-cta)' }}
            >
              {saving ? 'Submitting...' : 'Submit Return Request'}
            </motion.button>
            <p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
              <MessageSquare size={12} /> Notifications are sent on submitted, approved, rejected, refunded, and received status changes.
            </p>
          </aside>
        </div>
      </div>
    </BuyerLayout>
  );
}

