import React, { useState, useEffect } from 'react';
import { Zap, Plus, Edit, Trash2, Play, Pause } from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

interface AutomationRule {
  id: string;
  name: string;
  condition: string;
  trigger: string;
  notificationType: string;
  status: 'active' | 'inactive';
}

export default function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getAutomationRules();
      setRules(res.rules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const getStatusBadge = (status: AutomationRule['status']) => {
    return status === 'active' ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        Active
      </span>
    ) : (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Automation Rules</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create automated notification triggers based on conditions. Data from backend.
          </p>
        </div>
        <button
          onClick={loadRules}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Zap className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No automation rules from the database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Type: {rule.notificationType}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Condition:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{rule.condition}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Trigger:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{rule.trigger}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">{getStatusBadge(rule.status)}</div>
                </div>
                <div className="flex gap-2">
                  {rule.status === 'active' ? (
                    <button
                      onClick={async () => {
                        try {
                          await adminNotificationsAPI.updateAutomationRule(rule.id, { status: 'inactive' });
                          loadRules();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed');
                        }
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-400 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Pause className="mr-1 inline h-4 w-4" />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await adminNotificationsAPI.updateAutomationRule(rule.id, { status: 'active' });
                          loadRules();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed');
                        }
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Play className="mr-1 inline h-4 w-4" />
                      Activate
                    </button>
                  )}
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <Edit className="mr-1 inline h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this rule?')) return;
                      try {
                        await adminNotificationsAPI.deleteAutomationRule(rule.id);
                        loadRules();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Delete failed');
                      }
                    }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
