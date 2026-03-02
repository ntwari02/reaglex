import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  roles: {
    admin: boolean;
    manager: boolean;
    editor: boolean;
  };
}

const mockPermissions: Permission[] = [
  {
    id: '1',
    name: 'Create Collections',
    description: 'Allow creating new collections',
    roles: { admin: true, manager: true, editor: false },
  },
  {
    id: '2',
    name: 'Edit Collections',
    description: 'Allow editing existing collections',
    roles: { admin: true, manager: true, editor: true },
  },
  {
    id: '3',
    name: 'Delete Collections',
    description: 'Allow deleting collections',
    roles: { admin: true, manager: false, editor: false },
  },
  {
    id: '4',
    name: 'Modify Rules',
    description: 'Allow changing automated collection rules',
    roles: { admin: true, manager: true, editor: false },
  },
  {
    id: '5',
    name: 'Change Homepage Display',
    description: 'Allow modifying homepage collections',
    roles: { admin: true, manager: false, editor: false },
  },
  {
    id: '6',
    name: 'View Analytics',
    description: 'Allow viewing collection analytics',
    roles: { admin: true, manager: true, editor: true },
  },
];

export default function PermissionsAccessControl() {
  const [permissions, setPermissions] = useState<Permission[]>(mockPermissions);

  const togglePermission = (permissionId: string, role: keyof Permission['roles']) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === permissionId ? { ...p, roles: { ...p.roles, [role]: !p.roles[role] } } : p
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Permissions & Access Control
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Control who can perform collection management actions
        </p>
      </div>

      {/* Permissions Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Permission
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Admin
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Manager
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Editor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {permissions.map((permission) => (
              <tr key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {permission.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {permission.description}
                    </p>
                  </div>
                </td>
                {(['admin', 'manager', 'editor'] as const).map((role) => (
                  <td key={role} className="px-6 py-4 text-center">
                    <button
                      onClick={() => togglePermission(permission.id, role)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {permission.roles[role] ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

