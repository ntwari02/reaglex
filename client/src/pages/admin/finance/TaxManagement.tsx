import { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Search, MapPin, Percent, Globe, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { adminFinanceAPI } from '@/lib/api';

interface TaxRule {
  id: string;
  name: string;
  type: 'standard' | 'location_based' | 'product_based' | 'seller_based';
  rate: number;
  location?: string;
  category?: string;
  sellerId?: string;
  appliesTo: 'all' | 'products' | 'services' | 'shipping';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export default function TaxManagement() {
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFinanceAPI.getTaxRules().then((res) => {
      setTaxRules((res.taxRules || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        rate: r.rate,
        location: r.location,
        category: r.category,
        appliesTo: r.appliesTo || 'all',
        status: r.status || 'active',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : '',
      })));
    }).catch(() => setTaxRules([])).finally(() => setLoading(false));
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });
  const [formName, setFormName] = useState('');
  const [formRate, setFormRate] = useState<number>(0);
  const [formType, setFormType] = useState<TaxRule['type']>('standard');
  const [formAppliesTo, setFormAppliesTo] = useState<TaxRule['appliesTo']>('all');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    if (editingRule) {
      setFormName(editingRule.name);
      setFormRate(editingRule.rate);
      setFormType(editingRule.type);
      setFormAppliesTo(editingRule.appliesTo);
      setFormLocation(editingRule.location || '');
      setFormCategory(editingRule.category || '');
    } else if (showAddModal) {
      setFormName('');
      setFormRate(0);
      setFormType('standard');
      setFormAppliesTo('all');
      setFormLocation('');
      setFormCategory('');
    }
  }, [editingRule, showAddModal]);

  const filteredRules = taxRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || rule.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getTypeIcon = (type: TaxRule['type']) => {
    switch (type) {
      case 'location_based':
        return <MapPin className="h-4 w-4" />;
      case 'product_based':
        return <FileText className="h-4 w-4" />;
      case 'seller_based':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: TaxRule['type']) => {
    switch (type) {
      case 'standard':
        return 'Standard';
      case 'location_based':
        return 'Location Based';
      case 'product_based':
        return 'Product Based';
      case 'seller_based':
        return 'Seller Based';
      default:
        return type;
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleToggleStatus = (id: string) => {
    const rule = taxRules.find((r) => r.id === id);
    if (!rule) return;
    const newStatus = rule.status === 'active' ? 'inactive' : 'active';
    adminFinanceAPI.updateTaxRule(id, { status: newStatus }).then(() => {
      setTaxRules((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure tax rules and rates</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/40"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Tax Rule
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, location, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'bg-emerald-500 text-white' : ''}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('active')}
            className={filterStatus === 'active' ? 'bg-emerald-500 text-white' : ''}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'inactive' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('inactive')}
            className={filterStatus === 'inactive' ? 'bg-emerald-500 text-white' : ''}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Tax Rules Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Tax Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Applies To
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No tax rules found</p>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{rule.name}</div>
                        {rule.location && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{rule.location}</div>
                        )}
                        {rule.category && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">Category: {rule.category}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-emerald-500">{getTypeIcon(rule.type)}</div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{getTypeLabel(rule.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Percent className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{rule.rate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{rule.appliesTo}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(rule.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rule.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {rule.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Rules</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{taxRules.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active Rules</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {taxRules.filter(r => r.status === 'active').length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Average Rate</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {taxRules.length > 0
              ? (taxRules.reduce((sum, r) => sum + r.rate, 0) / taxRules.length).toFixed(1)
              : '0'}%
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Location Based</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {taxRules.filter(r => r.type === 'location_based').length}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRule) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingRule ? 'Edit Tax Rule' : 'Add Tax Rule'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Rule Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Standard VAT"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 18"
                  value={formRate}
                  onChange={(e) => setFormRate(Number(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TaxRule['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="location_based">Location Based</option>
                  <option value="product_based">Product Based</option>
                  <option value="seller_based">Seller Based</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Applies To
                </label>
                <select
                  value={formAppliesTo}
                  onChange={(e) => setFormAppliesTo(e.target.value as TaxRule['appliesTo'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="products">Products</option>
                  <option value="services">Services</option>
                  <option value="shipping">Shipping</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRule(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!formName.trim() || formSaving}
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-500 hover:to-cyan-500 text-white"
                onClick={() => {
                  setFormSaving(true);
                  const payload = {
                    name: formName.trim(),
                    rate: formRate,
                    type: formType,
                    appliesTo: formAppliesTo,
                    location: formLocation || undefined,
                    category: formCategory || undefined,
                  };
                  if (editingRule) {
                    adminFinanceAPI.updateTaxRule(editingRule.id, payload).then(() => {
                      setTaxRules((prev) => prev.map((r) => (r.id === editingRule.id ? { ...r, name: payload.name, rate: payload.rate, type: payload.type, appliesTo: payload.appliesTo, location: payload.location, category: payload.category } : r)));
                      setShowAddModal(false);
                      setEditingRule(null);
                      setFormSaving(false);
                    }).catch(() => setFormSaving(false));
                  } else {
                    adminFinanceAPI.createTaxRule(payload).then(() => {
                      adminFinanceAPI.getTaxRules().then((res) => {
                        setTaxRules((res.taxRules || []).map((r: any) => ({
                          id: r.id,
                          name: r.name,
                          type: r.type,
                          rate: r.rate,
                          location: r.location,
                          category: r.category,
                          appliesTo: r.appliesTo || 'all',
                          status: r.status || 'active',
                          createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
                          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : '',
                        })));
                      });
                      setShowAddModal(false);
                      setFormSaving(false);
                    }).catch(() => setFormSaving(false));
                  }
                }}
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={() => {
          if (confirmDialog.id) {
            adminFinanceAPI.deleteTaxRule(confirmDialog.id).then(() => {
              setTaxRules((prev) => prev.filter((rule) => rule.id !== confirmDialog.id));
            }).catch(() => {});
            setConfirmDialog({ isOpen: false, id: null });
          }
        }}
        title="Delete Tax Rule"
        message="Are you sure you want to delete this tax rule?"
        variant="danger"
      />
    </div>
  );
}
