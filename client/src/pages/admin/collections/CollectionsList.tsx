import React, { useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Eye,
  EyeOff,
  Download,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Collection {
  id: string;
  title: string;
  type: 'manual' | 'automated';
  status: 'active' | 'draft';
  visibility: 'homepage' | 'hidden' | 'scheduled';
  products: number;
  views: number;
  createdAt: string;
}

const mockCollections: Collection[] = [
  {
    id: '1',
    title: 'Summer Sale',
    type: 'manual',
    status: 'active',
    visibility: 'homepage',
    products: 45,
    views: 12500,
    createdAt: '2024-03-01',
  },
  {
    id: '2',
    title: 'New Arrivals',
    type: 'automated',
    status: 'active',
    visibility: 'homepage',
    products: 32,
    views: 9800,
    createdAt: '2024-03-05',
  },
  {
    id: '3',
    title: 'Best Sellers',
    type: 'automated',
    status: 'draft',
    visibility: 'hidden',
    products: 28,
    views: 8700,
    createdAt: '2024-03-10',
  },
];

export default function CollectionsList() {
  const [collections, setCollections] = useState<Collection[]>(mockCollections);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const filteredCollections = collections.filter((collection) => {
    const matchesSearch = collection.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || collection.status === statusFilter;
    const matchesType = typeFilter === 'all' || collection.type === typeFilter;
    const matchesVisibility =
      visibilityFilter === 'all' || collection.visibility === visibilityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesVisibility;
  });

  const toggleSelect = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCollections.length === filteredCollections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(filteredCollections.map((c) => c.id));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Collections List</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage all collections
          </p>
        </div>
        <button className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
          <span className="mr-2">+</span>
          Create Collection
        </button>
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
              <button className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300">
                Delete
              </button>
              <button className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300">
                Archive
              </button>
              <button className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300">
                Activate
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
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                  {selectedCollections.length === filteredCollections.length ? (
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
            {filteredCollections.map((collection) => (
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
                  {collection.views.toLocaleString()}
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
                        <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                          <Archive className="h-4 w-4" />
                          Archive
                        </button>
                        <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

