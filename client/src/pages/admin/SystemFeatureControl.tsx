import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  ShieldAlert,
  History,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';
import HomeLayoutDangerPanel from '@/pages/admin/danger/HomeLayoutDangerPanel';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toastStore';
import { isSuperAdmin } from '@/lib/adminPermissions';
import { useAuthStore } from '@/stores/authStore';
import {
  adminSystemFeaturesApi,
  type SystemFeatureItem,
} from '@/services/adminSystemFeaturesApi';
import { invalidateSystemFeaturesCache } from '@/hooks/useSystemFeatures';
import '@/styles/admin-system-features.css';

const GATE_SESSION_KEY = 'spacilly_system_controls_gate';

const CATEGORY_LABELS: Record<string, string> = {
  discovery: 'Discovery & recommendations',
  live_commerce: 'Live commerce',
  payments: 'Checkout & payments',
  ai: 'AI & automation',
  buyer_experience: 'Buyer experience',
  seller: 'Seller tools',
  communications: 'Emails & notifications',
};

function ImpactBadge({ impact }: { impact: SystemFeatureItem['impact'] }) {
  return (
    <span className={`system-features-impact system-features-impact--${impact}`}>
      {impact}
    </span>
  );
}

export default function SystemFeatureControl() {
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const superOk = isSuperAdmin(user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<SystemFeatureItem[]>([]);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [ackText, setAckText] = useState('');
  const [auditLog, setAuditLog] = useState<
    Array<{
      at: string;
      actorEmail?: string;
      changes: Array<{ key: string; from: boolean; to: boolean }>;
    }>
  >([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const [gatePassword, setGatePassword] = useState('');
  const [gateAck, setGateAck] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);

  const [disableModal, setDisableModal] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalAck, setModalAck] = useState(false);
  const [modalPhrase, setModalPhrase] = useState('');
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [dangerTab, setDangerTab] = useState<'features' | 'home-layout'>('features');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminSystemFeaturesApi.getCatalog();
      setFeatures(data.features);
      setAckText(data.disableAcknowledgment);
      setAuditLog(data.auditLog || []);
      const map: Record<string, boolean> = {};
      for (const f of data.features) map[f.key] = f.enabled;
      setDraft(map);
      const cats: Record<string, boolean> = {};
      for (const f of data.features) cats[f.category] = true;
      setOpenCategories(cats);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load system controls', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (superOk) void load();
  }, [superOk, load]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(GATE_SESSION_KEY) === '1') {
        setGateUnlocked(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, SystemFeatureItem[]> = {};
    for (const f of features) {
      if (!g[f.category]) g[f.category] = [];
      g[f.category].push(f);
    }
    return g;
  }, [features]);

  const pendingChanges = useMemo(() => {
    return features.filter((f) => draft[f.key] !== f.enabled);
  }, [features, draft]);

  const hasDisables = pendingChanges.some((f) => draft[f.key] === false && f.enabled);

  const setFeatureDraft = (key: string, enabled: boolean) => {
    const current = features.find((f) => f.key === key);
    if (!current) return;
    if (!enabled && current.enabled) {
      setDisableModal({ key, label: current.label });
      return;
    }
    setDraft((d) => ({ ...d, [key]: enabled }));
  };

  const confirmDisableInModal = async () => {
    if (!disableModal) return;
    if (!modalAck) {
      showToast('Accept the responsibility statement', 'error');
      return;
    }
    if (modalPhrase.trim().toUpperCase() !== 'DISABLE') {
      showToast('Type DISABLE to confirm', 'error');
      return;
    }
    setSaving(true);
    try {
      const { unlockToken: token } = await adminSystemFeaturesApi.requestUnlock({
        superAdminPassword: modalPassword,
        acknowledgment: ackText,
        confirmPhrase: modalPhrase,
      });
      setUnlockToken(token);
      setDraft((d) => ({ ...d, [disableModal.key]: false }));
      setDisableModal(null);
      setModalPassword('');
      setModalPhrase('');
      setModalAck(false);
      showToast('Disable authorization granted for 5 minutes', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Authorization failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (pendingChanges.length === 0) {
      showToast('No changes to save', 'info');
      return;
    }
    if (hasDisables && !unlockToken) {
      showToast('Authorize disabling features first (use Off on a feature)', 'error');
      return;
    }
    setSaving(true);
    try {
      const updates = pendingChanges.map((f) => ({
        key: f.key,
        enabled: draft[f.key],
      }));
      const res = await adminSystemFeaturesApi.patchFeatures({
        updates,
        unlockToken: hasDisables ? unlockToken || undefined : undefined,
        acknowledgment: hasDisables ? ackText : undefined,
        confirmPhrase: hasDisables ? 'DISABLE' : undefined,
      });
      setFeatures(res.features);
      const map: Record<string, boolean> = {};
      for (const f of res.features) map[f.key] = f.enabled;
      setDraft(map);
      setUnlockToken(null);
      invalidateSystemFeaturesCache();
      await load();
      showToast('System controls saved', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const enterGate = async () => {
    if (!gateAck) {
      showToast('Confirm you understand the risk', 'error');
      return;
    }
    if (!gatePassword.trim()) {
      showToast('Enter your super admin password', 'error');
      return;
    }
    setSaving(true);
    try {
      await adminSystemFeaturesApi.requestUnlock({
        superAdminPassword: gatePassword,
        acknowledgment: ackText || 'I understand that disabling platform features may break buyer and seller experiences, reduce revenue, and require careful re-enablement. I accept responsibility for this change.',
        confirmPhrase: 'DISABLE',
      });
      setGateUnlocked(true);
      try {
        sessionStorage.setItem(GATE_SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      showToast('Access granted', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Access denied', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!superOk) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-amber-500 mb-4" />
        <h1 className="text-xl font-bold">Super admin only</h1>
        <p className="text-sm text-gray-500 mt-2">
          System feature controls are restricted to super administrators.
        </p>
        <Link to="/admin" className="text-sm font-semibold text-blue-600 mt-4 inline-block">
          ← Back to admin
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading system controls…
      </div>
    );
  }

  if (!gateUnlocked) {
    return (
      <div className="system-features-page">
        <div className="system-features-modal-backdrop relative min-h-[60vh]">
          <div className="system-features-modal" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              Super admin verification
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Enter your account password to view and change platform feature switches.
            </p>
            <label className="block mt-4 text-sm font-medium">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-800"
              />
            </label>
            <label className="flex items-start gap-2 mt-4 text-sm">
              <input
                type="checkbox"
                checked={gateAck}
                onChange={(e) => setGateAck(e.target.checked)}
                className="mt-1"
              />
              <span>
                I am a super admin and understand that changing these controls affects the entire
                marketplace.
              </span>
            </label>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => void enterGate()} disabled={saving}>
                {saving ? 'Verifying…' : 'Enter controls'}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="system-features-page space-y-6 pb-16 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Lock className="w-7 h-7 text-red-500" />
          Danger zone — system controls
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
          Super-admin only. Platform kill switches and homepage card layouts. Defaults match the live site
          today — publish only when you are ready.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setDangerTab('features')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${
            dangerTab === 'features'
              ? 'bg-red-700 text-white'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Platform features
        </button>
        <button
          type="button"
          onClick={() => setDangerTab('home-layout')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg ${
            dangerTab === 'home-layout'
              ? 'bg-red-700 text-white'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Home cards & layout
        </button>
      </div>

      {dangerTab === 'home-layout' ? (
        <HomeLayoutDangerPanel />
      ) : (
        <>
      <div className="system-features-hero">
        <div className="flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800 dark:text-red-300">Danger zone</p>
            <p className="text-sm text-red-900/80 dark:text-red-200/90 mt-1">
              Disabling features can break checkout, live commerce, or recommendations for all users.
              Changes sync to existing admin settings where linked. Re-enable carefully after maintenance.
            </p>
          </div>
        </div>
      </div>

      {pendingChanges.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {pendingChanges.length} unsaved change(s)
            {hasDisables && !unlockToken ? ' — authorize disable first' : ''}
          </span>
          <Button onClick={() => void saveAll()} disabled={saving || (hasDisables && !unlockToken)}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const map: Record<string, boolean> = {};
              for (const f of features) map[f.key] = f.enabled;
              setDraft(map);
              setUnlockToken(null);
            }}
          >
            Discard
          </Button>
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="system-features-category">
          <button
            type="button"
            className="system-features-category__head"
            onClick={() =>
              setOpenCategories((c) => ({ ...c, [category]: !c[category] }))
            }
          >
            <span>{CATEGORY_LABELS[category] || category}</span>
            {openCategories[category] ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
          {openCategories[category] &&
            items.map((f) => {
              const on = draft[f.key] !== false;
              const dirty = draft[f.key] !== f.enabled;
              return (
                <div key={f.key} className="system-features-row">
                  <div className="system-features-row__main">
                    <div className="min-w-0 flex-1">
                      <div className="system-features-row__label">
                        {f.label}
                        <ImpactBadge impact={f.impact} />
                        {dirty && (
                          <span className="text-xs text-amber-600 ml-2">(unsaved)</span>
                        )}
                      </div>
                      <p className="system-features-row__meta">{f.description}</p>
                    </div>
                    <div
                      className="system-features-radio"
                      role="radiogroup"
                      aria-label={`${f.label} enabled`}
                    >
                      <label className={on ? 'is-on-active' : ''}>
                        <input
                          type="radio"
                          name={`sf-${f.key}`}
                          checked={on}
                          onChange={() => setFeatureDraft(f.key, true)}
                        />
                        On
                      </label>
                      <label className={!on ? 'is-off-active' : ''}>
                        <input
                          type="radio"
                          name={`sf-${f.key}`}
                          checked={!on}
                          onChange={() => setFeatureDraft(f.key, false)}
                        />
                        Off
                      </label>
                    </div>
                  </div>
                  <div className="system-features-expand">
                    <details
                      open={expandedKeys[f.key]}
                      onToggle={(e) =>
                        setExpandedKeys((x) => ({
                          ...x,
                          [f.key]: (e.target as HTMLDetailsElement).open,
                        }))
                      }
                    >
                      <summary>How this works & impact</summary>
                      <div className="system-features-expand__body">
                        <dl>
                          <dt>How it works</dt>
                          <dd>{f.howItWorks}</dd>
                          <dt>Buyer impact</dt>
                          <dd>{f.buyerImpact}</dd>
                          <dt>Admin impact</dt>
                          <dd>{f.adminImpact}</dd>
                        </dl>
                        {f.hubRoute && (
                          <Link
                            to={f.hubRoute}
                            className="inline-flex items-center gap-1 text-sm font-semibold mt-3 text-blue-600"
                          >
                            Open {f.hubLabel || 'related settings'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
        </section>
      ))}

      {auditLog.length > 0 && (
        <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <History className="w-5 h-5" />
            Recent changes
          </h2>
          <ul className="space-y-2 text-sm">
            {auditLog.slice(0, 12).map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="text-gray-600 dark:text-gray-400">
                <span className="font-mono text-xs">{new Date(entry.at).toLocaleString()}</span>
                {entry.actorEmail ? ` · ${entry.actorEmail}` : ''}
                <ul className="mt-1 ml-4 list-disc">
                  {entry.changes.map((c) => (
                    <li key={c.key}>
                      {c.key}: {c.from ? 'on' : 'off'} → {c.to ? 'on' : 'off'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

        </>
      )}

      {dangerTab === 'features' && disableModal && (
        <div className="system-features-modal-backdrop">
          <div className="system-features-modal" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold text-red-700">Disable: {disableModal.label}</h2>
            <p className="text-sm text-gray-600 mt-2">
              This requires your super admin password and typing <strong>DISABLE</strong>.
            </p>
            <label className="block mt-3 text-sm font-medium">
              Password
              <input
                type="password"
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-800"
              />
            </label>
            <label className="block mt-3 text-sm font-medium">
              Type DISABLE
              <input
                value={modalPhrase}
                onChange={(e) => setModalPhrase(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-800 font-mono"
                placeholder="DISABLE"
              />
            </label>
            <label className="flex items-start gap-2 mt-3 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={modalAck}
                onChange={(e) => setModalAck(e.target.checked)}
                className="mt-0.5"
              />
              <span>{ackText}</span>
            </label>
            <div className="flex gap-2 mt-5">
              <Button
                variant="destructive"
                onClick={() => void confirmDisableInModal()}
                disabled={saving}
              >
                Authorize disable
              </Button>
              <Button variant="outline" onClick={() => setDisableModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
