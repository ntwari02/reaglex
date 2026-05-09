import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Camera, CheckCircle2, Clock3, MessageSquare, Search, ShieldCheck, Video } from 'lucide-react';
import { sellerReturnsAPI } from '@/lib/api';
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

function badgeTone(status: string): string {
  if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200';
  if (status === 'refund_processed' || status === 'resolved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200';
}

export default function ReturnsCases() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [chatText, setChatText] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await sellerReturnsAPI.listCases({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 });
      setCases(res.cases || []);
      if (!selectedId && (res.cases || []).length) setSelectedId(String(res.cases[0]._id));
    } catch (e: any) {
      alert(e?.message || 'Failed to load return cases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => String(c.caseNumber || '').toLowerCase().includes(q) || String(c.reasonLabel || '').toLowerCase().includes(q));
  }, [cases, search]);

  const selected = filtered.find((c) => String(c._id) === String(selectedId)) || filtered[0] || null;
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

  async function applyStatusUpdate() {
    if (!selected?._id || !newStatus) return;
    setSaving(true);
    try {
      const res = await sellerReturnsAPI.updateStatus(String(selected._id), {
        status: newStatus,
        note: statusNote || undefined,
      });
      setCases((cur) => cur.map((c) => (String(c._id) === String(selected._id) ? res.case : c)));
      setNewStatus('');
      setStatusNote('');
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
      const res = await sellerReturnsAPI.sendMessage(String(selected._id), { text: chatText.trim() });
      setCases((cur) => cur.map((c) => (String(c._id) === String(selected._id) ? { ...c, chat: res.chat } : c)));
      setChatText('');
    } catch (e: any) {
      alert(e?.message || 'Failed to send message');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Returns Control</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Review return cases, evidence, fraud signals, and update resolution timeline.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search case" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-8 pr-2 py-2 text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm">
              {['all', 'requested', 'seller_reviewing', 'approved', 'item_returned', 'refund_processed', 'rejected', 'resolved'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading cases...</div>
          ) : (
            <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
              {filtered.map((c) => (
                <button key={c._id} onClick={() => setSelectedId(String(c._id))} className="w-full text-left rounded-xl p-3 border"
                  style={{
                    borderColor: String(c._id) === String(selected?._id) ? 'var(--brand-primary)' : 'var(--divider)',
                    background: String(c._id) === String(selected?._id) ? 'var(--brand-tint)' : 'var(--card-bg)',
                  }}>
                  <p className="text-xs font-black">{c.caseNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{c.reasonLabel}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badgeTone(c.status)}`}>{c.status}</span>
                    <span className="text-[10px] text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a case to review.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black">{selected.caseNumber}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeTone(selected.status)}`}>{selected.status}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">Type: {selected.returnType}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{selected.description}</p>

              <div className="grid md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl p-2 border border-gray-200 dark:border-gray-700"><p className="text-gray-500">Fraud score</p><p className="font-bold">{selected?.fraudSignals?.abuseScore ?? 0}/100</p></div>
                <div className="rounded-xl p-2 border border-gray-200 dark:border-gray-700"><p className="text-gray-500">Authenticity</p><p className="font-bold">{selected?.authenticityCheck?.score ?? 0}/100</p></div>
                <div className="rounded-xl p-2 border border-gray-200 dark:border-gray-700"><p className="text-gray-500">Refund</p><p className="font-bold">{selected?.refund?.amount ?? 0} {selected?.refund?.currency || 'USD'}</p></div>
                <div className="rounded-xl p-2 border border-gray-200 dark:border-gray-700"><p className="text-gray-500">Escrow</p><p className="font-bold inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {selected?.escrowSnapshot?.escrowStatus || '-'}</p></div>
              </div>

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
                      <p className="text-gray-500 inline-flex items-center gap-1">
                        {String(ev.kind).includes('video') ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />} {ev.kind}
                      </p>
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
                <p className="text-sm font-bold">Status Action</p>
                {nextStatuses.length === 0 ? (
                  <p className="text-xs text-gray-500">No further transitions available.</p>
                ) : (
                  <div className="grid md:grid-cols-[180px_1fr_auto] gap-2">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900">
                      <option value="">Select next status</option>
                      {nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Optional note to buyer" className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900" />
                    <button onClick={applyStatusUpdate} disabled={!newStatus || saving} className="rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand-cta)' }}>
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="text-sm font-bold inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Resolution Chat</p>
                <div className="space-y-2 max-h-44 overflow-auto pr-1">
                  {(selected.chat || []).map((m: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg p-2 text-xs bg-gray-50 dark:bg-gray-800/50">
                      <p className="font-bold uppercase tracking-wide text-[10px] text-gray-500">{m.actorRole}</p>
                      <p>{m.text}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Reply to buyer..." className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 text-sm bg-white dark:bg-gray-900" />
                  <button onClick={sendMessage} disabled={!chatText.trim() || saving} className="rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand-cta)' }}>
                    Send
                  </button>
                </div>
              </div>

              {(selected?.fraudSignals?.suspiciousPatterns || []).length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-sm font-bold inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> Risk Signals</p>
                  <ul className="list-disc pl-5 mt-1 text-xs text-amber-800 dark:text-amber-200">
                    {selected.fraudSignals.suspiciousPatterns.map((x: string) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

