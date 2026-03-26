import React, { useState, useEffect } from 'react';
import { 
  Plus, Filter, MoreVertical, Eye, Copy, 
  Download, Upload, Trash2, Star, Package, Search,
  X, Check, ExternalLink, Edit,
  Grid3x3, List, Image as ImageIcon, GripVertical, Home, Layout, Monitor
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Collection, CollectionCondition, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { updateCollection } from '@/lib/collections';
import { API_BASE_URL, resolveAssetUrl } from '@/lib/config';

const SELLER_COLLECTIONS_API = `${API_BASE_URL}/seller/collections`;
const SELLER_INVENTORY_API = `${API_BASE_URL}/seller/inventory`;

export default function CollectionManagement() {
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerRestrictions, setSellerRestrictions] = useState({
    maxCollections: 10,
    currentCollections: 6,
    canCreateAutomated: true,
    canCreateManual: true,
  });
  
  // Advanced filtering
  const [filters, setFilters] = useState({
    status: 'all', // all, active, inactive, draft
    type: 'all', // all, smart, manual
    featured: 'all', // all, featured, not_featured
    productCount: 'all', // all, 0-10, 11-50, 51-100, 100+
    dateRange: 'all', // all, today, week, month, year
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('recently_updated'); // a-z, z-a, most_products, least_products, recently_updated, oldest
  
  // Bulk actions
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Quick actions
  const [quickActionMenu, setQuickActionMenu] = useState<string | null>(null);
  const [menuOpenUpward, setMenuOpenUpward] = useState<{ [key: string]: boolean }>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCollection, setPreviewCollection] = useState<Collection | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(SELLER_COLLECTIONS_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.status === 403) {
        window.location.href = '/';
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load collections');
      }

      const data = await res.json();
      const mapped: Collection[] = (data.collections || []).map((c: any) => ({
        id: c._id,
        seller_id: c.sellerId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image_url: c.imageUrl,
        cover_image_url: c.coverImageUrl,
        type: c.type,
        sort_order: c.sortOrder,
        visibility: {
          storefront: c.visibility?.storefront ?? true,
          mobile_app: c.visibility?.mobile_app ?? true,
        },
        is_active: c.isActive,
        is_featured: c.isFeatured,
        is_draft: c.isDraft ?? true, // Default to draft if not set
        conditions: c.conditions || [],
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        product_count: c.productCount ?? 0,
      }));

      setCollections(mapped);
      setSellerRestrictions(prev => ({
        ...prev,
        currentCollections: mapped.length,
      }));
    } catch (error: any) {
      console.error('Failed to load collections', error);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const res = await fetch(`${SELLER_COLLECTIONS_API}/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.message || 'Failed to delete collection');
          }

          toast({
            title: 'Success',
            description: 'Collection deleted successfully',
          });
          loadCollections();
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete collection',
            variant: 'destructive',
          });
        }
      },
    });
  };

  // Apply filters and sorting
  const filteredAndSortedCollections = React.useMemo(() => {
    let filtered = collections.filter((collection) => {
      // Search filter
      if (searchTerm && !collection.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !collection.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filters.status === 'active' && !collection.is_active) return false;
      if (filters.status === 'inactive' && collection.is_active) return false;
      if (filters.status === 'draft' && !(collection as any).is_draft) return false;
      
      // Type filter
      if (filters.type === 'smart' && collection.type !== 'smart') return false;
      if (filters.type === 'manual' && collection.type !== 'manual') return false;
      
      // Featured filter
      if (filters.featured === 'featured' && !collection.is_featured) return false;
      if (filters.featured === 'not_featured' && collection.is_featured) return false;
      
      // Product count filter
      const productCount = collection.product_count || 0;
      if (filters.productCount === '0-10' && (productCount < 0 || productCount > 10)) return false;
      if (filters.productCount === '11-50' && (productCount < 11 || productCount > 50)) return false;
      if (filters.productCount === '51-100' && (productCount < 51 || productCount > 100)) return false;
      if (filters.productCount === '100+' && productCount < 100) return false;
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const createdDate = new Date(collection.created_at);
        const now = new Date();
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (filters.dateRange === 'today' && diffDays > 1) return false;
        if (filters.dateRange === 'week' && diffDays > 7) return false;
        if (filters.dateRange === 'month' && diffDays > 30) return false;
        if (filters.dateRange === 'year' && diffDays > 365) return false;
      }
      
      return true;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'a-z':
          return a.name.localeCompare(b.name);
        case 'z-a':
          return b.name.localeCompare(a.name);
        case 'most_products':
          return (b.product_count || 0) - (a.product_count || 0);
        case 'least_products':
          return (a.product_count || 0) - (b.product_count || 0);
        case 'recently_updated':
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [collections, searchTerm, filters, sortBy]);
  
  const filteredCollections = filteredAndSortedCollections;

  const handlePreviewCollection = (collection: Collection) => {
    if (!collection.is_active && !(collection as any).is_draft) {
      toast({
        title: 'Info',
        description: 'This collection is inactive and may not be visible to customers',
      });
    }
    setPreviewCollection(collection);
    setShowPreviewModal(true);
  };

  const handleDuplicateCollection = async (collection: Collection) => {
    try {
      // Generate unique slug
      let newSlug = `${collection.slug || collection.name.toLowerCase().replace(/\s+/g, '-')}-copy`;
      let counter = 1;
      
      // Check for existing slug using backend API
      while (true) {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${SELLER_COLLECTIONS_API}?slug=${newSlug}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          const existing = data.collections?.find((c: Collection) => c.slug === newSlug);
          if (!existing) break;
        } else {
          break; // If check fails, proceed anyway
        }
        
        newSlug = `${collection.slug || collection.name.toLowerCase().replace(/\s+/g, '-')}-copy-${counter}`;
        counter++;
      }

      // Create duplicate collection via backend API
      const token = localStorage.getItem('auth_token');
      const payload: any = {
        name: `${collection.name} (Copy)`,
        description: collection.description,
        type: collection.type,
        slug: newSlug,
        image_url: collection.image_url,
        cover_image_url: collection.cover_image_url,
        sort_order: collection.sort_order,
        is_active: false,
        is_featured: false,
        is_draft: true,
        is_trending: (collection as any).is_trending || false,
        is_seasonal: (collection as any).is_seasonal || false,
        is_sale: (collection as any).is_sale || false,
        visibility: collection.visibility,
        seo_title: collection.seo_title,
        seo_description: collection.seo_description,
        conditions: collection.type === 'smart' ? collection.conditions : [],
        product_ids: collection.type === 'manual' ? ((collection as any).product_ids || []) : [],
        placement: (collection as any).placement,
        placement_priority: (collection as any).placement_priority || 0,
      };

      const res = await fetch(SELLER_COLLECTIONS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to duplicate collection');
      }

      const data = await res.json();
      const createdCollection = data.collection;

      // If it's a manual collection, copy products
      if (collection.type === 'manual' && createdCollection && (collection as any).product_ids?.length > 0) {
        try {
          const productIds = (collection as any).product_ids;
          
          // Add products to the new collection one by one
          for (const productId of productIds) {
            const addRes = await fetch(`${SELLER_COLLECTIONS_API}/${createdCollection._id || createdCollection.id}/products`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: 'include',
              body: JSON.stringify({ product_id: productId }),
            });
            
            if (!addRes.ok) {
              console.warn(`Failed to add product ${productId} to duplicate collection`);
            }
          }
        } catch (error) {
          console.error('Error copying products to duplicate:', error);
          // Continue even if product copying fails
        }
      }
      
      toast({
        title: 'Success',
        description: 'Collection duplicated successfully',
      });
      loadCollections();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate collection',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCollections.length === 0) return;

    try {
      switch (action) {
        case 'delete': {
          setConfirmDialog({
            isOpen: true,
            title: 'Delete Collections',
            message: `Are you sure you want to delete ${selectedCollections.length} collection(s)?`,
            onConfirm: async () => {
              try {
                const token = localStorage.getItem('auth_token');
                await Promise.all(
                  selectedCollections.map((id) =>
                    fetch(`${SELLER_COLLECTIONS_API}/${id}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      credentials: 'include',
                    })
                  )
                );
                toast({
                  title: 'Success',
                  description: `${selectedCollections.length} collection(s) deleted`,
                });
                setSelectedCollections([]);
                loadCollections();
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.message || 'Failed to delete collections',
                  variant: 'destructive',
                });
              }
            },
          });
          break;
        }
        case 'feature': {
          const token = localStorage.getItem('auth_token');
          await Promise.all(
            selectedCollections.map((id) =>
              fetch(`${SELLER_COLLECTIONS_API}/${id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ is_featured: true }),
              })
            )
          );
          toast({
            title: 'Success',
            description: `${selectedCollections.length} collection(s) marked as featured`,
          });
          loadCollections();
          break;
        }
        case 'publish': {
          const token = localStorage.getItem('auth_token');
          const results = await Promise.allSettled(
            selectedCollections.map((id) =>
              fetch(`${SELLER_COLLECTIONS_API}/${id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ is_draft: false }),
              })
            )
          );
          
          const errors = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
          if (errors.length > 0) {
            const errorData = await Promise.all(
              errors.map(async (e) => {
                if (e.status === 'fulfilled') {
                  const data = await e.value.json().catch(() => null);
                  return data?.message || 'Unknown error';
                }
                return 'Network error';
              })
            );
            toast({
              title: 'Error',
              description: `Some collections could not be published: ${errorData.join(', ')}`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Success',
              description: `${selectedCollections.length} collection(s) published`,
            });
          }
          loadCollections();
          break;
        }
        case 'unpublish': {
          const token = localStorage.getItem('auth_token');
          await Promise.all(
            selectedCollections.map((id) =>
              fetch(`${SELLER_COLLECTIONS_API}/${id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ is_draft: true }),
              })
            )
          );
          toast({
            title: 'Success',
            description: `${selectedCollections.length} collection(s) unpublished`,
          });
          loadCollections();
          break;
        }
        case 'duplicate':
          toast({
            title: 'Info',
            description: 'Duplication feature coming soon',
          });
          break;
        case 'export':
          exportCollectionsToCSV(selectedCollections);
          break;
      }
      loadCollections();
      setSelectedCollections([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk action',
        variant: 'destructive',
      });
    }
  };

  const exportCollectionsToCSV = (collectionIds: string[]) => {
    const selected = collections.filter(c => collectionIds.includes(c.id));
    const csv = [
      ['Name', 'Type', 'Status', 'Products', 'Featured', 'Created At'].join(','),
      ...selected.map(c => [
        c.name,
        c.type,
        c.is_active ? 'Active' : 'Inactive',
        c.product_count || 0,
        c.is_featured ? 'Yes' : 'No',
        new Date(c.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collections-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Collections exported to CSV',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collections</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Organize your products into collections for better organization and discovery
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12">
                <svg className="transform -rotate-90 w-12 h-12">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${(sellerRestrictions.currentCollections / sellerRestrictions.maxCollections) * 125.6} 125.6`}
                    className="text-blue-600 dark:text-blue-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {Math.round((sellerRestrictions.currentCollections / sellerRestrictions.maxCollections) * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {sellerRestrictions.currentCollections} / {sellerRestrictions.maxCollections} collections used
                </div>
                {sellerRestrictions.currentCollections >= sellerRestrictions.maxCollections && (
                  <a
                    href="/seller/subscription"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Upgrade plan to add more →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => setShowCreateModal(true)}
          disabled={sellerRestrictions.currentCollections >= sellerRestrictions.maxCollections}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Collection
          {sellerRestrictions.currentCollections >= sellerRestrictions.maxCollections && (
            <span className="ml-2 text-xs opacity-75">(Limit reached)</span>
          )}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).some(v => v !== 'all') && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {Object.values(filters).filter(v => v !== 'all').length}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="a-z">A-Z</option>
              <option value="z-a">Z-A</option>
              <option value="most_products">Most Products</option>
              <option value="least_products">Least Products</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="smart">Smart</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Featured
              </label>
              <select
                value={filters.featured}
                onChange={(e) => setFilters({ ...filters, featured: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="featured">Featured</option>
                <option value="not_featured">Not Featured</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Products
              </label>
              <select
                value={filters.productCount}
                onChange={(e) => setFilters({ ...filters, productCount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="0-10">0-10</option>
                <option value="11-50">11-50</option>
                <option value="51-100">51-100</option>
                <option value="100+">100+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedCollections.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCollections.length} collection{selectedCollections.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('feature')}
              >
                <Star className="h-4 w-4 mr-1" />
                Mark Featured
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('publish')}
              >
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('unpublish')}
              >
                Unpublish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('duplicate')}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('export')}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCollections([])}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No collections match your search</p>
          <Button onClick={() => setSearchTerm('')} variant="outline" className="mr-2">
            Clear Search
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowCreateModal(true)} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
          {filteredCollections.map((collection) => {
            // Mock analytics data (per collection) for the seller dashboard demo
            const sales = Math.floor(Math.random() * 50000) + 1000;
            const views = Math.floor(Math.random() * 10000) + 100;
            const orders = Math.floor(Math.random() * 450) + 50;
            const aov = orders > 0 ? sales / orders : 0;
            const analytics = {
              sales,
              views,
              orders,
              aov,
              conversionRate: (Math.random() * 5 + 1).toFixed(2),
              clickThroughRate: (Math.random() * 10 + 2).toFixed(1),
            };

            return (
            <div
              key={collection.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-visible relative"
            >
              {/* Checkbox for bulk selection */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedCollections.includes(collection.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCollections([...selectedCollections, collection.id]);
                    } else {
                      setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
                    }
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              {collection.cover_image_url || collection.image_url ? (
                <img
                  src={collection.cover_image_url || collection.image_url}
                  alt={collection.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">
                    {collection.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {collection.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    collection.type === 'smart'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {collection.type === 'smart' ? 'Automated' : 'Manual'}
                  </span>
                </div>
                {collection.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{collection.product_count || 0} products</span>
                  <div className="flex gap-1">
                    {(collection as any).is_draft ? (
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                        Draft
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                        Published
                      </span>
                    )}
                    {collection.is_featured && (
                      <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                        Featured
                      </span>
                    )}
                    {(collection as any).is_trending && (
                      <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                        Trending
                      </span>
                    )}
                    {(collection as any).is_seasonal && (
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                        Seasonal
                      </span>
                    )}
                    {(collection as any).is_sale && (
                      <span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                        Sale
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded ${
                      collection.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {collection.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                {/* Analytics */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Sales</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${analytics.sales.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Views</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {analytics.views.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Conversion</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {analytics.conversionRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Avg. Order Value</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${analytics.aov.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Orders</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {analytics.orders.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">CTR</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {analytics.clickThroughRate}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCollection(collection);
                      setShowProductsModal(true);
                    }}
                    className="flex-1"
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Manage Products
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `/collections/${collection.slug || collection.name.toLowerCase().replace(/\s+/g, '-')}`;
                      window.open(url, '_blank');
                    }}
                    className="flex-1"
                    title="View collection page"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Page
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const button = e.currentTarget;
                        const rect = button.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const spaceBelow = viewportHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        const menuHeight = 200; // Approximate height of the menu
                        
                        // If there's not enough space below but enough space above, open upward
                        const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > menuHeight;
                        setMenuOpenUpward(prev => ({ ...prev, [collection.id]: shouldOpenUpward }));
                        setQuickActionMenu(quickActionMenu === collection.id ? null : collection.id);
                      }}
                      className="z-10"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {quickActionMenu === collection.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-[100]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickActionMenu(null);
                          }}
                        />
                        <div 
                          className={`absolute right-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[101] ${
                            menuOpenUpward[collection.id] 
                              ? 'bottom-full mb-1' 
                              : 'top-full mt-1'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedCollection(collection);
                              setShowEditModal(true);
                              setQuickActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handlePreviewCollection(collection);
                              setQuickActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setQuickActionMenu(null);
                              await handleDuplicateCollection(collection);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              try {
                                const newStatus = !collection.is_active;
                                const { error } = await updateCollection(collection.id, { is_active: newStatus });
                                if (error) throw error;
                                toast({
                                  title: 'Success',
                                  description: `Collection ${newStatus ? 'shown' : 'hidden'} successfully`,
                                });
                                setQuickActionMenu(null);
                                loadCollections();
                              } catch (error: any) {
                                toast({
                                  title: 'Error',
                                  description: error.message || 'Failed to update collection',
                                  variant: 'destructive',
                                });
                                setQuickActionMenu(null);
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            {collection.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setQuickActionMenu(null);
                              await handleDelete(collection.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}


      {/* Create/Edit Collection Modal */}
      {(showCreateModal || showEditModal) && (
        <CollectionFormModal
          collection={showEditModal ? selectedCollection : undefined}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedCollection(null);
          }}
          onSuccess={() => {
            loadCollections();
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedCollection(null);
          }}
          sellerId={undefined}
        />
      )}

      {/* Manage Products Modal */}
      {showProductsModal && selectedCollection && (
        <CollectionProductsModal
          collection={selectedCollection}
          onClose={() => {
            setShowProductsModal(false);
            setSelectedCollection(null);
          }}
          onSuccess={loadCollections}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
      />

      {/* Collection Preview Modal */}
      {showPreviewModal && previewCollection && (
        <CollectionPreviewModal
          collection={previewCollection}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewCollection(null);
          }}
          onViewProduct={(product) => {
            setSelectedProduct(product);
            setShowProductModal(true);
          }}
        />
      )}

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Collection Form Modal Component
function CollectionFormModal({
  collection,
  onClose,
  onSuccess,
  sellerId: _sellerId,
}: {
  collection?: Collection | null;
  onClose: () => void;
  onSuccess: () => void;
  sellerId?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: collection?.name || '',
    description: collection?.description || '',
    type: collection?.type || ('manual' as 'manual' | 'smart'),
    slug: collection?.slug || '',
    image_url: collection?.image_url || '',
    cover_image_url: collection?.cover_image_url || '',
    sort_order: collection?.sort_order || 'manual',
    is_active: collection?.is_active ?? true,
    is_featured: collection?.is_featured ?? false,
    is_draft: collection ? ((collection as any)?.is_draft ?? false) : true, // Default to draft for new collections
    is_trending: (collection as any)?.is_trending ?? false,
    is_seasonal: (collection as any)?.is_seasonal ?? false,
    is_sale: (collection as any)?.is_sale ?? false,
    visibility: collection?.visibility || { storefront: true, mobile_app: true },
    seo_title: collection?.seo_title || '',
    seo_description: collection?.seo_description || '',
    conditions: collection?.conditions || ([] as CollectionCondition[]),
    product_ids: (collection as any)?.product_ids || [],
    published_at: collection?.published_at || new Date().toISOString().split('T')[0],
    scheduled_publish_at: collection?.scheduled_publish_at?.split('T')[0] || '',
    placement: (collection as any)?.placement || {
      homepage_banner: false,
      homepage_featured: false,
      homepage_tabs: false,
      category_page: false,
      navigation_menu: false,
    },
    placement_priority: (collection as any)?.placement_priority || 0,
  });

  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [newCondition, setNewCondition] = useState<CollectionCondition>({
    type: 'tag',
    operator: 'contains',
    value: '',
  });
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Product selection for manual collections
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [_coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [_thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);

  // Initialize selected product IDs from formData
  useEffect(() => {
    if (formData.product_ids && formData.product_ids.length > 0) {
      setSelectedProductIds(formData.product_ids);
    }
  }, []);

  // Load products for manual collection selection
  useEffect(() => {
    if (formData.type === 'manual') {
      loadAvailableProducts();
      if (collection && !formData.product_ids?.length) {
        loadCollectionProductIds();
      }
    }
  }, [formData.type, collection]);

  const loadAvailableProducts = async () => {
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_INVENTORY_API}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load products');
      }

      const data = await res.json();
      const mappedProducts = (data.products || []).map((p: any) => ({
        id: p._id || p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        sku: p.sku,
        status: p.status,
        images: p.images || [],
        description: p.description,
      }));

      setAvailableProducts(mappedProducts);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setAvailableProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCollectionProductIds = async () => {
    if (!collection) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_COLLECTIONS_API}/${collection.id}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const productIds = (data.products || []).map((p: any) => p._id || p.id);
        setSelectedProductIds(productIds);
        setFormData(prev => ({ ...prev, product_ids: productIds }));
      }
    } catch (error: any) {
      console.error('Error loading collection products:', error);
    }
  };

  const handleAddProductToForm = (productId: string) => {
    if (!selectedProductIds.includes(productId)) {
      const newIds = [...selectedProductIds, productId];
      setSelectedProductIds(newIds);
      setFormData(prev => ({ ...prev, product_ids: newIds }));
    }
  };

  const handleRemoveProductFromForm = (productId: string) => {
    const newIds = selectedProductIds.filter(id => id !== productId);
    setSelectedProductIds(newIds);
    setFormData(prev => ({ ...prev, product_ids: newIds }));
  };

  const filteredAvailableProducts = availableProducts.filter(p => {
    const matchesSearch = !productSearchTerm || 
      p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase());
    return matchesSearch && !selectedProductIds.includes(p.id);
  });

  const selectedProducts = availableProducts.filter(p => selectedProductIds.includes(p.id));

  const coverImageInputRef = React.useRef<HTMLInputElement>(null);
  const thumbnailImageInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, type: 'cover' | 'thumbnail') => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImages(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      
      if (type === 'cover') {
        formData.append('cover_image', file);
        setCoverImageFile(file);
      } else {
        formData.append('thumbnail_image', file);
        setThumbnailImageFile(file);
      }

      console.log('Uploading image:', { type, fileName: file.name, fileSize: file.size });

      const res = await fetch(`${SELLER_COLLECTIONS_API}/upload-images`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Don't set Content-Type header - let browser set it with boundary for FormData
        },
        credentials: 'include',
        body: formData,
      });

      console.log('Upload response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to upload image' }));
        console.error('Upload error response:', errorData);
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await res.json();
      console.log('Upload success response:', data);
      
      if (type === 'cover' && data.cover_image_url) {
        setFormData(prev => ({ ...prev, cover_image_url: resolveAssetUrl(data.cover_image_url) }));
      } else if (type === 'thumbnail' && data.thumbnail_image_url) {
        setFormData(prev => ({ ...prev, image_url: resolveAssetUrl(data.thumbnail_image_url) }));
      }

      // Reset file input so same file can be selected again if needed
      if (type === 'cover' && coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
      if (type === 'thumbnail' && thumbnailImageInputRef.current) {
        thumbnailImageInputRef.current.value = '';
      }

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for automated collections
    if (formData.type === 'smart') {
      if (formData.conditions.length === 0) {
        toast({
          title: 'Condition Required',
          description: 'Add at least one condition before saving. Automated collections need conditions to automatically include products.',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate all conditions are valid
      const invalidConditions = formData.conditions.filter(c => !isConditionValid(c));
      if (invalidConditions.length > 0) {
        toast({
          title: 'Invalid Conditions',
          description: 'Please complete all conditions before saving.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Validation for manual collections
    if (formData.type === 'manual' && formData.product_ids.length === 0 && !formData.is_draft) {
      toast({
        title: 'Products Required',
        description: 'Add at least one product to the collection before publishing.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      const payload: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        slug: formData.slug,
        image_url: formData.image_url,
        cover_image_url: formData.cover_image_url,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_draft: formData.is_draft,
        is_trending: formData.is_trending,
        is_seasonal: formData.is_seasonal,
        is_sale: formData.is_sale,
        visibility: formData.visibility,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        conditions: formData.type === 'smart' ? formData.conditions : [],
        product_ids: formData.type === 'manual' ? formData.product_ids : [],
        placement: formData.placement,
        placement_priority: formData.placement_priority,
      };

      if (formData.published_at) {
        payload.published_at = new Date(formData.published_at).toISOString();
      }
      if (formData.scheduled_publish_at) {
        payload.scheduled_publish_at = new Date(formData.scheduled_publish_at).toISOString();
      }

      const url = collection
        ? `${SELLER_COLLECTIONS_API}/${collection.id}`
        : SELLER_COLLECTIONS_API;
      const method = collection ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to save collection');
      }

      toast({
        title: 'Success',
        description: collection ? 'Collection updated successfully' : 'Collection created successfully',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save collection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format condition for display
  const formatConditionForDisplay = (condition: CollectionCondition): string => {
    if (condition.type === 'tag') {
      if (condition.operator === 'contains') {
        return `Product tag contains "${condition.value}"`;
      } else {
        return `Product tag is "${condition.value}"`;
      }
    }
    if (condition.type === 'title') {
      return `Product title contains "${condition.value}"`;
    }
    if (condition.type === 'price') {
      if (condition.operator === 'less_than') {
        return `Price is less than $${condition.value}`;
      } else if (condition.operator === 'greater_than') {
        return `Price is greater than $${condition.value}`;
      } else if (condition.operator === 'between') {
        return `Price is between $${condition.min} and $${condition.max}`;
      }
    }
    if (condition.type === 'stock') {
      if (condition.operator === 'in_stock') {
        return `Stock is in stock`;
      } else {
        return `Stock is out of stock`;
      }
    }
    return `${condition.type}: ${condition.operator} ${condition.value || `${condition.min}-${condition.max}`}`;
  };

  // Helper function to validate condition
  const isConditionValid = (condition: CollectionCondition): boolean => {
    if (condition.type === 'stock') {
      return true; // Stock conditions don't need values
    }
    if (condition.operator === 'between') {
      return !!(condition.min && condition.max);
    }
    return !!condition.value;
  };

  // Helper function to preview with specific conditions
  const handlePreviewWithConditions = async (conditions: CollectionCondition[]) => {
    if (conditions.length === 0) {
      setPreviewProducts([]);
      return;
    }
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_COLLECTIONS_API}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ conditions }),
      });

      if (!res.ok) {
        throw new Error('Failed to preview collection');
      }

      const data = await res.json();
      const mappedProducts = (data.products || []).map((p: any) => ({
        id: p._id || p.id,
        title: p.name,
        price: p.price,
        stock_quantity: p.stock,
        sku: p.sku,
        status: p.status === 'in_stock' ? 'active' : 'inactive',
        images: p.images?.map((img: string, idx: number) => ({
          id: `img-${p._id || p.id}-${idx}`,
          product_id: p._id || p.id,
          url: img,
          position: idx,
          is_primary: idx === 0,
          created_at: new Date().toISOString(),
        })) || [],
        description: p.description,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      setPreviewProducts(mappedProducts);
    } catch (error: any) {
      console.error('Preview error:', error);
      setPreviewProducts([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAddCondition = () => {
    if (isConditionValid(newCondition)) {
      const updatedConditions = [...formData.conditions, { ...newCondition }];
      setFormData({
        ...formData,
        conditions: updatedConditions,
      });
      setNewCondition({
        type: 'tag',
        operator: 'contains',
        value: '',
      });
      setShowConditionBuilder(false);
      // Auto-update preview after adding condition
      setTimeout(() => {
        handlePreviewWithConditions(updatedConditions);
      }, 100);
    }
  };

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = formData.conditions.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      conditions: updatedConditions,
    });
    // Auto-update preview when condition is removed
    if (updatedConditions.length > 0) {
      setTimeout(() => {
        handlePreviewWithConditions(updatedConditions);
      }, 100);
    } else {
      setPreviewProducts([]);
    }
  };

  const handlePreview = async () => {
    if (formData.conditions.length === 0) {
      toast({
        title: 'Info',
        description: 'Please add at least one condition to preview products',
        variant: 'default',
      });
      return;
    }
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Use preview endpoint (works for both new and existing collections)
      const res = await fetch(`${SELLER_COLLECTIONS_API}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ conditions: formData.conditions }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to preview collection');
      }

      const data = await res.json();
      
      // Map backend products to frontend format
      const mappedProducts = (data.products || []).map((p: any) => ({
        id: p._id || p.id,
        title: p.name,
        price: p.price,
        stock_quantity: p.stock,
        sku: p.sku,
        status: p.status === 'in_stock' ? 'active' : 'inactive',
        images: p.images?.map((img: string, idx: number) => ({
          id: `img-${p._id || p.id}-${idx}`,
          product_id: p._id || p.id,
          url: img,
          position: idx,
          is_primary: idx === 0,
          created_at: new Date().toISOString(),
        })) || [],
        description: p.description,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      setPreviewProducts(mappedProducts);
      
      if (mappedProducts.length === 0) {
        toast({
          title: 'No products found',
          description: 'No products match the current conditions. Try adjusting your rules.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to preview collection',
        variant: 'destructive',
      });
      setPreviewProducts([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('modal-backdrop')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {collection ? 'Edit Collection' : 'Create Collection'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="auto-generated"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Collection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Collection Type *
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="radio"
                  value="manual"
                  checked={formData.type === 'manual'}
                  onChange={(e) => {
                    const newType = e.target.value as 'manual' | 'smart';
                    setFormData({
                      ...formData,
                      type: newType,
                      conditions: newType === 'smart' ? formData.conditions : [],
                      product_ids: newType === 'manual' ? formData.product_ids : [],
                    });
                    if (newType === 'manual') {
                      loadAvailableProducts();
                    } else {
                      setSelectedProductIds([]);
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">Manual Collection</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Select products manually. You control which products are included.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="radio"
                  value="smart"
                  checked={formData.type === 'smart'}
                  onChange={(e) => {
                    const newType = e.target.value as 'manual' | 'smart';
                    setFormData({
                      ...formData,
                      type: newType,
                      conditions: newType === 'smart' ? formData.conditions : [],
                      product_ids: newType === 'manual' ? formData.product_ids : [],
                    });
                    if (newType === 'manual') {
                      loadAvailableProducts();
                    } else {
                      setSelectedProductIds([]);
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">Automated Collection</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Products are added automatically based on your conditions. The collection stays up to date without manual maintenance.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Automated Collection Conditions */}
          {formData.type === 'smart' && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/10">
              {/* Header with clear messaging */}
              <div className="mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
                      Automated Collection Setup
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Products are added automatically based on your conditions. You don't need to manually select products.
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span>This collection updates itself when your products change</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Preview Count */}
              {formData.conditions.length > 0 && (
                <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {previewProducts.length > 0 
                          ? `${previewProducts.length} products currently match these conditions`
                          : 'No products match these conditions yet'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        This count updates automatically as you add or change conditions
                      </p>
                    </div>
                    {previewProducts.length > 0 && (
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {previewProducts.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conditions List */}
              {formData.conditions.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Your Conditions
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Products must match <span className="font-semibold">all</span> conditions
                    </p>
                  </div>
                  <div className="space-y-2">
                    {formData.conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {index + 1}.
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatConditionForDisplay(condition)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveCondition(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Condition Button */}
              <div className="flex items-center justify-between">
                <div>
                  {formData.conditions.length === 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Add at least one condition to define which products should be included
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConditionBuilder(!showConditionBuilder)}
                  className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  {showConditionBuilder ? 'Cancel' : formData.conditions.length === 0 ? 'Add Your First Condition' : 'Add Another Condition'}
                </Button>
              </div>

              {/* Condition Builder */}
              {showConditionBuilder && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    Create a New Condition
                  </h4>
                  <div className="space-y-4">
                    {/* What to check */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What should we check?
                      </label>
                      <select
                        value={newCondition.type}
                        onChange={(e) => {
                          setNewCondition({ 
                            ...newCondition, 
                            type: e.target.value as any,
                            operator: e.target.value === 'stock' ? 'in_stock' : newCondition.operator,
                            value: e.target.value === 'stock' ? '' : newCondition.value
                          });
                        }}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="tag">Product tag</option>
                        <option value="title">Product title</option>
                        <option value="price">Product price</option>
                        <option value="stock">Stock availability</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {newCondition.type === 'tag' && 'Check if the product has a specific tag'}
                        {newCondition.type === 'title' && 'Check if the product title contains certain words'}
                        {newCondition.type === 'price' && 'Check the product price'}
                        {newCondition.type === 'stock' && 'Check if the product is in stock or out of stock'}
                      </p>
                    </div>

                    {/* How to compare */}
                    {newCondition.type !== 'stock' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          How should we compare?
                        </label>
                        <select
                          value={newCondition.operator}
                          onChange={(e) =>
                            setNewCondition({ ...newCondition, operator: e.target.value as any })
                          }
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          {newCondition.type === 'tag' && (
                            <>
                              <option value="contains">Contains</option>
                              <option value="equals">Is exactly</option>
                            </>
                          )}
                          {newCondition.type === 'title' && (
                            <>
                              <option value="contains">Contains</option>
                            </>
                          )}
                          {newCondition.type === 'price' && (
                            <>
                              <option value="less_than">Is less than</option>
                              <option value="greater_than">Is greater than</option>
                              <option value="between">Is between</option>
                            </>
                          )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {newCondition.type === 'tag' && newCondition.operator === 'contains' && 'Product tag includes this text'}
                          {newCondition.type === 'tag' && newCondition.operator === 'equals' && 'Product tag matches exactly'}
                          {newCondition.type === 'title' && 'Product title includes this text'}
                          {newCondition.type === 'price' && newCondition.operator === 'less_than' && 'Product price is below this amount'}
                          {newCondition.type === 'price' && newCondition.operator === 'greater_than' && 'Product price is above this amount'}
                          {newCondition.type === 'price' && newCondition.operator === 'between' && 'Product price is within this range'}
                        </p>
                      </div>
                    )}

                    {/* Value input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {newCondition.type === 'stock' 
                          ? 'Stock status'
                          : newCondition.operator === 'between'
                          ? 'Price range'
                          : 'Value'}
                      </label>
                      {newCondition.type === 'stock' ? (
                        <select
                          value={newCondition.operator}
                          onChange={(e) =>
                            setNewCondition({ ...newCondition, operator: e.target.value as any })
                          }
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          <option value="in_stock">In stock</option>
                          <option value="out_of_stock">Out of stock</option>
                        </select>
                      ) : newCondition.operator === 'between' ? (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="number"
                              placeholder="Minimum price"
                              value={newCondition.min || ''}
                              onChange={(e) =>
                                setNewCondition({ ...newCondition, min: e.target.value })
                              }
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center text-gray-500 dark:text-gray-400">and</div>
                          <div className="flex-1">
                            <input
                              type="number"
                              placeholder="Maximum price"
                              value={newCondition.max || ''}
                              onChange={(e) =>
                                setNewCondition({ ...newCondition, max: e.target.value })
                              }
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <input
                          type={newCondition.type === 'price' ? 'number' : 'text'}
                          placeholder={
                            newCondition.type === 'tag' ? 'e.g., Summer, Sale' :
                            newCondition.type === 'title' ? 'e.g., shirt, jacket' :
                            'e.g., 50'
                          }
                          value={newCondition.value || ''}
                          onChange={(e) =>
                            setNewCondition({ ...newCondition, value: e.target.value })
                          }
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        type="button" 
                        onClick={handleAddCondition}
                        disabled={!isConditionValid(newCondition)}
                        className="flex-1"
                      >
                        Add This Condition
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowConditionBuilder(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Products Button - Auto-updates when conditions change */}
              {formData.conditions.length > 0 && (
                <div className="mt-4 flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      See which products match your conditions
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Click to preview matching products
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePreview}
                    disabled={previewLoading}
                    className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    {previewLoading ? 'Loading...' : 'Preview Products'}
                  </Button>
                </div>
              )}

              {previewProducts.length > 0 && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {previewProducts.length} products currently match your conditions
                    </p>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ Matching
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="space-y-1">
                      {previewProducts.map((product) => (
                        <div key={product.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded flex items-center justify-between">
                          <span className="text-gray-900 dark:text-white">{product.title}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">${product.price?.toFixed(2) || '0.00'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Reassuring Message */}
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Your collection will stay up to date automatically
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      New products that match your conditions will be added automatically. Products that no longer match will be removed automatically. You can change conditions at any time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual Collection Product Selection */}
          {formData.type === 'manual' && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Select Products
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Search and select products to include in this manual collection. Products are added/removed only through your actions.
                </p>
                
                {/* Product Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Available Products List */}
                {loadingProducts ? (
                  <div className="text-center py-4 text-gray-500">Loading products...</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto mb-4 space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                    {filteredAvailableProducts.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        {productSearchTerm ? 'No products found' : 'No available products'}
                      </div>
                    ) : (
                      filteredAvailableProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {product.images && product.images.length > 0 && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-600"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.png';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ${product.price.toFixed(2)} • SKU: {product.sku} • Stock: {product.stock}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddProductToForm(product.id)}
                          >
                            Add
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Products List */}
                {selectedProducts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Selected Products ({selectedProducts.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                      {selectedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {product.images && product.images.length > 0 && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-600"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.png';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ${product.price.toFixed(2)} • SKU: {product.sku}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveProductFromForm(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort Order
            </label>
            <select
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="manual">Manual</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="best_selling">Best Selling</option>
            </select>
          </div>

          {/* Visibility & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.visibility.storefront}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: { ...formData.visibility, storefront: e.target.checked },
                    })
                  }
                  className="mr-2"
                />
                Show on Storefront
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.visibility.mobile_app}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: { ...formData.visibility, mobile_app: e.target.checked },
                    })
                  }
                  className="mr-2"
                />
                Show on Mobile App
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                Active
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_draft}
                  onChange={(e) => setFormData({ ...formData, is_draft: e.target.checked })}
                  className="mr-2"
                />
                Save as Draft
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="mr-2"
                />
                Featured
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_trending}
                  onChange={(e) => setFormData({ ...formData, is_trending: e.target.checked })}
                  className="mr-2"
                />
                Trending
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_seasonal}
                  onChange={(e) => setFormData({ ...formData, is_seasonal: e.target.checked })}
                  className="mr-2"
                />
                Seasonal
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_sale}
                  onChange={(e) => setFormData({ ...formData, is_sale: e.target.checked })}
                  className="mr-2"
                />
                Sale Collection
              </label>
            </div>
          </div>

          {/* Thumbnail Image Selection */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-red-400" />
              Collection Thumbnail Image
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Main image displayed on collection page
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Small image for cards and listings
                  </p>
                </div>
              </div>
              
              {/* Image Preview */}
              {(formData.cover_image_url || formData.image_url) && (
                <div className="grid grid-cols-2 gap-4">
                  {formData.cover_image_url && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Cover Preview</label>
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={formData.cover_image_url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/800x450?text=Invalid+Image';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {formData.image_url && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Thumbnail Preview</label>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={formData.image_url}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Invalid+Image';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Upload Buttons */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                  Upload image files or paste image URLs above
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Cover Image
                    </label>
                    <input
                      ref={coverImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file, 'cover');
                        }
                      }}
                      className="hidden"
                      id="cover-image-upload"
                      disabled={uploadingImages}
                    />
                    <label
                      htmlFor="cover-image-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Choose Cover Image</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Thumbnail Image
                    </label>
                    <input
                      ref={thumbnailImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file, 'thumbnail');
                        }
                      }}
                      className="hidden"
                      id="thumbnail-image-upload"
                      disabled={uploadingImages}
                    />
                    <label
                      htmlFor="thumbnail-image-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Choose Thumbnail</span>
                    </label>
                  </div>
                </div>
                {uploadingImages && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                    Uploading image...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Collection Placement Control */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-red-400" />
              Collection Placement Control
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Control where this collection appears on your storefront
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.placement.homepage_banner}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        placement: { ...formData.placement, homepage_banner: e.target.checked },
                      })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Homepage Banner</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Display as featured banner on homepage
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.placement.homepage_featured}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        placement: { ...formData.placement, homepage_featured: e.target.checked },
                      })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Homepage Featured</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Show in featured collections section
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.placement.homepage_tabs}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        placement: { ...formData.placement, homepage_tabs: e.target.checked },
                      })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Homepage Tabs</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Include in homepage tab navigation
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.placement.category_page}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        placement: { ...formData.placement, category_page: e.target.checked },
                      })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Category Pages</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Show on related category pages
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors md:col-span-2">
                  <input
                    type="checkbox"
                    checked={formData.placement.navigation_menu}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        placement: { ...formData.placement, navigation_menu: e.target.checked },
                      })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Layout className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Navigation Menu</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add to main navigation menu
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Placement Priority */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Placement Priority
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.placement_priority}
                  onChange={(e) =>
                    setFormData({ ...formData, placement_priority: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0 (lower = higher priority)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Lower numbers appear first. Use 0-100 range.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Collection Page Preview */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-red-400" />
              Collection Page
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                A dedicated page for this collection will be automatically generated and accessible at:
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-500/30">
                <code className="text-sm text-blue-600 dark:text-blue-400 flex-1">
                  /collections/{formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `/collections/${formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')}`;
                    window.open(url, '_blank');
                  }}
                  disabled={!formData.name}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview Page
                </Button>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                The page will include all products in this collection with filtering, sorting, and search capabilities.
              </p>
            </div>
          </div>

          {/* SEO */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">SEO Title</label>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SEO Description</label>
                <textarea
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : collection ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Collection Products Modal Component
function CollectionProductsModal({
  collection,
  onClose,
  onSuccess,
}: {
  collection: Collection;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [_user, setUser] = useState<any>(null);
  const [productSortBy, setProductSortBy] = useState('recently_added');
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [showSmartRules, setShowSmartRules] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<string | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<string | null>(null);

  // Close modal on outside click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (collection) {
      loadCollectionProducts();
      loadAllProducts();
    }
  }, [collection]);

  const loadUser = async () => {
    // Get user from auth store or API
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || { id: collection.seller_id });
      } else {
        setUser({ id: collection.seller_id });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser({ id: collection.seller_id });
    }
  };

  const loadCollectionProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_COLLECTIONS_API}/${collection.id}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load collection products');
      }

      const data = await res.json();
      // Map backend product format to frontend format
      const mappedProducts = (data.products || []).map((p: any) => ({
        id: p._id || p.id,
        title: p.name,
        price: p.price,
        stock_quantity: p.stock,
        sku: p.sku,
        status: p.status === 'in_stock' ? 'active' : 'inactive',
        images: p.images?.map((img: string, idx: number) => ({
          id: `img-${p._id || p.id}-${idx}`,
          product_id: p._id || p.id,
          url: img,
          position: idx,
          is_primary: idx === 0,
          created_at: new Date().toISOString(),
        })) || [],
        description: p.description,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      setProducts(mappedProducts);
    } catch (error: any) {
      console.error('Error loading collection products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_INVENTORY_API}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load products');
      }

      const data = await res.json();
      // Map backend product format to frontend format
      const mappedProducts = (data.products || []).map((p: any) => ({
        id: p._id || p.id,
        title: p.name,
        price: p.price,
        stock_quantity: p.stock,
        sku: p.sku,
        status: p.status === 'in_stock' ? 'active' : 'inactive',
        images: p.images?.map((img: string, idx: number) => ({
          id: `img-${p._id || p.id}-${idx}`,
          product_id: p._id || p.id,
          url: img,
          position: idx,
          is_primary: idx === 0,
          created_at: new Date().toISOString(),
        })) || [],
        description: p.description,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      setAllProducts(mappedProducts);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    }
  };

  const handleAddProduct = async (productId: string) => {
    if (collection.type !== 'manual') {
      toast({
        title: 'Error',
        description: 'Cannot add products to automated collections. Modify rules instead.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_COLLECTIONS_API}/${collection.id}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to add product');
      }

      toast({
        title: 'Success',
        description: 'Product added to collection',
      });
      loadCollectionProducts();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (collection.type !== 'manual') {
      toast({
        title: 'Error',
        description: 'Cannot remove products from automated collections. Modify rules instead.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_COLLECTIONS_API}/${collection.id}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to remove product');
      }

      toast({
        title: 'Success',
        description: 'Product removed from collection',
      });
      loadCollectionProducts();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove product',
        variant: 'destructive',
      });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (productId: string) => {
    setDraggedProduct(productId);
  };

  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    setDragOverProduct(productId);
  };

  const handleDragEnd = () => {
    setDraggedProduct(null);
    setDragOverProduct(null);
  };

  const handleDrop = async (e: React.DragEvent, targetProductId: string) => {
    e.preventDefault();
    if (!draggedProduct || draggedProduct === targetProductId || collection.type !== 'manual') {
      setDraggedProduct(null);
      setDragOverProduct(null);
      return;
    }

    const draggedIndex = products.findIndex(p => p.id === draggedProduct);
    const targetIndex = products.findIndex(p => p.id === targetProductId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedProduct(null);
      setDragOverProduct(null);
      return;
    }

    // Reorder products array
    const newProducts = [...products];
    const [removed] = newProducts.splice(draggedIndex, 1);
    newProducts.splice(targetIndex, 0, removed);
    
    setProducts(newProducts);
    
    // Save the new order to the backend
    try {
      const token = localStorage.getItem('auth_token');
      const productIds = newProducts.map(p => p.id);
      const res = await fetch(`${SELLER_COLLECTIONS_API}/${collection.id}/products/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ product_ids: productIds }),
      });

      if (!res.ok) {
        throw new Error('Failed to save product order');
      }

      toast({
        title: 'Success',
        description: 'Product order updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save product order',
        variant: 'destructive',
      });
      // Revert on error
      loadCollectionProducts();
    }
    
    setDraggedProduct(null);
    setDragOverProduct(null);
  };

  const availableProducts = allProducts.filter(
    (p) => !products.some((cp) => cp.id === p.id) && p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort products
  const sortedProducts = React.useMemo(() => {
    const sorted = [...products];
    switch (productSortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name_asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'name_desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'stock_asc':
        return sorted.sort((a, b) => (a.stock_quantity || 0) - (b.stock_quantity || 0));
      case 'stock_desc':
        return sorted.sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0));
      default:
        return sorted;
    }
  }, [products, productSortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const handleExportProducts = () => {
    const csv = [
      ['Product Name', 'SKU', 'Price', 'Stock', 'Status'].join(','),
      ...products.map(p => [
        p.title,
        p.sku || 'N/A',
        p.price,
        p.stock_quantity || 0,
        p.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-${collection.name}-products-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Products exported to CSV',
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Products: {collection.name}
              </h2>
              {collection.type === 'smart' && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This is a smart collection. Products are automatically added/removed based on conditions.
                  </p>
                  <button
                    onClick={() => setShowSmartRules(!showSmartRules)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    {showSmartRules ? 'Hide Rules' : 'View Rules →'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProducts}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Smart Collection Rules Preview */}
          {showSmartRules && collection.type === 'smart' && collection.conditions && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Collection Rules</h3>
              <div className="space-y-2">
                {collection.conditions.map((condition, idx) => (
                  <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{condition.type}:</span> {condition.operator} {condition.value || `${condition.min}-${condition.max}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Add Products Section - Available for both manual and smart collections */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {collection.type === 'manual' ? 'Add Products' : 'Add Manual Product Override'}
              </h3>
              {collection.type === 'smart' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Override smart collection rules
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-gray-700 dark:text-white"
            />
            <div className="max-h-60 overflow-y-auto overflow-x-hidden scroll-smooth space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full">
              {availableProducts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {searchTerm ? 'No products found' : 'No available products to add'}
                </div>
              ) : (
                availableProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {product.images && product.images.length > 0 && (
                        <img
                          src={product.images.find(img => img.is_primary)?.url || product.images[0]?.url || '/placeholder.png'}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-600"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {product.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ${product.price.toFixed(2)} • Stock: {product.stock_quantity || 0}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddProduct(product.id)}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Products in Collection ({products.length})
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={productSortBy}
                  onChange={(e) => {
                    setProductSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A-Z</option>
                  <option value="name_desc">Name: Z-A</option>
                  <option value="stock_asc">Stock: Low to High</option>
                  <option value="stock_desc">Stock: High to Low</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products in this collection
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {collection.type === 'manual' && (
                    <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                      <p className="text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <GripVertical className="w-4 h-4" />
                        Drag products to reorder them in the collection
                      </p>
                    </div>
                  )}
                  {paginatedProducts.map((product) => (
                    <div
                      key={product.id}
                      draggable={collection.type === 'manual'}
                      onDragStart={() => handleDragStart(product.id)}
                      onDragOver={(e) => handleDragOver(e, product.id)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, product.id)}
                      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-all ${
                        draggedProduct === product.id ? 'opacity-50' : ''
                      } ${
                        dragOverProduct === product.id ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border border-transparent'
                      } ${collection.type === 'manual' ? 'cursor-move' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {collection.type === 'manual' && (
                          <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing" />
                        )}
                        {product.images && product.images.length > 0 && (
                          <img
                            src={product.images.find(img => img.is_primary)?.url || product.images[0]?.url || '/placeholder.png'}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {product.title}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>${product.price.toFixed(2)}</span>
                            <span>Stock: {product.stock_quantity || 0}</span>
                            <span className={`px-2 py-0.5 rounded ${
                              product.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {product.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      {collection.type === 'manual' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="ml-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>

    </div>
  );
}

// Collection Preview Modal Component
function CollectionPreviewModal({
  collection,
  onClose,
  onViewProduct,
}: {
  collection: Collection;
  onClose: () => void;
  onViewProduct?: (product: Product) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12);

  useEffect(() => {
    loadProducts();
  }, [collection]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${SELLER_COLLECTIONS_API}/${collection.id}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load collection products');
      }

      const data = await res.json();
      // Map backend product format to frontend format
      const mappedProducts = (data.products || []).map((p: any) => ({
        id: p._id || p.id,
        title: p.name,
        price: p.price,
        stock_quantity: p.stock,
        sku: p.sku,
        status: p.status === 'in_stock' ? 'active' : 'inactive',
        images: p.images?.map((img: string, idx: number) => ({
          id: `img-${p._id || p.id}-${idx}`,
          product_id: p._id || p.id,
          url: img,
          position: idx,
          is_primary: idx === 0,
          created_at: new Date().toISOString(),
        })) || [],
        description: p.description,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      setProducts(mappedProducts);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const totalPages = Math.ceil(products.length / productsPerPage);
  const paginatedProducts = products.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Render modal using React Portal to ensure it's above everything
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        style={{ 
          zIndex: 9998,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
      {/* Modal Content */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ 
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth relative pointer-events-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full"
          onClick={(e) => e.stopPropagation()}
          style={{ 
            zIndex: 10000
          }}
        >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Preview: {collection.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This is how customers will see your collection
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Collection Hero */}
        <div className="p-6">
          {collection.cover_image_url || collection.image_url ? (
            <div className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6">
              <img
                src={collection.cover_image_url || collection.image_url}
                alt={collection.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-lg text-white/90 max-w-3xl">
                    {collection.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
                  {collection.description}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <span>{products.length} products</span>
            <span>•</span>
            <span
              className={`px-3 py-1 rounded-full ${
                collection.type === 'smart'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}
            >
              {collection.type === 'smart' ? 'Smart Collection' : 'Manual Collection'}
            </span>
            {collection.is_featured && (
              <>
                <span>•</span>
                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Featured
                </span>
              </>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-end gap-4 mb-6">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Products Grid/List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No products in this collection yet.
              </p>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
              }>
                {paginatedProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    onViewProduct={onViewProduct}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          <Button onClick={() => {
            window.open(`/collection/${collection.seller_id}/${collection.slug || collection.id}`, '_blank');
          }}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}

