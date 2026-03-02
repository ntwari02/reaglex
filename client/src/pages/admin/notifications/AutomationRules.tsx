import React, { useState } from 'react';
import { Zap, Plus, Edit, Trash2, Play, Pause, CheckCircle, XCircle } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  condition: string;
  trigger: string;
  notificationType: string;
  status: 'active' | 'inactive';
}

const mockRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Order Pending Reminder',
    condition: 'Order pending for 24 hours',
    trigger: 'Send reminder email',
    notificationType: 'email',
    status: 'active',
  },
  {
    id: '2',
    name: 'Low Stock Alert',
    condition: 'Stock below 10 units',
    trigger: 'Notify seller',
    notificationType: 'push',
    status: 'active',
  },
  {
    id: '3',
    name: 'Inactive User Coupon',
    condition: 'User inactive for 30 days',
    trigger: 'Send coupon code',
    notificationType: 'email',
    status: 'inactive',
  },
];

export default function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>(mockRules);
  const [showAddModal, setShowAddModal] = useState(false);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Automation Rules</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create automated notification triggers based on conditions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Create Rule
        </button>
      </div>

      {/* Rules List */}
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
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {rule.condition}
                    </span>
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
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-400 dark:border-gray-700 dark:text-gray-300">
                    <Pause className="mr-1 inline h-4 w-4" />
                    Deactivate
                  </button>
                ) : (
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <Play className="mr-1 inline h-4 w-4" />
                    Activate
                  </button>
                )}
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

