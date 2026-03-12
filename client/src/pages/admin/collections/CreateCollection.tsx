import { useState } from 'react';
import {
  Zap,
  FileText,
  Search,
  X,
  PlusCircle,
  GripVertical,
} from 'lucide-react';
import { adminCollectionsAPI } from '@/lib/api';

type CollectionType = 'manual' | 'automated';

export default function CreateCollection() {
  const [collectionType, setCollectionType] = useState<CollectionType>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [rules, setRules] = useState<Array<{ id: string; field: string; operator: string; value: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addRule = () => {
    setRules([
      ...rules,
      { id: Date.now().toString(), field: 'title', operator: 'contains', value: '' },
    ]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Enter a collection title');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const conditions = collectionType === 'automated'
        ? rules.map((r) => ({ type: 'product', field: r.field || 'title', operator: r.operator || 'contains', value: r.value }))
        : [];
      await adminCollectionsAPI.createCollection({
        name: title.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        type: collectionType,
        status: 'active',
        conditions,
        productIds: [],
        slug: slug.trim() || undefined,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
      });
      setSuccess(true);
      setTitle('');
      setDescription('');
      setSlug('');
      setSeoTitle('');
      setSeoDescription('');
      setRules([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create collection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tab="create">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Collection</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create a new manual or automated collection (saved to database)
        </p>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          Collection created successfully.
        </p>
      )}

      {/* Collection Type Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => setCollectionType('manual')}
          className={`rounded-2xl border-2 p-6 text-left transition-colors ${
            collectionType === 'manual'
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Manual Collection</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manually add and organize products
          </p>
        </button>

        <button
          onClick={() => setCollectionType('automated')}
          className={`rounded-2xl border-2 p-6 text-left transition-colors ${
            collectionType === 'automated'
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/40">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Automated Collection</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Auto-select products based on rules
          </p>
        </button>
      </div>

      {/* Collection Form */}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        {/* Basic Info */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
            Collection Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter collection title"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter collection description"
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Automated Rules */}
        {collectionType === 'automated' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                Collection Rules
              </label>
              <button
                onClick={addRule}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <PlusCircle className="h-4 w-4" />
                Add Rule
              </button>
            </div>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <select
                    value={rule.field}
                    onChange={(e) => setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, field: e.target.value } : r))}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="title">Product title contains</option>
                    <option value="type">Product type is</option>
                    <option value="price">Product price is</option>
                    <option value="tag">Product tag matches</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    value={rule.value}
                    onChange={(e) => setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r))}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Product Selection */}
        {collectionType === 'manual' && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
              Add Products
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products to add..."
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search and select products to add to this collection
              </p>
            </div>
          </div>
        )}

        {/* SEO Fields */}
        <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SEO Settings</h3>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="collection-slug"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Meta Title
            </label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO meta title"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Meta Description
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="SEO meta description"
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
          <button
            type="button"
            onClick={() => { setTitle(''); setDescription(''); setSlug(''); setSeoTitle(''); setSeoDescription(''); setError(null); setSuccess(false); }}
            className="rounded-xl border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={handleCreate}
            className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Collection'}
          </button>
        </div>
      </div>
    </div>
  );
}

