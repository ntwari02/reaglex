import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react';
import { adminCollectionsAPI } from '@/lib/api';

interface Collection {
  id: string;
  title: string;
  type: 'manual' | 'automated';
  status: 'active' | 'draft';
  visibility: string;
  products: number;
  views: number;
  createdAt: string;
}

export default function CollectionsList() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminCollectionsAPI.getCollections({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        visibility: visibilityFilter !== 'all' ? visibilityFilter : undefined,
      });
      const list = (res.collections || []).map((c: any) => ({
        id: c.id || c._id,
        title: c.title || c.name || '',
        type: c.type === 'smart' ? 'automated' : (c.type || 'manual'),
        status: c.isDraft ? 'draft' : 'active',
        visibility: c.visibility || 'hidden',
        products: c.products ?? c.productCount ?? 0,
        views: c.views ?? 0,
        createdAt: c.createdAt || '',
      }));
      setCollections(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter, visibilityFilter]);

  useEffect(() => {
    const t = setTimeout(loadCollections, 300);
    return () => clearTimeout(t);
  }, [loadCollections]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await adminCollectionsAPI.deleteCollection(id);
      setSelectedCollections((prev) => prev.filter((i) => i !== id));
      loadCollections();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCollections.length} collection(s)?`)) return;
    try {
      await Promise.all(selectedCollections.map((id) => adminCollectionsAPI.deleteCollection(id)));
      setSelectedCollections([]);
      loadCollections();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleSetStatus = async (id: string, status: 'active' | 'draft') => {
    try {
      await adminCollectionsAPI.updateCollection(id, { status });
      loadCollections();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCollections.length === collections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(collections.map((c) => c.id));
    }
  };

  const getStatusBadge = (status: Collection['status']) => {
    return status === 'active' ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        Active
      </span>
    ) : (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Draft
      </span>
    );
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Collections List</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage all collections (from database)
          </p>
        </div>
        <a
          href="#create"
          onClick={(e) => { e.preventDefault(); document.querySelector('[data-tab="create"]')?.scrollIntoView?.({ behavior: 'smooth' }); }}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <span className="mr-2">+</span>
          Create Collection
        </a>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCollections()}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="manual">Manual</option>
          <option value="automated">Automated</option>
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Visibility</option>
          <option value="homepage">Homepage</option>
          <option value="hidden">Hidden</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedCollections.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {selectedCollections.length} collection(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400"
              >
                Delete
              </button>
              <button
                onClick={() => selectedCollections.forEach((id) => handleSetStatus(id, 'active'))}
                className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300"
              >
                Activate
              </button>
              <button
                onClick={() => selectedCollections.forEach((id) => handleSetStatus(id, 'draft'))}
                className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300"
              >
                Set Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={toggleSelectAll}
                  disabled={collections.length === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {selectedCollections.length === collections.length && collections.length ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Collection
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Products
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Views
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : collections.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  No collections found.
                </td>
              </tr>
            ) : (
              collections.map((collection) => (
                <tr key={collection.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleSelect(collection.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {selectedCollections.includes(collection.id) ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{collection.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {collection.visibility}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                      {collection.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(collection.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {collection.products}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {(collection.views ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === collection.id ? null : collection.id)
                      }
                      className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openDropdownId === collection.id && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                        <div className="py-1">
                          <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          <button
                            onClick={() => { handleSetStatus(collection.id, 'draft'); setOpenDropdownId(null); }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            <Archive className="h-4 w-4" />
                            Set Draft
                          </button>
                          <button
                            onClick={() => { handleDelete(collection.id); setOpenDropdownId(null); }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
