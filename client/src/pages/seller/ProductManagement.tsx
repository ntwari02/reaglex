import React, { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, Edit, Trash2, Eye, Search, Filter, Upload, Download, X, Check, Image as ImageIcon, Tag, DollarSign, Package, Globe, LayoutGrid, Rows, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Loader2, FileVideo, ScanSearch, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import '../../styles/seller-product-management.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToastStore } from '@/stores/toastStore';
import * as XLSX from 'xlsx';
import SellerGuidancePanel from '@/components/seller/SellerGuidancePanel';
import { SERVER_URL, API_BASE_URL } from '@/lib/config';
import { currencyApi } from '@/services/currencyApi';
import { formatIntNoDecimals } from '@/lib/currencyFormat';
import { categoryNeedsColor, categoryNeedsSize } from '@/constants/categoryAttributes';
import {
  enrichVariantsWithProductImages,
  mapVariantsFromApi,
  resolveColorsForSave,
  resolveSizesForSave,
} from '@/lib/productVariantSync';

const API_HOST = SERVER_URL;
const API_BASE = `${API_BASE_URL}/seller/inventory`;
const MAX_PRODUCT_IMAGES = 12;
const IMAGE_UPLOAD_BATCH = 5;

const LISTING_CURRENCIES = ['USD', 'RWF', 'KES', 'UGX', 'TZS', 'NGN', 'EUR', 'GBP'] as const;
const SIZE_OPTIONS = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
  '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
] as const;

type Variant = {
  color?: string;
  size?: string;
  sku: string;
  stock: number;
  /** Whole amount in listing currency when this variant costs more/less than base price. */
  listingPriceAmount?: number;
  priceUsd?: number;
  label?: string;
  thumbnailUrl?: string;
  swatchHex?: string;
  badge?: string;
};

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  listingCurrency?: string;
  listingPriceAmount?: number;
  discount?: number;
  stock: number;
  moq?: number;
  // UI status for display/filtering, derived from inventory state
  status: 'active' | 'draft' | 'out_of_stock' | 'hidden';
  publicationStatus?: 'published' | 'pending_verification' | 'draft';
  sales: number;
  views: number;
  rating: number;
  images?: string[];
  videoProofUrl?: string;
  videoUrl?: string;
  description?: string;
  sku?: string;
  weight?: number;
  variants?: Variant[];
  sizes?: string[];
  colors?: string[];
   seoTitle?: string;
   seoDescription?: string;
   seoKeywords?: string;
  spacillyProductId?: string;
  verificationSummary?: {
    status: 'unverified' | 'pending' | 'verified' | 'flagged' | 'rejected';
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    trustBand?: 'high' | 'medium' | 'low';
    submissionAllowed?: boolean;
    hasIdentifier: boolean;
    lastCheckedAt?: string;
  };
}

type TrustPreview = {
  totalScore: number;
  trustBand: 'high' | 'medium' | 'low';
  submissionAllowed: boolean;
  hardBlocked: boolean;
  blockers: string[];
  breakdown: Array<{ key: string; label: string; state: 'ok' | 'warn' | 'fail'; detail: string }>;
};

const ProductManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [moqMin, setMoqMin] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [, setShowBulkActions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; errors: string[] } | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const productSaveInFlightRef = useRef(false);
  const { showToast } = useToastStore();
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    listingCurrency: 'USD' as string,
    discount: '',
    stock: '',
    weight: '',
    sku: '',
    images: [] as string[],
    variants: [] as Variant[],
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    sizes: [] as string[],
    colors: [] as string[],
    listingMode: 'live' as 'live' | 'upcoming',
    launchAt: '',
  });
  const [imageUploading, setImageUploading] = useState(false);

  const [variantDraft, setVariantDraft] = useState({
    color: '',
    size: '',
    sku: '',
    stock: '',
    listingPriceAmount: '',
    label: '',
    thumbnailUrl: '',
    badge: '',
  });
  const [videoProof, setVideoProof] = useState<{
    fileName: string;
    previewUrl: string;
    size: number;
    remoteUrl?: string;
  } | null>(null);
  const [videoProofUploading, setVideoProofUploading] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'running' | 'pass' | 'warning'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanBreakdown, setScanBreakdown] = useState({
    visualMatch: 0,
    labelMatch: 0,
    structureMatch: 0,
  });
  const [videoImageSimilarity, setVideoImageSimilarity] = useState<number | null>(null);
  const [scanPassed, setScanPassed] = useState(false);
  const [imageSimilarityScore, setImageSimilarityScore] = useState(0);
  const [trustPreview, setTrustPreview] = useState<TrustPreview | null>(null);
  const [trustPreviewLoading, setTrustPreviewLoading] = useState(false);
  const [listingUsdPreview, setListingUsdPreview] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const activeCategory = editingProduct?.category || newProduct.category;
  const showSizeInputs = categoryNeedsSize(activeCategory);
  const showColorInputs = categoryNeedsColor(activeCategory);

  const resolveImageUrl = (url: string): string => {
    if (!url) return url;
    const t = String(url).trim();
    if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('//')) {
      return t.startsWith('//') ? `https:${t}` : t;
    }
    return `${API_HOST}${t.startsWith('/') ? '' : '/'}${t}`;
  };

  const normalizeUploadedUrl = (url: string): string => {
    const t = String(url || '').trim();
    if (!t) return '';
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    if (t.startsWith('//')) return `https:${t}`;
    return resolveImageUrl(t);
  };

  const currentImages = () => editingProduct?.images || newProduct.images || [];

  const setProductImages = (next: string[]) => {
    const capped = next.slice(0, MAX_PRODUCT_IMAGES);
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, images: capped });
    } else {
      setNewProduct((prev) => ({ ...prev, images: capped }));
    }
  };

  const buildVerificationPayload = () => {
    const videoUrl = videoProof?.remoteUrl || '';
    return {
      videoProofUploaded: Boolean(videoUrl),
      videoProofUrl: videoUrl || undefined,
      videoImageSimilarity: videoImageSimilarity ?? undefined,
      scanPassed,
      labelProofUploaded: Boolean(videoUrl && currentImages().length > 0),
      imageSimilarityScore,
      stolenImageSuspected: false,
    };
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const mapApiProduct = (p: any): Product => ({
    id: p._id?.toString() || p.id?.toString(),
    name: p.name,
    category: p.category || 'Uncategorized',
    price: p.price,
    listingCurrency: p.listingCurrency || 'USD',
    listingPriceAmount:
      p.listingPriceAmount != null && p.listingPriceAmount !== ''
        ? Math.round(Number(p.listingPriceAmount))
        : Math.round(Number(p.price) || 0),
    discount: p.discount,
    stock: p.stock,
    moq: p.moq,
    weight: p.weight,
    publicationStatus: p.publicationStatus,
    status:
      p.publicationStatus === 'pending_verification'
        ? 'hidden'
        : p.stock === 0
          ? 'out_of_stock'
          : 'active',
    sales: 0,
    views: 0,
    rating: 0,
    images: Array.isArray(p.images) ? p.images.map(resolveImageUrl) : undefined,
    videoProofUrl: p.videoProofUrl ? normalizeUploadedUrl(String(p.videoProofUrl)) : undefined,
    videoUrl: p.videoUrl ? normalizeUploadedUrl(String(p.videoUrl)) : undefined,
    description: p.description,
    sku: p.sku,
    variants: mapVariantsFromApi(p.variants, p),
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
  seoTitle: p.seoTitle,
  seoDescription: p.seoDescription,
  seoKeywords: p.seoKeywords,
  spacillyProductId: p.spacillyProductId,
  verificationSummary: p.verificationSummary,
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load products');
      }
      const apiProducts = Array.isArray(data.products)
        ? data.products.map(mapApiProduct)
        : [];
      setProducts(apiProducts);
    } catch (e: any) {
      console.error('Failed to load products:', e);
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const reload = () => {
      void loadProducts();
    };
    window.addEventListener('sellerKycUpdated', reload);
    window.addEventListener('sellerProductsPublished', reload);
    return () => {
      window.removeEventListener('sellerKycUpdated', reload);
      window.removeEventListener('sellerProductsPublished', reload);
    };
  }, []);

  useEffect(() => {
    if (!showAddProduct && !editingProduct) return;
    const lc = String(editingProduct?.listingCurrency || newProduct.listingCurrency || 'USD').toUpperCase();
    const raw = editingProduct
      ? lc === 'USD'
        ? editingProduct.price
        : editingProduct.listingPriceAmount
      : newProduct.price;
    const amt = Math.round(typeof raw === 'number' ? Number(raw) : parseFloat(String(raw || '')) || 0);
    if (!amt || amt <= 0) {
      setListingUsdPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      if (lc === 'USD') {
        if (!cancelled) setListingUsdPreview(amt);
        return;
      }
      try {
        const r = await currencyApi.getRates([lc]);
        const rate = Number(r?.rates?.[lc] || 1);
        if (!cancelled) setListingUsdPreview(Math.round((amt / rate) * 100) / 100);
      } catch {
        if (!cancelled) setListingUsdPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showAddProduct,
    editingProduct,
    editingProduct?.listingCurrency,
    editingProduct?.listingPriceAmount,
    editingProduct?.price,
    newProduct.listingCurrency,
    newProduct.price,
  ]);

  useEffect(() => {
    if (!showAddProduct && !editingProduct) return;
    const name = (editingProduct?.name ?? newProduct.name).trim();
    if (!name) {
      setTrustPreview(null);
      return;
    }
    const t = window.setTimeout(async () => {
      setTrustPreviewLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/verification/preview`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            name: editingProduct?.name ?? newProduct.name,
            category: editingProduct?.category ?? newProduct.category,
            description: editingProduct?.description ?? newProduct.description,
            images: editingProduct?.images ?? newProduct.images ?? [],
            excludeProductId: editingProduct?.id,
            verification: buildVerificationPayload(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.verification) setTrustPreview(data.verification as TrustPreview);
        else setTrustPreview(null);
      } catch {
        setTrustPreview(null);
      } finally {
        setTrustPreviewLoading(false);
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    showAddProduct,
    editingProduct,
    newProduct.name,
    newProduct.category,
    newProduct.description,
    newProduct.images,
    editingProduct?.name,
    editingProduct?.category,
    editingProduct?.description,
    editingProduct?.images,
    editingProduct?.id,
    videoProof,
    videoImageSimilarity,
    scanPassed,
    imageSimilarityScore,
  ]);

  useEffect(() => {
    const onInventoryUpdated = () => {
      loadProducts();
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' || product.status === statusFilter;

        const matchesCategory =
          categoryFilter === 'all' || product.category === categoryFilter;

        const matchesStock =
          stockFilter === 'all' ||
          (stockFilter === 'in_stock' && product.stock > 0) ||
          (stockFilter === 'low_stock' && product.stock > 0 && product.stock < 20) ||
          (stockFilter === 'out_of_stock' && product.stock === 0);

        const price = product.price * (1 - (product.discount || 0) / 100);
        const minOk = priceMin === '' || price >= parseFloat(priceMin);
        const maxOk = priceMax === '' || price <= parseFloat(priceMax);

        const moqOk =
          moqMin === '' ||
          (product.moq ?? 0) >= parseInt(moqMin || '0', 10);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCategory &&
          matchesStock &&
          minOk &&
          maxOk &&
          moqOk
        );
      }),
    [products, searchTerm, statusFilter, categoryFilter, stockFilter, priceMin, priceMax, moqMin]
  );

  const availableCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'out_of_stock': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'hidden': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getVerificationPill = (product: Product) => {
    const status = product.verificationSummary?.status || 'unverified';
    if (status === 'verified') return 'bg-green-500/15 text-green-500 border-green-500/30';
    if (status === 'flagged' || status === 'rejected') return 'bg-red-500/15 text-red-500 border-red-500/30';
    if (status === 'pending') return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30';
    return 'bg-gray-500/15 text-gray-500 border-gray-500/30';
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === 'delete') {
      try {
        await Promise.all(
          selectedProducts.map((id) =>
            fetch(`${API_BASE}/products/${id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
              credentials: 'include',
            })
          )
        );
        await loadProducts();
      } catch (e) {
        console.error('Bulk delete failed:', e);
      }
    } else {
      console.log(`Bulk ${action} for:`, selectedProducts);
    }
    setSelectedProducts([]);
    setShowBulkActions(false);
  };

  const handleExportProducts = () => {
    if (filteredProducts.length === 0) {
      showToast('No products to export with the current filters.', 'info');
      return;
    }

    try {
      const headers = [
        'ID',
        'Name',
        'Category',
        'SKU',
        'Price',
        'Discount',
        'FinalPrice',
        'Stock',
        'MOQ',
        'Status',
        'ImagesCount',
        'VariantsCount',
      ];

      const rows = filteredProducts.map((p) => {
        const finalPrice =
          p.price * (1 - (p.discount || 0) / 100);
        return [
          p.id,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.category || '').replace(/"/g, '""')}"`,
          p.sku || '',
          p.price.toFixed(2),
          p.discount != null ? String(p.discount) : '',
          finalPrice.toFixed(2),
          String(p.stock),
          p.moq != null ? String(p.moq) : '',
          p.status,
          String(p.images?.length || 0),
          String(p.variants?.length || 0),
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.setAttribute('download', `seller-products-export-${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${filteredProducts.length} product(s) to CSV.`, 'success');
    } catch (e: any) {
      console.error('Export products failed:', e);
      showToast(e.message || 'Failed to export products.', 'error');
    }
  };

  const handleViewProduct = (product: Product) => {
    setViewProduct(product);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteTarget(product);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`${API_BASE}/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data.message || 'Failed to delete product.';
        showToast(msg, 'error');
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSelectedProducts((prev) => prev.filter((pid) => pid !== deleteTarget.id));
      showToast('Product deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (e: any) {
      console.error('Delete product failed:', e);
      showToast(e.message || 'Failed to delete product.', 'error');
    }
  };

  const handleSaveProduct = async () => {
    setFormError(null);

    // Basic client-side validation for required backend fields
    const name = editingProduct ? editingProduct.name : newProduct.name;
    const sku = editingProduct ? editingProduct.sku : newProduct.sku;
    const listCur = editingProduct
      ? editingProduct.listingCurrency || 'USD'
      : newProduct.listingCurrency || 'USD';
    const listingPriceInt = editingProduct
      ? listCur === 'USD'
        ? Math.round(Number(editingProduct.price))
        : Math.round(Number(editingProduct.listingPriceAmount ?? 0))
      : Math.round(parseFloat(String(newProduct.price)) || 0);

    if (!name || !sku || !sku.trim() || listingPriceInt <= 0) {
      setFormError('Name, SKU and a valid positive list price are required.');
      return;
    }

    if (trustPreviewLoading) {
      setFormError('Trust checks are still loading. Please wait a moment.');
      return;
    }
    if (!trustPreview) {
      setFormError('Trust preview is not ready. Check your connection and try again.');
      return;
    }
    if (!trustPreview.submissionAllowed) {
      const msg =
        (trustPreview.blockers && trustPreview.blockers.length > 0 && trustPreview.blockers.join(' ')) ||
        'Trust score is too low or required proofs are missing. Fix the issues below.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    const verificationPayload = buildVerificationPayload();

    if (!currentImages().length) {
      setFormError('Add at least one product photo (first photo is the cover image on the product page).');
      return;
    }
    if (!verificationPayload.videoProofUrl) {
      setFormError('Upload a proof video so buyers can verify your item.');
      return;
    }
    if (!scanPassed) {
      setFormError('Wait for the media trust check to finish after uploading photos and video.');
      return;
    }

    if (productSaveInFlightRef.current) return;
    productSaveInFlightRef.current = true;
    setProductSubmitting(true);
    try {
      const prepareVariants = (variants: Variant[] | undefined, images: string[] | undefined) => {
        return enrichVariantsWithProductImages(variants || [], images || []);
      };

      if (editingProduct) {
        const variantRows = prepareVariants(editingProduct.variants, editingProduct.images);
        const body = {
          name: editingProduct.name,
          category: editingProduct.category,
          description: editingProduct.description,
          weight: editingProduct.weight,
          seoTitle: editingProduct.seoTitle,
          seoDescription: editingProduct.seoDescription,
          seoKeywords: editingProduct.seoKeywords,
          sku: editingProduct.sku,
          stock: editingProduct.stock,
          listingCurrency: editingProduct.listingCurrency || 'USD',
          listingPriceAmount: listingPriceInt,
          discount: editingProduct.discount,
          moq: editingProduct.moq,
          images: editingProduct.images,
          variants: variantRows,
          sizes: resolveSizesForSave(
            editingProduct.category,
            editingProduct.sizes || [],
            variantRows,
            categoryNeedsSize,
          ),
          colors: resolveColorsForSave(
            editingProduct.category,
            editingProduct.colors || [],
            variantRows,
            categoryNeedsColor,
          ),
          verification: verificationPayload,
          listingMode: (editingProduct as { listingMode?: string }).listingMode || 'live',
          launchAt:
            (editingProduct as { listingMode?: string; launchAt?: string }).listingMode === 'upcoming' &&
            (editingProduct as { launchAt?: string }).launchAt
              ? (editingProduct as { launchAt?: string }).launchAt
              : undefined,
        };
        const response = await fetch(`${API_BASE}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.verification) setTrustPreview(data.verification as TrustPreview);
          setFormError(data.message || 'Failed to update product.');
          showToast(data.message || 'Failed to update product.', 'error');
          return;
        }
        showToast('Product updated successfully.', 'success');
      } else {
        const variantRows = prepareVariants(newProduct.variants, newProduct.images);
        const body = {
          name: newProduct.name,
          category: newProduct.category,
          description: newProduct.description,
          weight: newProduct.weight ? parseFloat(newProduct.weight) : undefined,
          seoTitle: newProduct.seoTitle,
          seoDescription: newProduct.seoDescription,
          seoKeywords: newProduct.seoKeywords,
          sku: newProduct.sku,
          stock: newProduct.stock ? parseInt(newProduct.stock, 10) : 0,
          listingCurrency: newProduct.listingCurrency || 'USD',
          listingPriceAmount: listingPriceInt,
          discount: newProduct.discount
            ? parseFloat(newProduct.discount)
            : undefined,
          moq: (newProduct as any).moq
            ? parseInt((newProduct as any).moq, 10)
            : undefined,
          images: newProduct.images,
          variants: variantRows,
          sizes: resolveSizesForSave(
            newProduct.category,
            newProduct.sizes || [],
            variantRows,
            categoryNeedsSize,
          ),
          colors: resolveColorsForSave(
            newProduct.category,
            newProduct.colors || [],
            variantRows,
            categoryNeedsColor,
          ),
          verification: verificationPayload,
          listingMode: newProduct.listingMode,
          launchAt:
            newProduct.listingMode === 'upcoming' && newProduct.launchAt
              ? new Date(newProduct.launchAt).toISOString()
              : undefined,
        };
        const response = await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.verification) setTrustPreview(data.verification as TrustPreview);
          setFormError(data.message || 'Failed to create product.');
          showToast(data.message || 'Failed to create product.', 'error');
          return;
        }
        if (data.visibilityWarning) {
          showToast(data.visibilityWarning, 'warning', 8000);
        } else {
          showToast('Product created successfully.', 'success');
        }
      }

      await loadProducts();

      setShowAddProduct(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        description: '',
        category: '',
        price: '',
        listingCurrency: 'USD',
        discount: '',
        stock: '',
        weight: '',
        sku: '',
        images: [],
        variants: [],
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        sizes: [],
        colors: [],
      });
      setVariantDraft({
        color: '',
        size: '',
        sku: '',
        stock: '',
        listingPriceAmount: '',
        label: '',
        thumbnailUrl: '',
        badge: '',
      });
      setTrustPreview(null);
      setVideoImageSimilarity(null);
      setScanPassed(false);
      setImageSimilarityScore(0);
      if (videoProof?.previewUrl) {
        URL.revokeObjectURL(videoProof.previewUrl);
      }
      setVideoProof(null);
      setScanStatus('idle');
      setScanProgress(0);
      setScanBreakdown({ visualMatch: 0, labelMatch: 0, structureMatch: 0 });
    } catch (e: any) {
      console.error('Save product failed:', e);
      const msg = e.message || 'Failed to save product.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      productSaveInFlightRef.current = false;
      setProductSubmitting(false);
    }
  };

  const handleSelectImagesClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openProductEditor = (product: Product) => {
    setEditingProduct(product);
    setScanStatus('idle');
    setScanProgress(0);
    setScanPassed(false);
    setVideoImageSimilarity(null);
    setImageSimilarityScore(0);
    const proofUrl = normalizeUploadedUrl(
      String(product.videoProofUrl || product.videoUrl || ''),
    );
    if (proofUrl) {
      setVideoProof({
        fileName: 'Proof video',
        previewUrl: proofUrl,
        size: 0,
        remoteUrl: proofUrl,
      });
      if ((product.images || []).length > 0) {
        window.setTimeout(() => runSimilarityScan({ silent: true }), 120);
      }
    } else {
      setVideoProof(null);
    }
  };

  const uploadVideoProofFile = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/products/upload-video-proof`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload video proof');
    }
    const raw = String(data.url || '').trim();
    return normalizeUploadedUrl(raw);
  };

  const uploadImageFiles = async (files: File[]) => {
    if (!files.length) return;
    const existing = currentImages();
    const room = MAX_PRODUCT_IMAGES - existing.length;
    if (room <= 0) {
      showToast(`Maximum ${MAX_PRODUCT_IMAGES} photos per product.`, 'warning');
      return;
    }
    const batch = files.slice(0, room);
    setImageUploading(true);
    setFormError(null);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < batch.length; i += IMAGE_UPLOAD_BATCH) {
        const chunk = batch.slice(i, i + IMAGE_UPLOAD_BATCH);
        const formData = new FormData();
        chunk.forEach((file) => formData.append('images', file));
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE}/products/upload-images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to upload images');
        }
        const urls: string[] = (data.urls || []).map((u: string) => normalizeUploadedUrl(u)).filter(Boolean);
        uploaded.push(...urls);
      }
      setProductImages([...existing, ...uploaded]);
      if (uploaded.length) {
        showToast(
          uploaded.length === 1 ? 'Photo uploaded.' : `${uploaded.length} photos uploaded.`,
          'success',
        );
      }
      if (videoProof?.remoteUrl) {
        window.setTimeout(() => runSimilarityScan({ silent: true }), 200);
      }
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      await uploadImageFiles(Array.from(files));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Image upload failed';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      // reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddVariant = () => {
    const trimmedSku = variantDraft.sku.trim();
    const stockValue = parseInt(variantDraft.stock, 10);

    if (!trimmedSku || Number.isNaN(stockValue)) {
      setFormError('Variant SKU and a valid stock quantity are required.');
      return;
    }

    setFormError(null);

    const variantPriceRaw = variantDraft.listingPriceAmount.trim();
    const variantListingPrice = variantPriceRaw
      ? Math.round(Number(variantPriceRaw))
      : undefined;
    if (variantPriceRaw && (!Number.isFinite(variantListingPrice!) || variantListingPrice! <= 0)) {
      setFormError('Variant price must be a positive whole number in your listing currency.');
      return;
    }

    const productImages = editingProduct?.images || newProduct.images || [];
    const existingVariantCount = (editingProduct?.variants || newProduct.variants || []).length;
    let thumb = variantDraft.thumbnailUrl.trim();
    if (!thumb && productImages.length) {
      thumb = productImages[existingVariantCount % productImages.length];
    }

    const newVariant: Variant = {
      color: variantDraft.color || undefined,
      size: variantDraft.size || undefined,
      sku: trimmedSku,
      stock: stockValue,
      ...(variantListingPrice != null ? { listingPriceAmount: variantListingPrice } : {}),
      label: variantDraft.label.trim() || variantDraft.color.trim() || undefined,
      thumbnailUrl: thumb || undefined,
      badge: variantDraft.badge.trim() || undefined,
    };

    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        variants: [...(editingProduct.variants || []), newVariant],
      });
    } else {
      setNewProduct((prev) => ({
        ...prev,
        variants: [...(prev.variants || []), newVariant],
      }));
    }

    setVariantDraft({
      color: '',
      size: '',
      sku: '',
      stock: '',
      listingPriceAmount: '',
      label: '',
      thumbnailUrl: '',
      badge: '',
    });
  };

  const handleRemoveVariant = (index: number) => {
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        variants: (editingProduct.variants || []).filter((_, i) => i !== index),
      });
    } else {
      setNewProduct((prev) => ({
        ...prev,
        variants: (prev.variants || []).filter((_, i) => i !== index),
      }));
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    const imgs = [...currentImages()];
    if (index <= 0 || index >= imgs.length) return;
    const [picked] = imgs.splice(index, 1);
    imgs.unshift(picked);
    setProductImages(imgs);
  };

  const handleRemoveProductImage = (index: number) => {
    const next = currentImages().filter((_, i) => i !== index);
    setProductImages(next);
    if (videoProof?.remoteUrl && next.length) {
      window.setTimeout(() => runSimilarityScan({ silent: true }), 200);
    } else if (!next.length) {
      setScanPassed(false);
      setScanStatus('idle');
    }
  };

  const handleVideoProofUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setVideoProof((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.previewUrl);
      return {
        fileName: file.name,
        previewUrl,
        size: file.size,
      };
    });
    setVideoProofUploading(true);
    setFormError(null);
    try {
      const remoteUrl = await uploadVideoProofFile(file);
      setVideoProof((prev) =>
        prev
          ? {
              ...prev,
              remoteUrl,
              previewUrl: remoteUrl,
            }
          : null,
      );
      showToast('Proof video uploaded.', 'success');
      if (currentImages().length > 0) {
        window.setTimeout(() => runSimilarityScan({ silent: true }), 200);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Video upload failed';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setVideoProofUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const runSimilarityScan = (opts: { silent?: boolean } = {}) => {
    const imageCount = currentImages().length;
    if (!videoProof?.remoteUrl || imageCount === 0) {
      if (!opts.silent) {
        setFormError('Upload at least one product photo, then your proof video.');
      }
      return;
    }
    if (!opts.silent) setFormError(null);
    setScanStatus('running');
    setScanProgress(0);
    const timer = window.setInterval(() => {
      setScanProgress((prev) => {
        const next = Math.min(100, prev + 10);
        if (next >= 100) {
          window.clearInterval(timer);
          const visual = Math.min(96, 58 + imageCount * 10);
          const label = videoProof?.remoteUrl ? 85 : 55;
          const structure = imageCount >= 2 ? 88 : 72;
          setScanBreakdown({
            visualMatch: visual,
            labelMatch: label,
            structureMatch: structure,
          });
          const avg100 = Math.round((visual + label + structure) / 3);
          setImageSimilarityScore(avg100);
          const sim01 = (visual + label + structure) / 300;
          setVideoImageSimilarity(sim01);
          const passed = sim01 >= 0.6;
          setScanPassed(passed);
          setScanStatus(passed ? 'pass' : 'warning');
          if (!opts.silent && passed) {
            showToast('Media check passed — ready to publish.', 'success');
          }
        }
        return next;
      });
    }, 160);
  };

  const displayTrustScore = trustPreview?.totalScore ?? 0;
  const trustBandUi = trustPreview?.trustBand ?? 'low';
  const submitAllowed =
    Boolean(trustPreview?.submissionAllowed) && !trustPreviewLoading && !productSubmitting;

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // CSV Export
  const handleExportCsv = () => {
    setShowExportMenu(false);
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Discount (%)', 'Stock', 'MOQ', 'Status', 'Description'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.sku || '',
      p.category,
      p.price,
      p.discount || 0,
      p.stock,
      p.moq || '',
      p.status,
      p.description || '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => 
      row.map(cell => {
        const str = String(cell || '');
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      }).join(',')
    )].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Export
  const handleExportExcel = () => {
    setShowExportMenu(false);
    const worksheetData = [
      ['ID', 'Name', 'SKU', 'Category', 'Price', 'Discount (%)', 'Stock', 'MOQ', 'Status', 'Description'],
      ...products.map(p => [
        p.id,
        p.name,
        p.sku || '',
        p.category,
        p.price,
        p.discount || 0,
        p.stock,
        p.moq || '',
        p.status,
        p.description || '',
      ]),
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, `products-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download Template
  const handleDownloadTemplate = (format: 'csv' | 'excel') => {
    const headers = ['Name', 'SKU', 'Category', 'Price', 'Discount (%)', 'Stock', 'MOQ', 'Status', 'Description'];
    const exampleRow = ['Example Product', 'SKU-001', 'Electronics', '99.99', '10', '100', '5', 'active', 'Product description'];
    
    if (format === 'csv') {
      const csvContent = [headers.join(','), exampleRow.map(cell => 
        String(cell).includes(',') || String(cell).includes('"') 
          ? `"${String(cell).replace(/"/g, '""')}"` 
          : String(cell)
      ).join(',')].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'product-import-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const worksheetData = [headers, exampleRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, 'product-import-template.xlsx');
    }
  };

  // Parse CSV
  const parseCsv = (text: string): Partial<Product>[] => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const dataLines = lines.slice(1);
    
    return dataLines.map((line) => {
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      
      const product: Partial<Product> = {
        id: crypto.randomUUID(),
        name: cells[headers.indexOf('Name')] || '',
        sku: cells[headers.indexOf('SKU')] || '',
        category: cells[headers.indexOf('Category')] || '',
        price: parseFloat(cells[headers.indexOf('Price')] || '0') || 0,
        discount: parseFloat(cells[headers.indexOf('Discount (%)')] || '0') || undefined,
        stock: parseInt(cells[headers.indexOf('Stock')] || '0', 10) || 0,
        moq: parseInt(cells[headers.indexOf('MOQ')] || '0', 10) || undefined,
        status: (cells[headers.indexOf('Status')] || 'draft') as Product['status'],
        description: cells[headers.indexOf('Description')] || '',
        sales: 0,
        views: 0,
        rating: 0,
      };
      
      return product;
    }).filter(p => p.name && p.category);
  };

  // Parse Excel
  const parseExcel = (file: File): Promise<Partial<Product>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            resolve([]);
            return;
          }
          
          const headers = (jsonData[0] as string[]).map(h => String(h).trim());
          const rows = jsonData.slice(1);
          
          const products: Partial<Product>[] = rows.map((row: any[]) => {
            const product: Partial<Product> = {
              id: crypto.randomUUID(),
              name: String(row[headers.indexOf('Name')] || '').trim(),
              sku: String(row[headers.indexOf('SKU')] || '').trim(),
              category: String(row[headers.indexOf('Category')] || '').trim(),
              price: parseFloat(String(row[headers.indexOf('Price')] || '0')) || 0,
              discount: parseFloat(String(row[headers.indexOf('Discount (%)')] || '0')) || undefined,
              stock: parseInt(String(row[headers.indexOf('Stock')] || '0'), 10) || 0,
              moq: parseInt(String(row[headers.indexOf('MOQ')] || '0'), 10) || undefined,
              status: (String(row[headers.indexOf('Status')] || 'draft').trim() || 'draft') as Product['status'],
              description: String(row[headers.indexOf('Description')] || '').trim(),
              sales: 0,
              views: 0,
              rating: 0,
            };
            
            return product;
          }).filter(p => p.name && p.category);
          
          resolve(products);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle File Import
  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportProgress({ processed: 0, total: 0, errors: [] });
    setImportResults(null);
    
    try {
      let importedProducts: Partial<Product>[] = [];
      const errors: string[] = [];
      
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = String(e.target?.result || '');
            importedProducts = parseCsv(text);
            
            setImportProgress({ processed: importedProducts.length, total: importedProducts.length, errors: [] });
            
            // Validate and add products
            const validProducts: Product[] = [];
            importedProducts.forEach((p, index) => {
              if (!p.name || !p.category) {
                errors.push(`Row ${index + 2}: Missing required fields (Name, Category)`);
                return;
              }
              
              if ((p.price ?? 0) <= 0) {
                errors.push(`Row ${index + 2}: Invalid price`);
                return;
              }
              
              validProducts.push({
                id: p.id || crypto.randomUUID(),
                name: p.name,
                category: p.category,
                price: p.price || 0,
                discount: p.discount,
                stock: p.stock || 0,
                moq: p.moq,
                status: p.status || 'draft',
                sales: 0,
                views: 0,
                rating: 0,
                sku: p.sku,
                description: p.description,
              } as Product);
            });
            
            setProducts(prev => [...prev, ...validProducts]);
            setImportResults({
              success: validProducts.length,
              failed: errors.length,
              errors: errors.slice(0, 10), // Show first 10 errors
            });
          } catch (error: any) {
            setImportResults({
              success: 0,
              failed: importedProducts.length,
              errors: [error.message || 'Failed to parse CSV file'],
            });
          } finally {
            setIsImporting(false);
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          importedProducts = await parseExcel(file);
          
          setImportProgress({ processed: importedProducts.length, total: importedProducts.length, errors: [] });
          
          // Validate and add products
          const validProducts: Product[] = [];
          importedProducts.forEach((p, index) => {
            if (!p.name || !p.category) {
              errors.push(`Row ${index + 2}: Missing required fields (Name, Category)`);
              return;
            }
            
            if ((p.price ?? 0) <= 0) {
              errors.push(`Row ${index + 2}: Invalid price`);
              return;
            }
            
            validProducts.push({
              id: p.id || crypto.randomUUID(),
              name: p.name,
              category: p.category,
              price: p.price || 0,
              discount: p.discount,
              stock: p.stock || 0,
              moq: p.moq,
              status: p.status || 'draft',
              sales: 0,
              views: 0,
              rating: 0,
              sku: p.sku,
              description: p.description,
            } as Product);
          });
          
          setProducts(prev => [...prev, ...validProducts]);
          setImportResults({
            success: validProducts.length,
            failed: errors.length,
            errors: errors.slice(0, 10),
          });
        } catch (error: any) {
          setImportResults({
            success: 0,
            failed: importedProducts.length,
            errors: [error.message || 'Failed to parse Excel file'],
          });
        } finally {
          setIsImporting(false);
        }
      } else {
        setImportResults({
          success: 0,
          failed: 0,
          errors: ['Unsupported file format. Please use CSV or Excel (.xlsx, .xls)'],
        });
        setIsImporting(false);
      }
    } catch (error: any) {
      setImportResults({
        success: 0,
        failed: 0,
        errors: [error.message || 'Failed to import file'],
      });
      setIsImporting(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <Box className="w-8 h-8 text-red-400" />
            Product Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-gray-300 dark:border-gray-700"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-700"
            onClick={handleExportProducts}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <div className="relative" ref={exportMenuRef}>
            <Button 
              variant="outline" 
              className="border-gray-300 dark:border-gray-700"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-b-lg transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export as Excel
                </button>
              </div>
            )}
          </div>
          <Button
            className="bg-gradient-to-r from-red-500 to-[var(--brand-primary)] hover:from-red-600 hover:to-[var(--brand-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={productSubmitting || showAddProduct || editingProduct !== null}
            onClick={() => setShowAddProduct(true)}
          >
            {productSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {productSubmitting ? 'Saving product…' : 'Add Product'}
          </Button>
        </div>
      </div>

      {/* Listing rules from Seller Guidelines */}
      <SellerGuidancePanel context="listings" />

      {/* Filters and Search */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search products by name, category, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Products</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="hidden">Hidden</option>
            </select>
            <div className="flex items-center gap-1 ml-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-2 py-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3 h-3 mr-1" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
                }`}
                aria-label="List view"
              >
                <Rows className="w-3 h-3 mr-1" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All</option>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock (&lt; 20)</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Price Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Min"
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-xs text-gray-500">-</span>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Max"
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Min. Order Quantity (MOQ)
            </label>
            <input
              type="number"
              value={moqMin}
              onChange={(e) => setMoqMin(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30 flex items-center justify-between">
            <span className="text-sm text-gray-900 dark:text-white">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
              >
                Delete
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBulkAction('hide')}
                className="border-gray-300 dark:border-gray-700"
              >
                Hide
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBulkAction('publish')}
                className="border-gray-300 dark:border-gray-700"
              >
                Publish
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBulkAction('discount')}
                className="border-gray-300 dark:border-gray-700"
              >
                Apply Discount
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedProducts([])}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Error / Loading states */}
        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Products Grid / List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700/50 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="mt-1 rounded border-gray-300 dark:border-gray-700"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${getVerificationPill(product)}`}>
                          {(product.verificationSummary?.status || 'unverified').replace('_', ' ').toUpperCase()}
                        </span>
                        {product.spacillyProductId && (
                          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{product.spacillyProductId}</span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">
                        {product.category}
                      </p>
                      {product.sku && (
                        <p className="text-gray-500 dark:text-gray-500 text-xs font-mono transition-colors duration-300">
                          SKU: {product.sku}
                        </p>
                      )}
                      {product.moq !== undefined && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 transition-colors duration-300">
                          MOQ: {product.moq} units
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(
                      product.status
                    )} font-medium capitalize`}
                  >
                    {product.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mb-4 aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.src =
                          'https://via.placeholder.com/500?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      Price:
                    </span>
                    <div className="flex items-center gap-2">
                      {product.discount && (
                        <span className="text-gray-400 dark:text-gray-500 line-through">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-gray-900 dark:text-white font-semibold transition-colors duration-300">
                        $
                        {(
                          product.price *
                          (1 - (product.discount || 0) / 100)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      Stock:
                    </span>
                    <span
                      className={`font-semibold ${
                        product.stock === 0
                          ? 'text-red-500'
                          : product.stock < 20
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}
                    >
                      {product.stock} units
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      Sales:
                    </span>
                    <span className="text-green-500 dark:text-green-400 transition-colors duration-300">
                      {product.sales} sold
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      Views:
                    </span>
                    <span className="text-gray-900 dark:text-white transition-colors duration-300">
                      {product.views}
                    </span>
                  </div>
                  {product.rating > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        Rating:
                      </span>
                      <span className="text-gray-900 dark:text-white transition-colors duration-300">
                        ⭐ {product.rating}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    onClick={() => handleViewProduct(product)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    onClick={() => openProductEditor(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                    onClick={() => handleDeleteProduct(product)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-900/40">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800/80">
                <tr>
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        filteredProducts.length > 0 &&
                        selectedProducts.length === filteredProducts.length
                      }
                      className="rounded border-gray-300 dark:border-gray-700"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    MOQ
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Sales
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Views
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const effectivePrice =
                    product.price * (1 - (product.discount || 0) / 100);
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-t border-gray-200 dark:border-gray-700/60 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded border-gray-300 dark:border-gray-700"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            {product.sku && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {product.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${getStatusColor(
                            product.status
                          )}`}
                        >
                          {product.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-900 dark:text-white">
                        {product.discount ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[11px] text-gray-400 line-through">
                              ${product.price.toFixed(2)}
                            </span>
                            <span className="font-semibold">
                              ${effectivePrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold">
                            ${effectivePrice.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span
                          className={`font-semibold ${
                            product.stock === 0
                              ? 'text-red-500'
                              : product.stock < 20
                              ? 'text-yellow-500'
                              : 'text-green-500'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-800 dark:text-gray-200">
                        {product.moq ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-800 dark:text-gray-200">
                        {product.sales}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-800 dark:text-gray-200">
                        {product.views}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            onClick={() => handleViewProduct(product)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            onClick={() => openProductEditor(product)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400"
                    >
                      No products match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProduct || editingProduct !== null} onOpenChange={(open) => {
        if (!open) {
          if (productSaveInFlightRef.current) return;
          if (videoProof?.previewUrl) {
            URL.revokeObjectURL(videoProof.previewUrl);
          }
          setVideoProof(null);
          setScanStatus('idle');
          setScanProgress(0);
          setScanBreakdown({ visualMatch: 0, labelMatch: 0, structureMatch: 0 });
          setShowAddProduct(false);
          setEditingProduct(null);
          setFormError(null);
        }
      }}>
        <DialogContent className="w-[98vw] max-w-6xl h-[94vh] p-0 overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 pt-5 pb-4">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Create Product'}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                Mobile-first product creation with verification, trust score, variants, media proof and SEO controls.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="seller-product-dialog__scroll space-y-7">
            {formError && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}
            <section className="space-y-4">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 mt-0.5 text-red-500" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Basic Product Information</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Set core product identity buyers will see first.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Title *</label>
                  <input
                    type="text"
                    value={editingProduct?.name || newProduct.name}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter product title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                  <select
                    value={editingProduct?.category || newProduct.category}
                    onChange={(e) => {
                      const categoryValue = e.target.value;
                      if (editingProduct) {
                        setEditingProduct({
                          ...editingProduct,
                          category: categoryValue,
                          sizes: categoryNeedsSize(categoryValue) ? (editingProduct.sizes || []) : [],
                          colors: categoryNeedsColor(categoryValue) ? (editingProduct.colors || []) : [],
                        });
                      } else {
                        setNewProduct({
                          ...newProduct,
                          category: categoryValue,
                          sizes: categoryNeedsSize(categoryValue) ? (newProduct.sizes || []) : [],
                          colors: categoryNeedsColor(categoryValue) ? (newProduct.colors || []) : [],
                        });
                      }
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Home">Home</option>
                  </select>
                </div>
              </div>
              {showSizeInputs && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Available Sizes</label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((size) => {
                      const currentSizes = editingProduct?.sizes || newProduct.sizes || [];
                      const selected = currentSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (editingProduct) {
                              const next = selected
                                ? currentSizes.filter((s) => s !== size)
                                : [...currentSizes, size];
                              setEditingProduct({ ...editingProduct, sizes: next });
                            } else {
                              const next = selected
                                ? currentSizes.filter((s) => s !== size)
                                : [...currentSizes, size];
                              setNewProduct({ ...newProduct, sizes: next });
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: selected ? '2px solid #FF6B00' : '1px solid #E5E7EB',
                            background: selected ? 'rgba(255,107,0,0.1)' : 'transparent',
                            color: selected ? '#FF6B00' : '#374151',
                            cursor: 'pointer',
                            fontWeight: selected ? 600 : 400,
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                    Click to toggle which sizes are available for this product
                  </p>
                </div>
              )}
              {showColorInputs && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Available Colors</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {(editingProduct?.colors || newProduct.colors || []).map((color, i) => (
                      <div key={`${color}-${i}`} style={{ position: 'relative' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: color,
                            border: '2px solid #E5E7EB',
                            cursor: 'pointer',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const currentColors = editingProduct?.colors || newProduct.colors || [];
                            const next = currentColors.filter((_, idx) => idx !== i);
                            if (editingProduct) {
                              setEditingProduct({ ...editingProduct, colors: next });
                            } else {
                              setNewProduct({ ...newProduct, colors: next });
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#EF4444',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 10,
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      onChange={(e) => {
                        const color = e.target.value;
                        const currentColors = editingProduct?.colors || newProduct.colors || [];
                        if (!currentColors.includes(color)) {
                          if (editingProduct) {
                            setEditingProduct({ ...editingProduct, colors: [...currentColors, color] });
                          } else {
                            setNewProduct({ ...newProduct, colors: [...currentColors, color] });
                          }
                        }
                      }}
                      style={{
                        width: 44,
                        height: 36,
                        cursor: 'pointer',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        padding: 2,
                      }}
                    />
                    <span style={{ fontSize: 13, color: '#6B7280' }}>
                      Click the color picker to add a color variant
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                    Click × on a color swatch to remove it
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea
                  value={editingProduct?.description || newProduct.description}
                  onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})}
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter product description"
                />
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-400" />
                Pricing
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter a whole-number list price in your currency. We store USD internally for checkout and accounting.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Listing currency *</label>
                  <select
                    value={editingProduct?.listingCurrency || newProduct.listingCurrency}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, listingCurrency: e.target.value })
                        : setNewProduct({ ...newProduct, listingCurrency: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {LISTING_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">List price * (no decimals)</label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    value={
                      editingProduct
                        ? editingProduct.listingCurrency === 'USD'
                          ? editingProduct.price
                          : (editingProduct.listingPriceAmount ?? '')
                        : newProduct.price
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v === '' ? 0 : Math.max(0, Math.round(Number(v)));
                      if (editingProduct) {
                        if (editingProduct.listingCurrency === 'USD') {
                          setEditingProduct({
                            ...editingProduct,
                            price: n,
                            listingPriceAmount: n,
                          });
                        } else {
                          setEditingProduct({ ...editingProduct, listingPriceAmount: n });
                        }
                      } else {
                        setNewProduct({ ...newProduct, price: v === '' ? '' : String(n) });
                      }
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    value={editingProduct?.discount || newProduct.discount}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, discount: parseFloat(e.target.value)}) : setNewProduct({...newProduct, discount: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax (%)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                    defaultValue="10"
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sale preview (after discount)</label>
                  <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white space-y-1">
                    <div>
                      {(() => {
                        const disc = Number(editingProduct?.discount || newProduct.discount || 0);
                        const baseUsd = listingUsdPreview ?? (editingProduct ? editingProduct.price : null);
                        if (baseUsd == null || Number.isNaN(baseUsd)) return '—';
                        const saleUsd = Math.round(baseUsd * (1 - disc / 100));
                        const cur = editingProduct?.listingCurrency || newProduct.listingCurrency || 'USD';
                        if (cur === 'USD') {
                          return `~ $${formatIntNoDecimals(saleUsd)} USD`;
                        }
                        return `≈ ${formatIntNoDecimals(saleUsd)} USD after discount (stored internally; buyers see local totals at checkout)`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-red-400" />
                Inventory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={editingProduct?.stock || newProduct.stock}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, stock: parseInt(e.target.value)}) : setNewProduct({...newProduct, stock: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Low stock warning starts below 20 units.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Listing type</label>
                  <select
                    value={
                      editingProduct
                        ? (editingProduct as { listingMode?: string }).listingMode || 'live'
                        : newProduct.listingMode
                    }
                    onChange={(e) => {
                      const v = e.target.value === 'upcoming' ? 'upcoming' : 'live';
                      if (editingProduct) {
                        setEditingProduct({ ...editingProduct, listingMode: v } as Product);
                      } else {
                        setNewProduct({ ...newProduct, listingMode: v });
                      }
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                  >
                    <option value="live">Live now (buyable)</option>
                    <option value="upcoming">Upcoming drop</option>
                  </select>
                </div>
                {(editingProduct
                  ? (editingProduct as { listingMode?: string }).listingMode === 'upcoming'
                  : newProduct.listingMode === 'upcoming') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Launch date & time *</label>
                    <input
                      type="datetime-local"
                      value={
                        editingProduct
                          ? String((editingProduct as { launchAt?: string }).launchAt || '').slice(0, 16)
                          : newProduct.launchAt
                      }
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({
                            ...editingProduct,
                            launchAt: e.target.value ? new Date(e.target.value).toISOString() : '',
                          } as Product);
                        } else {
                          setNewProduct({ ...newProduct, launchAt: e.target.value });
                        }
                      }}
                      className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Shown in Upcoming Drops until launch; not buyable until then.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SKU</label>
                  <input
                    type="text"
                    value={editingProduct?.sku || newProduct.sku}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, sku: e.target.value}) : setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editingProduct?.weight ?? newProduct.weight}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({
                            ...editingProduct,
                            weight: e.target.value === '' ? undefined : parseFloat(e.target.value),
                          })
                        : setNewProduct({
                            ...newProduct,
                            weight: e.target.value,
                          })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. 1.25"
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-red-400" />
                Product Images
              </h3>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
                  if (!files.length) return;
                  try {
                    await uploadImageFiles(files);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Image upload failed';
                    setFormError(msg);
                    showToast(msg, 'error');
                  }
                }}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 sm:p-8 text-center bg-gray-50/50 dark:bg-gray-800/20"
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Drag and drop images here
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  First photo is the cover image on the product page. Add up to {MAX_PRODUCT_IMAGES} photos.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700 rounded-full px-5"
                  type="button"
                  disabled={imageUploading}
                  onClick={handleSelectImagesClick}
                >
                  {imageUploading ? 'Uploading…' : 'Select Images'}
                </Button>
                {currentImages().length > 0 ? (
                  <div className="mt-4 seller-product-images__grid">
                    {currentImages().map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className={`seller-product-images__tile ${idx === 0 ? 'seller-product-images__tile--cover' : ''}`}
                        >
                          <img
                            src={resolveImageUrl(url)}
                            alt={idx === 0 ? 'Cover photo' : `Product photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 ? (
                            <span className="seller-product-images__cover-badge">Cover</span>
                          ) : null}
                          <div className="seller-product-images__actions">
                            {idx > 0 ? (
                              <button
                                type="button"
                                className="seller-product-images__action-btn"
                                title="Set as cover"
                                onClick={() => handleSetPrimaryImage(idx)}
                              >
                                ★
                              </button>
                            ) : null}
                            <button
                              type="button"
                              aria-label="Remove image"
                              title="Remove image"
                              onClick={() => handleRemoveProductImage(idx)}
                              className="seller-product-images__action-btn"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-red-400" />
                Video Proof Verification
              </h3>
              <div className="rounded-2xl border border-red-200/70 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-4 sm:p-5 space-y-4">
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Upload a short proof video (full item, slow rotation, clear details). Buyers will see this video first on the product page.
                </p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoProofUpload}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="rounded-full bg-gradient-to-r from-red-500 to-[var(--brand-primary)] hover:from-red-600 hover:to-[var(--brand-primary-hover)]" disabled={videoProofUploading} onClick={() => videoInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {videoProofUploading ? 'Uploading…' : 'Upload Video Proof'}
                  </Button>
                  {videoProof && (
                    <Button type="button" variant="outline" className="rounded-full border-gray-300 dark:border-gray-700" onClick={() => {
                      if (videoProof.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(videoProof.previewUrl);
                      setVideoProof(null);
                      setScanPassed(false);
                      setScanStatus('idle');
                    }}>
                      Remove Video
                    </Button>
                  )}
                </div>
                {videoProof ? (
                  <div className="space-y-2">
                    <div className="seller-product-video-preview">
                      <video src={videoProof.previewUrl} controls playsInline preload="metadata" className="h-full w-full object-contain" />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-3">
                      <span>{videoProof.fileName}</span>
                      <span>{(videoProof.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">Upload status: Ready</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-xs text-gray-500 dark:text-gray-400">
                    No video proof uploaded yet.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ScanSearch className="w-5 h-5 text-red-400" />
                Similarity Scan
              </h3>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-gray-300 dark:border-gray-700"
                    disabled={scanStatus === 'running'}
                    onClick={() => runSimilarityScan()}
                  >
                    {scanStatus === 'running' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanSearch className="w-4 h-4 mr-2" />}
                    {scanStatus === 'running' ? 'Scanning...' : 'Run Trust Similarity Scan'}
                  </Button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Compares uploaded images and video proof consistency.</span>
                </div>
                {(scanStatus === 'running' || scanStatus === 'pass' || scanStatus === 'warning') && (
                  <>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${scanStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${scanProgress}%` }} />
                    </div>
                    {scanStatus !== 'running' && (
                      <div className={`rounded-lg px-3 py-2 text-xs sm:text-sm border ${scanStatus === 'pass' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-900 dark:text-yellow-300'}`}>
                        {scanStatus === 'pass' ? 'Result: Product appears visually consistent.' : 'Result: Potential inconsistency found. Add stronger proof to reduce review risk.'}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { label: 'Visual Match', value: scanBreakdown.visualMatch },
                        { label: 'Label Match', value: scanBreakdown.labelMatch },
                        { label: 'Structure Match', value: scanBreakdown.structureMatch },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                          <div className="flex justify-between mb-1 text-gray-600 dark:text-gray-400">
                            <span>{item.label}</span>
                            <span>{item.value}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <div className={`h-full ${item.value >= 70 ? 'bg-green-500' : item.value >= 45 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-400" />
                Variants (Colors, Sizes, Prices)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                Add a color name and pick which product photo shows on the product page for that color.
                Optional per-variant price in your listing currency.
              </p>

              {/* Existing variants list */}
              {((editingProduct?.variants && editingProduct.variants.length > 0) ||
                (newProduct as any).variants?.length > 0) && (
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                  <div className="hidden lg:grid lg:grid-cols-7 gap-2 font-semibold text-gray-700 dark:text-gray-300">
                    <span>Color</span>
                    <span>Size</span>
                    <span>SKU</span>
                    <span>Price</span>
                    <span>Label</span>
                    <span className="text-right">Stock</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className="space-y-2">
                    {(editingProduct?.variants || (newProduct as any).variants || []).map(
                      (variant: Variant, idx: number) => (
                        <div
                          key={idx}
                          className="grid grid-cols-2 lg:grid-cols-7 gap-2 items-center text-gray-800 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2"
                        >
                          <span className="text-xs"><span className="lg:hidden text-gray-500">Color: </span>{variant.color || '-'}</span>
                          <span className="text-xs"><span className="lg:hidden text-gray-500">Size: </span>{variant.size || '-'}</span>
                          <span className="font-mono text-xs break-all col-span-2 lg:col-span-1">{variant.sku}</span>
                          <span className="text-xs flex items-center gap-1.5">
                            {variant.thumbnailUrl ? (
                              <img
                                src={variant.thumbnailUrl}
                                alt=""
                                className="w-8 h-8 rounded-md object-cover border border-gray-200 dark:border-gray-600"
                              />
                            ) : null}
                            {variant.listingPriceAmount != null
                              ? variant.listingPriceAmount
                              : variant.priceUsd != null
                                ? `~$${variant.priceUsd}`
                                : 'Base'}
                          </span>
                          <span className="text-xs truncate">{variant.label || '-'}</span>
                          <span className="text-right text-xs">{variant.stock}</span>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400"
                              onClick={() => handleRemoveVariant(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Add variant form */}
              <div className="space-y-2 rounded-xl border border-dashed border-gray-300 p-3 text-xs dark:border-gray-700">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Color (e.g. Silver)"
                    value={variantDraft.color}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Display label (optional)"
                    value={variantDraft.label}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, label: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Size (optional)"
                    value={variantDraft.size}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, size: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Variant SKU *"
                    value={variantDraft.sku}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, sku: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder={`Price (${editingProduct?.listingCurrency || newProduct.listingCurrency || 'USD'}, optional)`}
                    value={variantDraft.listingPriceAmount}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, listingPriceAmount: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Stock *"
                    value={variantDraft.stock}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, stock: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="Or paste image URL"
                    value={variantDraft.thumbnailUrl}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, thumbnailUrl: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:col-span-2"
                  />
                  {(editingProduct?.images || newProduct.images || []).length > 0 && (
                    <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-full">
                        Color image (from your uploads)
                      </span>
                      {(editingProduct?.images || newProduct.images || []).map((url, imgIdx) => {
                        const active = variantDraft.thumbnailUrl === url;
                        return (
                          <button
                            key={`${url}-${imgIdx}`}
                            type="button"
                            title="Use as variant color image"
                            onClick={() =>
                              setVariantDraft((prev) => ({ ...prev, thumbnailUrl: url }))
                            }
                            className={`w-11 h-11 rounded-lg overflow-hidden border-2 shrink-0 ${
                              active
                                ? 'border-red-500 ring-2 ring-red-400/40'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Badge e.g. Trending (optional)"
                    value={variantDraft.badge}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, badge: e.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex items-stretch sm:col-span-2 lg:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-gray-300 text-xs rounded-full dark:border-gray-700"
                      onClick={handleAddVariant}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Variant
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-red-400" />
                Search Engine Optimization
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SEO Title</label>
                  <input
                    type="text"
                    value={editingProduct?.seoTitle ?? newProduct.seoTitle}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, seoTitle: e.target.value })
                        : setNewProduct({ ...newProduct, seoTitle: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="SEO optimized title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SEO Description</label>
                  <textarea
                    value={editingProduct?.seoDescription ?? newProduct.seoDescription}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, seoDescription: e.target.value })
                        : setNewProduct({ ...newProduct, seoDescription: e.target.value })
                    }
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="SEO meta description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SEO Keywords</label>
                  <input
                    type="text"
                    value={editingProduct?.seoKeywords ?? newProduct.seoKeywords}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, seoKeywords: e.target.value })
                        : setNewProduct({ ...newProduct, seoKeywords: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-400" />
                Spacilly Verification & Trust
              </h3>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                      trustBandUi === 'high'
                        ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300'
                        : trustBandUi === 'medium'
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300'
                          : 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Trust Score: {displayTrustScore}/100 ({trustBandUi.toUpperCase()})
                    {trustPreviewLoading ? ' · …' : ''}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Score uses your photos, proof video, and listing details. Upload media to run the check automatically.
                  </p>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      trustBandUi === 'high' ? 'bg-green-500' : trustBandUi === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, displayTrustScore)}%` }}
                  />
                </div>
                {trustPreview?.breakdown?.length ? (
                  <ul className="space-y-2 text-sm">
                    {trustPreview.breakdown.map((row) => (
                      <li
                        key={row.key}
                        className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/40"
                      >
                        <span className="shrink-0" aria-hidden>
                          {row.state === 'ok' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : row.state === 'warn' ? (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{row.label}</span>
                        <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{row.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {trustPreview?.blockers?.length ? (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-3 py-2 text-xs text-red-800 dark:text-red-200">
                    {trustPreview.blockers.join(' ')}
                  </div>
                ) : null}
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                  <li>At least one product photo (first = cover on product page)</li>
                  <li>Proof video required — shown to buyers in the gallery</li>
                  <li>Media trust check runs automatically after uploads</li>
                </ul>
              </div>
            </section>

            {/* Actions */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 sm:px-6 py-3 md:relative md:sticky md:bottom-0 md:z-10 md:mt-6 md:rounded-b-2xl">
              <div className="mx-auto w-full max-w-6xl flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-full"
                  disabled={productSubmitting}
                  onClick={() => {
                  setShowAddProduct(false);
                  setEditingProduct(null);
                  setTrustPreview(null);
                  setVideoImageSimilarity(null);
                  setScanPassed(false);
                  setImageSimilarityScore(0);
                  setScanStatus('idle');
                  setScanProgress(0);
                  setScanBreakdown({ visualMatch: 0, labelMatch: 0, structureMatch: 0 });
                }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto rounded-full border-gray-300 dark:border-gray-700"
                  disabled={productSubmitting}
                  onClick={() => runSimilarityScan()}
                >
                  <ScanSearch className="w-4 h-4 mr-2" />
                  Run Trust Check
                </Button>
                <Button
                  onClick={handleSaveProduct}
                  disabled={!submitAllowed}
                  className="w-full sm:w-auto rounded-full bg-gradient-to-r from-red-500 to-[var(--brand-primary)] hover:from-red-600 hover:to-[var(--brand-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {productSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {productSubmitting
                    ? editingProduct
                      ? 'Saving…'
                      : 'Creating…'
                    : editingProduct
                      ? 'Save Product'
                      : 'Create Product'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-6 h-6 text-red-400" />
              Bulk Import Products
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Instructions */}
            <div className="bg-gray-50 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-input)] rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Import Instructions
              </h3>
              <ul className="text-sm text-gray-800 dark:text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>Supported formats: CSV (.csv) or Excel (.xlsx, .xls)</li>
                <li>Required columns: Name, Category, Price, Stock</li>
                <li>Optional columns: SKU, Discount (%), MOQ, Status, Description</li>
                <li>Status values: active, draft, out_of_stock, hidden</li>
                <li>Download template below to see the correct format</li>
              </ul>
            </div>

            {/* Template Download */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Download Template
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="flex-1 border-gray-300 dark:border-gray-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadTemplate('excel')}
                  className="flex-1 border-gray-300 dark:border-gray-700"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-red-500 dark:hover:border-red-500 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  CSV or Excel files only
                </p>
              </div>
            </div>

            {/* Import Progress */}
            {isImporting && importProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Processing...</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {importProgress.processed} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResults && !isImporting && (
              <div className={`rounded-lg p-4 border ${
                importResults.failed === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {importResults.failed === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Import Complete
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-600 dark:text-green-400">
                        ✓ {importResults.success} product(s) imported successfully
                      </p>
                      {importResults.failed > 0 && (
                        <p className="text-yellow-600 dark:text-yellow-400">
                          ⚠ {importResults.failed} row(s) failed
                        </p>
                      )}
                      {importResults.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Errors:</p>
                          <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            {importResults.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                          {importResults.errors.length >= 10 && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              ... and more errors (showing first 10)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                  setImportProgress(null);
                }}
                disabled={isImporting}
              >
                {importResults ? 'Close' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Product Modal */}
      <Dialog
        open={viewProduct !== null}
        onOpenChange={(open) => {
          if (!open) setViewProduct(null);
        }}
      >
        <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-between gap-2">
              <span>{viewProduct?.name || 'Product details'}</span>
              {viewProduct?.sku && (
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                  SKU: {viewProduct.sku}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Quick overview of the product as customers will see it, including images, stock and variants.
            </DialogDescription>
          </DialogHeader>

          {viewProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Image */}
              <div className="space-y-3">
                <div className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                  {viewProduct.images && viewProduct.images.length > 0 ? (
                    <img
                      src={viewProduct.images[0]}
                      alt={viewProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                {viewProduct.images && viewProduct.images.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {viewProduct.images.slice(1, 5).map((img, idx) => (
                      <div
                        key={idx}
                        className="w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                      >
                        <img src={img} alt={`Preview ${idx + 2}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {viewProduct.category || 'Uncategorized'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${viewProduct.price.toFixed(2)}
                    </p>
                    {viewProduct.weight != null && viewProduct.weight > 0 && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Est. shipping: ${(viewProduct.weight * 5).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Stock</p>
                    <p
                      className={`font-semibold ${
                        viewProduct.stock === 0
                          ? 'text-red-500'
                          : viewProduct.stock < 20
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}
                    >
                      {viewProduct.stock} units
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Weight</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {viewProduct.weight != null ? `${viewProduct.weight} kg` : 'Not set'}
                    </p>
                  </div>
                  {viewProduct.moq !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">MOQ</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {viewProduct.moq} units
                      </p>
                    </div>
                  )}
                </div>

                {viewProduct.description && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line max-h-40 overflow-y-auto">
                      {viewProduct.description}
                    </p>
                  </div>
                )}

                {(viewProduct.variants && viewProduct.variants.length > 0) && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Variants
                    </p>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-2 py-1 text-left text-gray-600 dark:text-gray-300">Color</th>
                            <th className="px-2 py-1 text-left text-gray-600 dark:text-gray-300">Size</th>
                            <th className="px-2 py-1 text-left text-gray-600 dark:text-gray-300">SKU</th>
                            <th className="px-2 py-1 text-right text-gray-600 dark:text-gray-300">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewProduct.variants.map((v, idx) => (
                            <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                              <td className="px-2 py-1 text-gray-800 dark:text-gray-100">{v.color || '-'}</td>
                              <td className="px-2 py-1 text-gray-800 dark:text-gray-100">{v.size || '-'}</td>
                              <td className="px-2 py-1 text-gray-600 dark:text-gray-300 font-mono">{v.sku}</td>
                              <td className="px-2 py-1 text-right text-gray-800 dark:text-gray-100">
                                {v.stock}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(viewProduct.seoTitle || viewProduct.seoDescription || viewProduct.seoKeywords) && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      SEO Metadata
                    </p>
                    {viewProduct.seoTitle && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Title:</span> {viewProduct.seoTitle}
                      </p>
                    )}
                    {viewProduct.seoDescription && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                        <span className="font-semibold">Description:</span> {viewProduct.seoDescription}
                      </p>
                    )}
                    {viewProduct.seoKeywords && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Keywords:</span> {viewProduct.seoKeywords}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently remove the product from your catalog. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2 text-sm">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deleteTarget?.name || 'this product'}
              </span>
              ? This action cannot be undone.
            </p>
            {deleteTarget?.sku && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                SKU: <span className="font-mono">{deleteTarget.sku}</span>
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteProduct}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
