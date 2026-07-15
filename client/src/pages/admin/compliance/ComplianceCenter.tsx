import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, FileText, ClipboardCheck, FolderOpen, AlertTriangle, Download, Save } from 'lucide-react';
import { adminComplianceAPI } from '@/lib/api';
import { useAdminHubTab } from '@/hooks/useAdminHubTab';

type TabId = 'overview' | 'classification' | 'registration' | 'policies' | 'inventory' | 'certificates' | 'audit';

const TABS: Array<{ id: TabId; label: string; icon: any }> = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'classification', label: 'Classification', icon: ClipboardCheck },
  { id: 'registration', label: 'Registration', icon: FileText },
  { id: 'policies', label: 'Policies', icon: FolderOpen },
  { id: 'inventory', label: 'Data Inventory', icon: ClipboardCheck },
  { id: 'certificates', label: 'Certificate', icon: ShieldCheck },
  { id: 'audit', label: 'Audit & Export', icon: Download },
];

const splitTags = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const COMPLIANCE_TABS = ['overview', 'classification', 'registration', 'policies', 'inventory', 'certificates', 'audit'] as const;

export default function ComplianceCenter() {
  const { activeTab, setActiveTab } = useAdminHubTab<TabId>('compliance', 'overview', COMPLIANCE_TABS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [classificationQuestions, setClassificationQuestions] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [classificationAnswers, setClassificationAnswers] = useState<Record<string, boolean>>({});
  const [newPolicyTitle, setNewPolicyTitle] = useState('');
  const [newPolicyKey, setNewPolicyKey] = useState('');
  const [uploadingKey, setUploadingKey] = useState('');
  const [strictNCSAExport, setStrictNCSAExport] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [defsRes, profileRes] = await Promise.all([
        adminComplianceAPI.getDefinitions(),
        adminComplianceAPI.getProfile(),
      ]);
      setDefinitions(defsRes.definitions || []);
      setClassificationQuestions(defsRes.classificationQuestions || []);
      setProfile(profileRes.profile || {});
      setChecklist(profileRes.checklist || null);
      setClassificationAnswers(profileRes.profile?.classificationChecklistAnswers || {});
    } catch (e: any) {
      alert(e?.message || 'Failed to load compliance module');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const certificateStatus = useMemo(() => {
    if (!profile?.certificateExpiresAt) return { label: 'Missing', tone: 'bg-red-100 text-red-700' };
    const expiry = new Date(profile.certificateExpiresAt);
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Expired', tone: 'bg-red-100 text-red-700' };
    if (days <= 30) return { label: `Renew in ${days}d`, tone: 'bg-amber-100 text-amber-700' };
    return { label: 'Valid', tone: 'bg-emerald-100 text-emerald-700' };
  }, [profile?.certificateExpiresAt]);

  const saveProfile = async (next: any) => {
    setSaving(true);
    try {
      const res = await adminComplianceAPI.updateProfile(next);
      setProfile(res.profile);
      setChecklist(res.checklist);
    } catch (e: any) {
      alert(e?.message || 'Failed to save compliance profile');
    } finally {
      setSaving(false);
    }
  };

  const evaluateClassification = async () => {
    try {
      const res = await adminComplianceAPI.evaluateClassification({ answers: classificationAnswers });
      setProfile(res.profile);
    } catch (e: any) {
      alert(e?.message || 'Failed to evaluate classification');
    }
  };

  const exportPack = async () => {
    try {
      const res = await adminComplianceAPI.exportPack();
      const blob = new Blob([JSON.stringify(res.pack, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spacilly-compliance-pack-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Failed to export pack');
    }
  };

  const exportPackPdf = async () => {
    try {
      const blob = await adminComplianceAPI.exportPackPdf({ strict: strictNCSAExport });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spacilly-compliance-pack-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      if (e?.code === 'NCSA_STRICT_EXPORT_BLOCKED' && Array.isArray(e?.payload?.missingItems)) {
        alert(`NCSA strict export blocked:\n- ${e.payload.missingItems.join('\n- ')}`);
        return;
      }
      alert(e?.message || 'Failed to export PDF pack');
    }
  };

  const pickAndUpload = async (onUploaded: (url: string) => void, key: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingKey(key);
      try {
        const res = await adminComplianceAPI.uploadDocument(file);
        onUploaded(res.url);
      } catch (e: any) {
        alert(e?.message || 'Upload failed');
      } finally {
        setUploadingKey('');
      }
    };
    input.click();
  };

  if (loading || !profile) {
    return <div className="p-6 text-sm text-gray-500">Loading compliance module...</div>;
  }

  const renderOverview = () => (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs uppercase tracking-wide text-gray-500">Registration Status</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {profile.registrationStatus || 'not_started'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${certificateStatus.tone}`}>{certificateStatus.label}</span>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs uppercase tracking-wide text-gray-500">Role Classification</p>
        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {profile.classificationSummary?.result || 'undetermined'}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs uppercase tracking-wide text-gray-500">Readiness</p>
        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {checklist?.readyForSubmission ? 'Ready for submission' : 'Action required'}
        </p>
      </div>
      <div className="lg:col-span-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm font-semibold">Missing items</p>
        </div>
        <ul className="list-disc pl-5 text-sm text-amber-800">
          {(checklist?.missingRegistration || []).slice(0, 4).map((x: string) => <li key={x}>{x}</li>)}
          {(checklist?.missingPolicies || []).slice(0, 4).map((x: string) => <li key={x}>{x}</li>)}
          {checklist?.dpoMissing && <li>DPO details are incomplete.</li>}
          {checklist?.certificateMissing && <li>Certificate details are incomplete.</li>}
        </ul>
      </div>
      <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Key definitions</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {definitions.map((d) => (
            <div key={d.key} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
              <p className="font-semibold text-gray-900 dark:text-white">{d.title}</p>
              <p className="text-gray-600 dark:text-gray-300">{d.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClassification = () => (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Controller vs Processor checklist</h3>
      {classificationQuestions.map((q) => (
        <label key={q.key} className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={!!classificationAnswers[q.key]}
            onChange={(e) => setClassificationAnswers((prev) => ({ ...prev, [q.key]: e.target.checked }))}
          />
          {q.question}
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={evaluateClassification} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Evaluate
        </button>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
          Result: {profile.classificationSummary?.result || 'undetermined'}
        </span>
      </div>
    </div>
  );

  const renderRegistration = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          placeholder="Brand name for PDF (e.g. Spacilly)"
          value={profile.complianceProfile?.brandingName || ''}
          onChange={(e) =>
            setProfile((p: any) => ({
              ...p,
              complianceProfile: { ...(p.complianceProfile || {}), brandingName: e.target.value },
            }))
          }
        />
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="Brand logo URL (optional)"
            value={profile.complianceProfile?.brandingLogoUrl || ''}
            onChange={(e) =>
              setProfile((p: any) => ({
                ...p,
                complianceProfile: { ...(p.complianceProfile || {}), brandingLogoUrl: e.target.value },
              }))
            }
          />
          <button
            onClick={() =>
              pickAndUpload(
                (url) =>
                  setProfile((p: any) => ({
                    ...p,
                    complianceProfile: { ...(p.complianceProfile || {}), brandingLogoUrl: url },
                  })),
                'branding-logo'
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold"
          >
            {uploadingKey === 'branding-logo' ? 'Uploading...' : 'Upload logo'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          placeholder="Certificate number"
          value={profile.certificateNumber || ''}
          onChange={(e) => setProfile((p: any) => ({ ...p, certificateNumber: e.target.value }))}
        />
        <select
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          value={profile.registrationStatus || 'not_started'}
          onChange={(e) => setProfile((p: any) => ({ ...p, registrationStatus: e.target.value }))}
        >
          {['not_started', 'in_progress', 'submitted', 'registered', 'rejected', 'expired'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          value={profile.certificateIssuedAt ? new Date(profile.certificateIssuedAt).toISOString().slice(0, 10) : ''}
          onChange={(e) => setProfile((p: any) => ({ ...p, certificateIssuedAt: e.target.value || null }))}
        />
        <input
          type="date"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          value={profile.certificateExpiresAt ? new Date(profile.certificateExpiresAt).toISOString().slice(0, 10) : ''}
          onChange={(e) => setProfile((p: any) => ({ ...p, certificateExpiresAt: e.target.value || null }))}
        />
      </div>

      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">NCSA registration documents</h4>
      <div className="space-y-2">
        {(profile.registrationReadinessDocuments || []).map((doc: any, idx: number) => (
          <div key={`${doc.key}-${idx}`} className="grid gap-2 md:grid-cols-5">
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" value={doc.name} readOnly />
            <input
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 md:col-span-2"
              placeholder="Document URL"
              value={doc.url || ''}
              onChange={(e) =>
                setProfile((p: any) => {
                  const next = [...(p.registrationReadinessDocuments || [])];
                  next[idx] = { ...next[idx], url: e.target.value, status: e.target.value ? 'ready' : 'missing' };
                  return { ...p, registrationReadinessDocuments: next };
                })
              }
            />
            <select
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={doc.status || 'missing'}
              onChange={(e) =>
                setProfile((p: any) => {
                  const next = [...(p.registrationReadinessDocuments || [])];
                  next[idx] = { ...next[idx], status: e.target.value };
                  return { ...p, registrationReadinessDocuments: next };
                })
              }
            >
              {['missing', 'draft', 'ready', 'submitted', 'approved'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <button
              onClick={() =>
                pickAndUpload(
                  (url) =>
                    setProfile((p: any) => {
                      const next = [...(p.registrationReadinessDocuments || [])];
                      next[idx] = { ...next[idx], url, status: 'ready' };
                      return { ...p, registrationReadinessDocuments: next };
                    }),
                  `registration-${doc.key}`
                )
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold"
            >
              {uploadingKey === `registration-${doc.key}` ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Policy document manager</h4>
      {(profile.policyDocuments || []).map((doc: any, idx: number) => (
        <div key={`${doc.key}-${idx}`} className="grid gap-2 md:grid-cols-5">
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" value={doc.title || ''} readOnly />
          <input
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="Version"
            value={doc.version || ''}
            onChange={(e) =>
              setProfile((p: any) => {
                const next = [...(p.policyDocuments || [])];
                next[idx] = { ...next[idx], version: e.target.value };
                return { ...p, policyDocuments: next };
              })
            }
          />
          <input
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="URL"
            value={doc.url || ''}
            onChange={(e) =>
              setProfile((p: any) => {
                const next = [...(p.policyDocuments || [])];
                next[idx] = { ...next[idx], url: e.target.value };
                return { ...p, policyDocuments: next };
              })
            }
          />
          <select
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={doc.status || 'missing'}
            onChange={(e) =>
              setProfile((p: any) => {
                const next = [...(p.policyDocuments || [])];
                next[idx] = { ...next[idx], status: e.target.value };
                return { ...p, policyDocuments: next };
              })
            }
          >
            {['missing', 'draft', 'ready', 'published'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={() =>
              pickAndUpload(
                (url) =>
                  setProfile((p: any) => {
                    const next = [...(p.policyDocuments || [])];
                    next[idx] = { ...next[idx], url, status: next[idx]?.status === 'missing' ? 'draft' : next[idx]?.status };
                    return { ...p, policyDocuments: next };
                  }),
                `policy-${doc.key}`
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold"
          >
            {uploadingKey === `policy-${doc.key}` ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      ))}
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Policy key" value={newPolicyKey} onChange={(e) => setNewPolicyKey(e.target.value)} />
        <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 md:col-span-2" placeholder="Policy title" value={newPolicyTitle} onChange={(e) => setNewPolicyTitle(e.target.value)} />
        <button
          onClick={() => {
            if (!newPolicyKey || !newPolicyTitle) return;
            setProfile((p: any) => ({
              ...p,
              policyDocuments: [...(p.policyDocuments || []), { key: newPolicyKey, title: newPolicyTitle, status: 'draft' }],
            }));
            setNewPolicyKey('');
            setNewPolicyTitle('');
          }}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
        >
          Add policy
        </button>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Processing activities</h4>
      {(profile.processingActivities || []).map((a: any, idx: number) => (
        <div key={`${a.name}-${idx}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <input
            className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={a.name || ''}
            placeholder="Activity name"
            onChange={(e) =>
              setProfile((p: any) => {
                const next = [...(p.processingActivities || [])];
                next[idx] = { ...next[idx], name: e.target.value };
                return { ...p, processingActivities: next };
              })
            }
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Data types (comma-separated)" value={(a.dataTypes || []).join(', ')} onChange={(e) => setProfile((p: any) => { const next = [...(p.processingActivities || [])]; next[idx] = { ...next[idx], dataTypes: splitTags(e.target.value) }; return { ...p, processingActivities: next }; })} />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Data subjects" value={(a.dataSubjects || []).join(', ')} onChange={(e) => setProfile((p: any) => { const next = [...(p.processingActivities || [])]; next[idx] = { ...next[idx], dataSubjects: splitTags(e.target.value) }; return { ...p, processingActivities: next }; })} />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Purposes" value={(a.purposes || []).join(', ')} onChange={(e) => setProfile((p: any) => { const next = [...(p.processingActivities || [])]; next[idx] = { ...next[idx], purposes: splitTags(e.target.value) }; return { ...p, processingActivities: next }; })} />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Recipients" value={(a.recipients || []).join(', ')} onChange={(e) => setProfile((p: any) => { const next = [...(p.processingActivities || [])]; next[idx] = { ...next[idx], recipients: splitTags(e.target.value) }; return { ...p, processingActivities: next }; })} />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Special categories" value={(a.specialCategories || []).join(', ')} onChange={(e) => setProfile((p: any) => { const next = [...(p.processingActivities || [])]; next[idx] = { ...next[idx], specialCategories: splitTags(e.target.value) }; return { ...p, processingActivities: next }; })} />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Safeguards" value={a.safeguards || ''} onChange={(e) => setProfile((p: any) => { const next = [...(p.processingActivities || [])]; next[idx] = { ...next[idx], safeguards: e.target.value }; return { ...p, processingActivities: next }; })} />
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={!!a.transferOutsideRwanda}
              onChange={(e) =>
                setProfile((p: any) => {
                  const next = [...(p.processingActivities || [])];
                  next[idx] = { ...next[idx], transferOutsideRwanda: e.target.checked };
                  return { ...p, processingActivities: next };
                })
              }
            />
            Transfer outside Rwanda
          </label>
        </div>
      ))}
      <button
        onClick={() =>
          setProfile((p: any) => ({
            ...p,
            processingActivities: [
              ...(p.processingActivities || []),
              {
                name: '',
                dataTypes: [],
                dataSubjects: [],
                purposes: [],
                recipients: [],
                specialCategories: [],
                transferOutsideRwanda: false,
                safeguards: '',
              },
            ],
          }))
        }
        className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
      >
        Add activity
      </button>
    </div>
  );

  const renderCertificates = () => (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Certificate tracking and alerts</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-500">Status</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${certificateStatus.tone}`}>{certificateStatus.label}</span>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-500">Certificate number</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.certificateNumber || 'Not set'}</p>
        </div>
      </div>
      {profile.certificateExpiresAt && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Expiry date: {new Date(profile.certificateExpiresAt).toLocaleDateString()} - renew before expiry to avoid non-compliance.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Reminder configuration</h4>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={profile.reminderSettings?.enabled !== false}
              onChange={(e) =>
                setProfile((p: any) => ({
                  ...p,
                  reminderSettings: {
                    ...(p.reminderSettings || {}),
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            Enable reminders
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={profile.reminderSettings?.inAppEnabled !== false}
              onChange={(e) =>
                setProfile((p: any) => ({
                  ...p,
                  reminderSettings: {
                    ...(p.reminderSettings || {}),
                    inAppEnabled: e.target.checked,
                  },
                }))
              }
            />
            In-app alerts
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={!!profile.reminderSettings?.emailEnabled}
              onChange={(e) =>
                setProfile((p: any) => ({
                  ...p,
                  reminderSettings: {
                    ...(p.reminderSettings || {}),
                    emailEnabled: e.target.checked,
                  },
                }))
              }
            />
            Email alerts to admins
          </label>
          <input
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="Reminder days (e.g. 120,60,30,7)"
            value={(profile.reminderSettings?.daysBeforeExpiry || [90, 30, 7]).join(',')}
            onChange={(e) =>
              setProfile((p: any) => ({
                ...p,
                reminderSettings: {
                  ...(p.reminderSettings || {}),
                  daysBeforeExpiry: splitTags(e.target.value)
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n) && n > 0)
                    .map((n) => Math.round(n)),
                },
              }))
            }
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Reminders are sent once per stage and logged for audit.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Recent reminder logs</h4>
        <div className="space-y-2">
          {(profile.certificateReminderLogs || []).slice(-8).reverse().map((log: any, i: number) => (
            <div key={`${log.stage}-${i}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">{log.stage}</span>
              <span className="text-gray-600 dark:text-gray-300">{log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}</span>
            </div>
          ))}
          {(!profile.certificateReminderLogs || profile.certificateReminderLogs.length === 0) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">No reminders sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAuditExport = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Export registration pack</h3>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Generate a compliance-ready JSON pack containing profile data, policy status, readiness checklist, and legal definitions.
        </p>
        <div className="mb-4 grid gap-2 md:grid-cols-2">
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={strictNCSAExport}
              onChange={(e) => setStrictNCSAExport(e.target.checked)}
            />
            Official NCSA strict mode (block export when required docs are missing)
          </label>
        </div>
        <button
          onClick={exportPack}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
        >
          <Download className="h-4 w-4" />
          Export JSON pack
        </button>
        {(() => {
          const strictExport = strictNCSAExport;
          const pdfBlocked = strictExport && !checklist?.readyForSubmission;
          return (
            <>
              <button
                onClick={exportPackPdf}
                disabled={pdfBlocked}
                className="ml-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                title={pdfBlocked ? 'Complete checklist requirements to enable strict NCSA PDF export.' : 'Export PDF pack'}
              >
                <FileText className="h-4 w-4" />
                Export PDF pack
              </button>
              {pdfBlocked && (
                <p className="mt-2 text-xs text-amber-700">
                  PDF export is disabled because strict NCSA mode is enabled and checklist requirements are incomplete.
                </p>
              )}
            </>
          );
        })()}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Pre-export validator</h3>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Review NCSA completeness before exporting. Strict mode blocks PDF export when required items are missing.
        </p>
        <div className="mb-3 flex items-center gap-2">
          {(() => {
            const strictExport = strictNCSAExport;
            const ready = !!checklist?.readyForSubmission;
            const ok = !strictExport || ready;
            return (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {ok ? 'PDF export ready' : 'Blocked by strict mode'}
              </span>
            );
          })()}
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Checklist: {checklist?.readyForSubmission ? 'Ready for submission' : 'Action required'}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p className="mb-2 font-semibold text-gray-900 dark:text-white">Missing registration items</p>
            {(checklist?.missingRegistration || []).length > 0 ? (
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                {(checklist?.missingRegistration || []).map((x: string) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-700">No missing registration items.</p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p className="mb-2 font-semibold text-gray-900 dark:text-white">Missing policy items</p>
            {(checklist?.missingPolicies || []).length > 0 ? (
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                {(checklist?.missingPolicies || []).map((x: string) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-700">No missing policy items.</p>
            )}
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-gray-200 p-3 text-xs dark:border-gray-700">
          <p className="mb-1 font-semibold text-gray-900 dark:text-white">Other required checks</p>
          <div className="grid gap-1 text-gray-700 dark:text-gray-300 md:grid-cols-2">
            <p>Certificate details: {checklist?.certificateMissing ? 'Missing' : 'Complete'}</p>
            <p>DPO details: {checklist?.dpoMissing ? 'Missing' : 'Complete'}</p>
            <p>Processing activities: {checklist?.processingActivitiesMissing ? 'Missing' : 'Complete'}</p>
            <p>Third-party agreements: {checklist?.thirdPartyMissing ? 'Missing' : 'Complete'}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Audit logs</h3>
        <div className="space-y-2">
          {(profile.auditLogs || []).slice(-20).reverse().map((log: any, i: number) => (
            <div key={`${log.action}-${i}`} className="rounded-xl border border-gray-200 p-2 text-xs dark:border-gray-700">
              <p className="font-semibold text-gray-900 dark:text-white">{log.action}</p>
              <p className="text-gray-600 dark:text-gray-300">{log.details || '-'}</p>
              <p className="text-gray-500">{log.at ? new Date(log.at).toLocaleString() : '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const content = (() => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'classification':
        return renderClassification();
      case 'registration':
        return renderRegistration();
      case 'policies':
        return renderPolicies();
      case 'inventory':
        return renderInventory();
      case 'certificates':
        return renderCertificates();
      case 'audit':
        return renderAuditExport();
      default:
        return renderOverview();
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Data Protection & Privacy Compliance</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Rwanda NCSA controller/processor readiness, certificate tracking, and policy governance.
        </p>
      </div>

      <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        <div className="flex min-w-max gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {content}

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => void load()}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
        >
          Refresh
        </button>
        <button
          disabled={saving}
          onClick={() => void saveProfile(profile)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Save className="mr-2 inline h-4 w-4" />
          {saving ? 'Saving...' : 'Save Compliance Data'}
        </button>
      </div>
    </div>
  );
}

