import React, { useState } from 'react';
import { Shield, Users, Plus, Edit, CheckCircle, XCircle } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  permissions: {
    manageDrivers: boolean;
    viewOrders: boolean;
    editOrders: boolean;
    manageWarehouses: boolean;
    editShippingRates: boolean;
    viewAnalytics: boolean;
  };
  userCount: number;
}

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Logistics Manager',
    permissions: {
      manageDrivers: true,
      viewOrders: true,
      editOrders: true,
      manageWarehouses: true,
      editShippingRates: true,
      viewAnalytics: true,
    },
    userCount: 3,
  },
  {
    id: '2',
    name: 'Warehouse Staff',
    permissions: {
      manageDrivers: false,
      viewOrders: true,
      editOrders: false,
      manageWarehouses: true,
      editShippingRates: false,
      viewAnalytics: false,
    },
    userCount: 8,
  },
  {
    id: '3',
    name: 'Driver Coordinator',
    permissions: {
      manageDrivers: true,
      viewOrders: true,
      editOrders: false,
      manageWarehouses: false,
      editShippingRates: false,
      viewAnalytics: false,
    },
    userCount: 2,
  },
];

export default function AccessControl() {
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Control</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage user roles and permissions for logistics operations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Add Role
        </button>
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {role.userCount} users assigned
                  </p>
                </div>
              </div>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Edit className="mr-1 inline h-4 w-4" />
                Edit
              </button>
            </div>

            {/* Permissions */}
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(role.permissions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  {value ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

