import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, UserPlus, RefreshCw, Trash2 } from 'lucide-react';
import { ADMIN_PRESET_CATEGORY_LABELS, ADMIN_PRESET_CATEGORY_ORDER } from '@/lib/adminNavCatalog';
import { API_BASE_URL } from '@/lib/config';
import { useAuthStore } from '@/stores/authStore';
import { isSuperAdmin } from '@/lib/adminPermissions';
import { useToastStore } from '@/stores/toastStore';
import AdminIntelligencePlatformSettings from '@/components/admin/intelligence/AdminIntelligencePlatformSettings';

type Preset = {
  id: string;
  label: string;
  description: string;
  scopes: string[];
  category?: string;
  highlights?: string[];
  tier?: string;
};

type StaffRow = {
  id: string;
  fullName: string;
  email: string;
  accountStatus?: string;
  adminAccess?: { label?: string; preset?: string; isSuperAdmin?: boolean; scopes?: string[] };
};

export default function AdminTeamManagement() {
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    preset: 'support_admin',
  });

  const headers = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/staff/presets`, { headers: headers() }),
        fetch(`${API_BASE_URL}/admin/staff`, { headers: headers() }),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      if (pRes.ok) setPresets(pData.presets || []);
      if (sRes.ok) setStaff(sData.staff || []);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const presetsByCategory = useMemo(() => {
    const groups = new Map<string, Preset[]>();
    for (const cat of ADMIN_PRESET_CATEGORY_ORDER) {
      groups.set(cat, []);
    }
    for (const p of presets) {
      const cat = p.category || 'operations';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return ADMIN_PRESET_CATEGORY_ORDER.filter((cat) => (groups.get(cat)?.length ?? 0) > 0).map((cat) => ({
      category: cat,
      label: ADMIN_PRESET_CATEGORY_LABELS[cat] || cat,
      presets: groups.get(cat) || [],
    }));
  }, [presets]);

  if (!isSuperAdmin(user)) {
    return (
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Only super admins can manage the admin team.</p>
      </div>
    );
  }

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`${API_BASE_URL}/admin/staff`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (!r.ok) {
      showToast(data.message || 'Failed to create staff', 'error');
      return;
    }
    showToast('Admin staff created — they must set up 2FA on first login', 'success');
    setForm({ fullName: '', email: '', password: '', preset: 'support_admin' });
    void load();
  };

  const deactivate = async (id: string) => {
    if (!window.confirm('Deactivate this admin staff account?')) return;
    const r = await fetch(`${API_BASE_URL}/admin/staff/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    const data = await r.json();
    if (!r.ok) {
      showToast(data.message || 'Failed', 'error');
      return;
    }
    showToast('Staff deactivated', 'success');
    void load();
  };

  const selectedPreset = presets.find((p) => p.id === form.preset);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
            Admin team
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Classified roles (Finance, Marketing, Catalog, Commerce, etc.) with scoped sidebar and API access. All staff must use 2FA.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border text-sm"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <AdminIntelligencePlatformSettings />

      <form
        onSubmit={(e) => void createStaff(e)}
        className="rounded-2xl border p-4 sm:p-6 space-y-4"
        style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}
      >
        <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <UserPlus className="w-5 h-5" /> Add admin assistant
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Full name
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--input-text)' }}
            />
          </label>
          <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--input-text)' }}
            />
          </label>
          <label className="block text-xs sm:col-span-2" style={{ color: 'var(--text-secondary)' }}>
            Temporary password (min 12 characters)
            <input
              type="password"
              required
              minLength={12}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--input-text)' }}
            />
          </label>
          <label className="block text-xs sm:col-span-2" style={{ color: 'var(--text-secondary)' }}>
            Role template
            <select
              value={form.preset}
              onChange={(e) => setForm((f) => ({ ...f, preset: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--input-text)' }}
            >
              {presetsByCategory.map((group) => (
                <optgroup key={group.category} label={group.label}>
                  {group.presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {selectedPreset && (
          <div className="text-xs rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-page)', color: 'var(--text-muted)' }}>
            <p>{selectedPreset.description}</p>
            {selectedPreset.highlights && selectedPreset.highlights.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {selectedPreset.highlights.map((h) => (
                  <li
                    key={h}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                    style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                  >
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {selectedPreset.scopes?.length > 0 && selectedPreset.tier !== 'super' && (
              <p className="opacity-80">Scopes: {selectedPreset.scopes.join(', ')}</p>
            )}
          </div>
        )}
        <button
          type="submit"
          className="min-h-[48px] px-5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--brand-primary)' }}
        >
          Create staff account
        </button>
      </form>

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}>
          Team members ({staff.length})
        </div>
        {loading ? (
          <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border-card)' }}>
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {s.fullName}{' '}
                    <span className="text-xs font-normal opacity-70">({s.adminAccess?.label || 'Admin'})</span>
                  </p>
                  <p className="text-xs">{s.email}</p>
                  <p className="text-xs capitalize">{s.accountStatus || 'active'}</p>
                </div>
                {!s.adminAccess?.isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => void deactivate(s.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg border border-red-500/40 text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Deactivate
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
