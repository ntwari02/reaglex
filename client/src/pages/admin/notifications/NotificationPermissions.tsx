import React, { useState } from 'react';
import { Shield, Users, CheckCircle, XCircle } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  allowed: string[];
}

const mockPermissions: Permission[] = [
  {
    id: '1',
    name: 'Create Notifications',
    description: 'Allow creating new notifications',
    allowed: ['Admin', 'Manager'],
  },
  {
    id: '2',
    name: 'Send Broadcasts',
    description: 'Allow sending broadcast notifications',
    allowed: ['Admin'],
  },
  {
    id: '3',
    name: 'Edit Templates',
    description: 'Allow editing notification templates',
    allowed: ['Admin', 'Manager'],
  },
  {
    id: '4',
    name: 'Manage Integrations',
    description: 'Allow managing integration settings',
    allowed: ['Admin'],
  },
  {
    id: '5',
    name: 'View Logs',
    description: 'Allow viewing notification logs',
    allowed: ['Admin', 'Manager', 'Support'],
  },
];

export default function NotificationPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>(mockPermissions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Permissions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Control who can perform notification-related actions
        </p>
      </div>

      {/* Permissions List */}
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {permission.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {permission.allowed.map((role) => (
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
    </div>
  );
}

