import React, { useState, useEffect } from 'react';
import { Shield, Edit } from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  description: string;
  allowed: string[];
}

export default function NotificationPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getPermissions();
      setPermissions(res.permissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load permissions');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Permissions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Control who can perform notification-related actions. Data from backend.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : permissions.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No permissions from the database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {permissions.map((permission) => (
            <div
              key={permission.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{permission.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(permission.allowed || []).map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
