import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { adminReturnsAPI } from '@/lib/api';
import { websocketService } from '@/services/websocketService';

const STAGE_OPTIONS: Record<string, string[]> = {
  requested: ['seller_reviewing', 'approved', 'rejected'],
  seller_reviewing: ['approved', 'rejected'],
  approved: ['item_returned', 'refund_processed'],
  item_returned: ['refund_processed'],
  refund_processed: ['resolved'],
  rejected: ['resolved'],
  resolved: [],
};

function tone(status: string): string {
  if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200';
  if (status === 'refund_processed' || status === 'resolved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200';
}

export default function ReturnsControlCenter() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [chatText, setChatText] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkNote, setBulkNote] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await adminReturnsAPI.listCases({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        limit: 100,
      });
      setCases(res.cases || []);
      if (!selectedId && (res.cases || []).length) setSelectedId(String(res.cases[0]._id));
    } catch (e: any) {
      alert(e?.message || 'Failed to load return cases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  useEffect(() => {
    websocketService.connect();
    const prev = websocketService.onSystemInboxNotification;
    websocketService.onSystemInboxNotification = () => {
      void load();
    };
    const interval = window.setInterval(() => {
      void load();
    }, 15000);
    return () => {
      websocketService.onSystemInboxNotification = prev;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => cases.find((c) => String(c._id) === String(selectedId)) || cases[0] || null, [cases, selectedId]);
  const nextStatuses = selected ? STAGE_OPTIONS[String(selected.status)] || [] : [];
  const integrity = useMemo(() => {
    if (!selected) return { total: 0, missingHash: 0, duplicateHashCount: 0, suspiciousMimeCount: 0 };
    const evidence = Array.isArray(selected.evidence) ? selected.evidence : [];
    const seen = new Map<string, number>();
    let missingHash = 0;
    let suspiciousMimeCount = 0;
    for (const ev of evidence) {
      const hash = String(ev?.integrityHash || '');
      if (!hash) missingHash += 1;
      else seen.set(hash, (seen.get(hash) || 0) + 1);
      const mime = String(ev?.mimeType || '').toLowerCase();
      const kind = String(ev?.kind || '').toLowerCase();
      const mismatched =
        (kind === 'video' && mime && !mime.startsWith('video/')) ||
        (kind === 'image' && mime && !mime.startsWith('image/'));
      if (mismatched) suspiciousMimeCount += 1;
    }
    const duplicateHashCount = Array.from(seen.values()).filter((x) => x > 1).length;
    return { total: evidence.length, missingHash, duplicateHashCount, suspiciousMimeCount };
  }, [selected]);

  async function updateStatus() {
    if (!selected?._id || !newStatus) return;
    setSaving(true);
    try {
      const body: any = { status: newStatus, note: note || undefined };
      if (refundAmount && Number.isFinite(Number(refundAmount))) body.refundAmount = Number(refundAmount);
      const res = await adminReturnsAPI.updateStatus(String(selected._id), body);
      setCases((cur) => cur.map((c) => (String(c._id) === String(selected._id) ? res.case : c)));
      setNewStatus('');
      setNote('');
    } catch (e: any) {
      alert(e?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage() {
    if (!selected?._id || !chatText.trim()) return;
    setSaving(true);
    try {
      const res = await adminReturnsAPI.sendMessage(String(selected._id), { text: chatText.trim() });
      setCases((cur) => cur.map((c) => (String(c._id) === String(selected._id) ? { ...c, chat: res.chat } : c)));
      setChatText('');
    } catch (e: any) {
      alert(e?.message || 'Failed to send message');
    } finally {
      setSaving(false);
    }
  }

  async function applyBulk() {
    if (!bulkSelection.length || !bulkStatus) return;
    setSaving(true);
    try {
      const res = await adminReturnsAPI.bulkUpdateStatus({
        caseIds: bulkSelection,
        status: bulkStatus,
        note: bulkNote || undefined,
      });
      setBulkSelection([]);
      setBulkStatus('');
      setBulkNote('');
      await load();
      if ((res.skipped || []).length > 0) {
        alert(`Bulk update done. Updated: ${res.updatedCount}. Skipped: ${res.skipped.length}.`);
      }
    } catch (e: any) {
      alert(e?.message || 'Bulk update failed');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const total = cases.length || 1;
    const highRisk = cases.filter((c) => Number(c?.fraudSignals?.abuseScore || 0) >= 70).length;
    const disputedEscrow = cases.filter((c) => String(c?.escrowSnapshot?.escrowStatus || '').toUpperCase() === 'DISPUTED').length;
    const resolved = cases.filter((c) => ['refund_processed', 'resolved'].includes(String(c.status))).length;
    return { total: cases.length, highRisk, disputedEscrow, resolvedRate: Math.round((resolved / total) * 100) };
  }, [cases]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Returns Control Center</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Central admin workflow for return fraud risk, escrow protection, and final resolution actions.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"><p className="text-xs text-gray-500">Cases</p><p className="font-black">{stats.total}</p></div>
        <div className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"><p className="text-xs text-gray-500">High Risk</p><p className="font-black">{stats.highRisk}</p></div>
        <div className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"><p className="text-xs text-gray-500">Escrow Disputed</p><p className="font-black inline-flex gap-1 items-center"><ShieldCheck className="h-3.5 w-3.5" /> {stats.disputedEscrow}</p></div>
        <div className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"><p className="text-xs text-gray-500">Resolved Rate</p><p className="font-black">{stats.resolvedRate}%</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[390px_1fr] gap-4">
        <div className="rounded-2xl p-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-2">
            <p className="text-xs font-bold">Bulk Actions ({bulkSelection.length} selected)</p>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-xs bg-white dark:bg-gray-900">
                <option value="">Select status</option>
                {['seller_reviewing', 'approved', 'item_returned', 'refund_processed', 'rejected', 'resolved'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <input value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Bulk note" className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-xs bg-white dark:bg-gray-900" />
              <button onClick={applyBulk} disabled={!bulkStatus || !bulkSelection.length || saving} className="rounded-lg px-2 py-2 text-xs font-bold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand-cta)' }}>
                Apply
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 pl-8 pr-2 py-2 text-sm bg-white dark:bg-gray-900" placeholder="Search case number" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900">
              {['all', 'requested', 'seller_reviewing', 'approved', 'item_returned', 'refund_processed', 'rejected', 'resolved'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {cases.map((c) => (
                <button key={c._id} onClick={() => setSelectedId(String(c._id))} className="w-full rounded-xl border p-3 text-left"
                  style={{
                    borderColor: String(c._id) === String(selected?._id) ? 'var(--brand-primary)' : 'var(--divider)',
                    background: String(c._id) === String(selected?._id) ? 'var(--brand-tint)' : 'var(--card-bg)',
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={bulkSelection.includes(String(c._id))}
                        onChange={(e) => {
                          const id = String(c._id);
                          setBulkSelection((cur) => (e.target.checked ? [...cur, id] : cur.filter((x) => x !== id)));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <p className="text-xs font-black truncate">{c.caseNumber}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tone(c.status)}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{c.reasonLabel}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Risk {c?.fraudSignals?.abuseScore ?? 0} • {new Date(c.createdAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a case.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black">{selected.caseNumber}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tone(selected.status)}`}>{selected.status}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{selected.reasonLabel}</span>
              </div>

              <div className="grid md:grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-2"><p className="text-gray-500">Fraud score</p><p className="font-bold">{selected?.fraudSignals?.abuseScore ?? 0}/100</p></div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-2"><p className="text-gray-500">Authenticity</p><p className="font-bold">{selected?.authenticityCheck?.score ?? 0}/100</p></div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-2"><p className="text-gray-500">Escrow</p><p className="font-bold">{selected?.escrowSnapshot?.escrowStatus || '-'}</p></div>
              </div>

              {(selected?.fraudSignals?.suspiciousPatterns || []).length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-sm font-bold inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> Fraud Flags</p>
                  <ul className="list-disc pl-5 mt-1 text-xs text-amber-800 dark:text-amber-200">
                    {selected.fraudSignals.suspiciousPatterns.map((x: string) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm font-bold mb-2">Evidence</p>
                <div className="mb-2 grid sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="rounded-lg p-2 bg-gray-50 dark:bg-gray-800/60">Items: <b>{integrity.total}</b></div>
                  <div className="rounded-lg p-2 bg-gray-50 dark:bg-gray-800/60">Missing hash: <b>{integrity.missingHash}</b></div>
                  <div className="rounded-lg p-2 bg-gray-50 dark:bg-gray-800/60">Duplicate hash: <b>{integrity.duplicateHashCount}</b></div>
                  <div className="rounded-lg p-2 bg-gray-50 dark:bg-gray-800/60">Mime mismatch: <b>{integrity.suspiciousMimeCount}</b></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(selected.evidence || []).map((ev: any, idx: number) => (
                    <a key={`${ev.url}-${idx}`} href={ev.url} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                      <p className="font-semibold truncate">{ev.name || ev.kind}</p>
                      <p className="text-gray-500">{ev.kind}</p>
                      <p className="text-[10px] text-gray-400 mt-1 truncate">{ev.integrityHash ? `hash:${String(ev.integrityHash).slice(0, 10)}...` : 'hash:missing'}</p>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm font-bold mb-2">Timeline</p>
                <div className="space-y-2">
                  {['requested', 'seller_reviewing', 'approved', 'item_returned', 'refund_processed', 'resolved'].map((stage) => {
                    const done = (selected.timeline || []).some((t: any) => t.stage === stage);
                    return (
                      <div key={stage} className={`rounded-lg px-2 py-1.5 text-xs flex items-center gap-2 ${done ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-800/40'}`}>
                        {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Clock3 className="h-3.5 w-3.5 text-gray-400" />}
                        <span>{stage.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="text-sm font-bold">Admin Action</p>
                {nextStatuses.length === 0 ? (
                  <p className="text-xs text-gray-500">No transition available.</p>
                ) : (
                  <div className="grid md:grid-cols-[190px_1fr_130px_auto] gap-2">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900">
                      <option value="">Select status</option>
                      {nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Decision note" className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900" />
                    <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Refund amount" className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900" />
                    <button onClick={updateStatus} disabled={!newStatus || saving} className="rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand-cta)' }}>Apply</button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="text-sm font-bold inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Resolution Chat</p>
                <div className="space-y-2 max-h-44 overflow-auto pr-1">
                  {(selected.chat || []).map((m: any, i: number) => (
                    <div key={i} className="rounded-lg p-2 text-xs bg-gray-50 dark:bg-gray-800/50">
                      <p className="font-bold uppercase tracking-wide text-[10px] text-gray-500">{m.actorRole}</p>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Reply in thread..." className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900" />
                  <button onClick={sendMessage} disabled={!chatText.trim() || saving} className="rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand-cta)' }}>Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

