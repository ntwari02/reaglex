import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Store,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Star,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';
import ProductForm from './products/ProductForm';
import ProductAnalytics from './products/ProductAnalytics';
import ProductModeration from './products/ProductModeration';
import ProductLogs from './products/ProductLogs';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InputDialog from '@/components/ui/InputDialog';
import { ToastContainer, useToast } from '@/components/ui/toast';

type ProductStatus = 'active' | 'inactive' | 'out_of_stock';
type VisibilityStatus = 'published' | 'draft';
type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc' | 'stock_asc' | 'stock_desc' | 'sales_asc' | 'sales_desc' | 'rating_asc' | 'rating_desc';

interface Product {
  id: string;
  name: string;
  sku: string;
  image: string;
  category: string;
  brand?: string;
  sellerName: string;
  stock: number;
  price: number;
  discountPrice?: number;
  discountPercent?: number;
  status: ProductStatus;
  visibility: VisibilityStatus;
  dateAdded: string;
  sales: number;
  rating: number;
  hasDiscount: boolean;
}

const mockProducts: Product[] = [
  {
    id: 'PROD-001',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WBH-001',
    image: '/placeholder-product.jpg',
    category: 'Electronics',
    brand: 'TechBrand',
    sellerName: 'TechHub Electronics',
    stock: 245,
    price: 79.99,
    discountPrice: 59.99,
    discountPercent: 25,
    status: 'active',
    visibility: 'published',
    dateAdded: '2024-01-15',
    sales: 1234,
    rating: 4.5,
    hasDiscount: true,
  },
  {
    id: 'PROD-002',
    name: 'Smart Watch Pro',
    sku: 'SWP-002',
    image: '/placeholder-product.jpg',
    category: 'Electronics',
    brand: 'TechBrand',
    sellerName: 'TechHub Electronics',
    stock: 0,
    price: 199.99,
    status: 'out_of_stock',
    visibility: 'published',
    dateAdded: '2024-03-10',
    sales: 892,
    rating: 4.8,
    hasDiscount: false,
  },
  {
    id: 'PROD-003',
    name: 'Laptop Stand Adjustable',
    sku: 'LSA-003',
    image: '/placeholder-product.jpg',
    category: 'Accessories',
    sellerName: 'HomeStyle',
    stock: 5,
    price: 49.99,
    status: 'active',
    visibility: 'draft',
    dateAdded: '2024-03-12',
    sales: 456,
    rating: 4.2,
    hasDiscount: false,
  },
];

export default function ProductManagementAdmin() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'analytics' | 'moderation' | 'logs'>('list');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<Record<string, 'top' | 'bottom'>>({});
  const [dropdownStyle, setDropdownStyle] = useState<Record<string, React.CSSProperties>>({});
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Dialog and Toast states
  const { toasts, showToast, removeToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
  });
  const [inputDialog, setInputDialog] = useState<{
    isOpen: boolean;
    title: string;
    label: string;
    placeholder?: string;
    type?: 'text' | 'number';
    min?: number;
    max?: number;
    onConfirm: (value: string) => void;
  }>({
    isOpen: false,
    title: '',
    label: '',
    onConfirm: () => {},
  });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityStatus | 'all'>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [stockRange, setStockRange] = useState<[number, number]>([0, 1000]);
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [discountFilter, setDiscountFilter] = useState<'all' | 'has' | 'none'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const sellers = Array.from(new Set(products.map((p) => p.sellerName)));

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesVisibility = visibilityFilter === 'all' || product.visibility === visibilityFilter;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesStock = product.stock >= stockRange[0] && product.stock <= stockRange[1];
      const matchesSeller = sellerFilter === 'all' || product.sellerName === sellerFilter;
      const matchesDiscount =
        discountFilter === 'all' ||
        (discountFilter === 'has' && product.hasDiscount) ||
        (discountFilter === 'none' && !product.hasDiscount);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesVisibility &&
        matchesPrice &&
        matchesStock &&
        matchesSeller &&
        matchesDiscount
      );
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'date_asc':
          return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        case 'date_desc':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        case 'stock_asc':
          return a.stock - b.stock;
        case 'stock_desc':
          return b.stock - a.stock;
        case 'sales_asc':
          return a.sales - b.sales;
        case 'sales_desc':
          return b.sales - a.sales;
        case 'rating_asc':
          return a.rating - b.rating;
        case 'rating_desc':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    products,
    searchQuery,
    categoryFilter,
    statusFilter,
    visibilityFilter,
    priceRange,
    stockRange,
    sellerFilter,
    discountFilter,
    sortBy,
  ]);

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredAndSortedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredAndSortedProducts.map((p) => p.id)));
    }
  };

  const calculateDropdownPosition = useCallback((productId: string) => {
    const button = buttonRefs.current[productId];
    const dropdown = dropdownRefs.current[productId];
    
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const dropdownWidth = 224; // w-56 = 14rem = 224px
    const approximateDropdownHeight = 320; // Approximate height for all menu items
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const spaceRight = window.innerWidth - buttonRect.right;
    const spaceLeft = buttonRect.left;

    // Calculate vertical position
    let top: number;
    let bottom: number | undefined;
    if (spaceBelow < approximateDropdownHeight && spaceAbove > spaceBelow) {
      // Open upward
      bottom = window.innerHeight - buttonRect.top + 8; // 8px gap (mt-2 = 8px)
      top = undefined;
      setDropdownPosition((prev) => ({ ...prev, [productId]: 'top' }));
    } else {
      // Open downward
      top = buttonRect.bottom + 8; // 8px gap (mt-2 = 8px)
      bottom = undefined;
      setDropdownPosition((prev) => ({ ...prev, [productId]: 'bottom' }));
    }

    // Calculate horizontal position - ensure dropdown doesn't overflow
    let left: number;
    let right: number | undefined;
    if (spaceRight < dropdownWidth && spaceLeft > spaceRight) {
      // Align to left edge of button
      right = window.innerWidth - buttonRect.left;
      left = undefined;
    } else {
      // Align to right edge of button (default)
      right = window.innerWidth - buttonRect.right;
      left = undefined;
    }

    // Set the style
    setDropdownStyle((prev) => ({
      ...prev,
      [productId]: {
        position: 'fixed',
        top: top !== undefined ? `${top}px` : undefined,
        bottom: bottom !== undefined ? `${bottom}px` : undefined,
        left: left !== undefined ? `${left}px` : undefined,
        right: right !== undefined ? `${right}px` : undefined,
        zIndex: 50,
      } as React.CSSProperties,
    }));

    // Recalculate after dropdown is rendered to get actual dimensions
    if (dropdown) {
      requestAnimationFrame(() => {
        const actualHeight = dropdown.offsetHeight;
        const actualWidth = dropdown.offsetWidth;
        const newButtonRect = button.getBoundingClientRect();
        const newSpaceBelow = window.innerHeight - newButtonRect.bottom;
        const newSpaceAbove = newButtonRect.top;
        const newSpaceRight = window.innerWidth - newButtonRect.right;
        const newSpaceLeft = newButtonRect.left;

        // Recalculate vertical
        let newTop: number;
        let newBottom: number | undefined;
        if (newSpaceBelow < actualHeight && newSpaceAbove > newSpaceBelow) {
          newBottom = window.innerHeight - newButtonRect.top + 8;
          newTop = undefined;
          setDropdownPosition((prev) => ({ ...prev, [productId]: 'top' }));
        } else {
          newTop = newButtonRect.bottom + 8;
          newBottom = undefined;
          setDropdownPosition((prev) => ({ ...prev, [productId]: 'bottom' }));
        }

        // Recalculate horizontal
        let newLeft: number;
        let newRight: number | undefined;
        if (newSpaceRight < actualWidth && newSpaceLeft > newSpaceRight) {
          newRight = window.innerWidth - newButtonRect.left;
          newLeft = undefined;
        } else {
          newRight = window.innerWidth - newButtonRect.right;
          newLeft = undefined;
        }

        setDropdownStyle((prev) => ({
          ...prev,
          [productId]: {
            position: 'fixed',
            top: newTop !== undefined ? `${newTop}px` : undefined,
            bottom: newBottom !== undefined ? `${newBottom}px` : undefined,
            left: newLeft !== undefined ? `${newLeft}px` : undefined,
            right: newRight !== undefined ? `${newRight}px` : undefined,
            zIndex: 50,
          } as React.CSSProperties,
        }));
      });
    }
  }, []);

  useEffect(() => {
    if (openDropdownId) {
      // Calculate position after dropdown is rendered
      setTimeout(() => {
        calculateDropdownPosition(openDropdownId);
      }, 10);
    }
  }, [openDropdownId, calculateDropdownPosition]);

  // Recalculate position on window resize or scroll
  useEffect(() => {
    if (!openDropdownId) return;

    const handleResize = () => {
      calculateDropdownPosition(openDropdownId);
    };

    const handleScroll = () => {
      calculateDropdownPosition(openDropdownId);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [openDropdownId, calculateDropdownPosition]);

  const handleBulkAction = (action: string) => {
    const productIds = Array.from(selectedProducts);
    if (productIds.length === 0) {
      showToast('Please select at least one product', 'warning');
      return;
    }

    switch (action) {
      case 'delete':
        setConfirmDialog({
          isOpen: true,
          title: 'Delete Products',
          message: `Are you sure you want to delete ${productIds.length} product(s)? This action cannot be undone.`,
          variant: 'danger',
          onConfirm: () => {
            setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
            setSelectedProducts(new Set());
            showToast(`${productIds.length} product(s) deleted successfully!`, 'success');
          },
        });
        break;
      case 'disable':
        setProducts((prev) =>
          prev.map((p) => (productIds.includes(p.id) ? { ...p, status: 'inactive' as ProductStatus } : p))
        );
        setSelectedProducts(new Set());
        showToast(`${productIds.length} product(s) disabled successfully!`, 'success');
        break;
      case 'out_of_stock':
        setProducts((prev) =>
          prev.map((p) => (productIds.includes(p.id) ? { ...p, status: 'out_of_stock' as ProductStatus } : p))
        );
        setSelectedProducts(new Set());
        showToast(`${productIds.length} product(s) marked as out of stock!`, 'success');
        break;
      case 'set_discount':
        setInputDialog({
          isOpen: true,
          title: 'Set Discount',
          label: 'Enter discount percentage (0-100):',
          placeholder: '0-100',
          type: 'number',
          min: 0,
          max: 100,
          onConfirm: (discountPercent) => {
            const discount = Number(discountPercent);
            setProducts((prev) =>
              prev.map((p) => {
                if (productIds.includes(p.id)) {
                  const discountPrice = p.price * (1 - discount / 100);
                  return {
                    ...p,
                    discountPrice,
                    discountPercent: discount,
                    hasDiscount: discount > 0,
                  };
                }
                return p;
              })
            );
            setSelectedProducts(new Set());
            showToast(`Discount applied to ${productIds.length} product(s)!`, 'success');
          },
        });
        break;
      case 'change_category':
        setInputDialog({
          isOpen: true,
          title: 'Change Category',
          label: 'Enter new category:',
          placeholder: 'Category name',
          type: 'text',
          onConfirm: (newCategory) => {
            if (newCategory.trim()) {
              setProducts((prev) =>
                prev.map((p) => (productIds.includes(p.id) ? { ...p, category: newCategory.trim() } : p))
              );
              setSelectedProducts(new Set());
              showToast(`Category changed for ${productIds.length} product(s)!`, 'success');
            }
          },
        });
        break;
      case 'change_seller':
        setInputDialog({
          isOpen: true,
          title: 'Change Seller',
          label: 'Enter new seller name:',
          placeholder: 'Seller name',
          type: 'text',
          onConfirm: (newSeller) => {
            if (newSeller.trim()) {
              setProducts((prev) =>
                prev.map((p) => (productIds.includes(p.id) ? { ...p, sellerName: newSeller.trim() } : p))
              );
              setSelectedProducts(new Set());
              showToast(`Seller changed for ${productIds.length} product(s)!`, 'success');
            }
          },
        });
        break;
      default:
        console.log(`Bulk ${action} for products:`, productIds);
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    const csvContent = [
      ['Product Name', 'SKU', 'Category', 'Brand', 'Seller', 'Stock', 'Price', 'Discount', 'Status', 'Visibility', 'Date Added'].join(','),
      ...filteredAndSortedProducts.map((p) =>
        [
          p.name,
          p.sku,
          p.category,
          p.brand || '',
          p.sellerName,
          p.stock,
          p.price,
          p.discountPercent || 0,
          p.status,
          p.visibility,
          p.dateAdded,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Products exported successfully!', 'success');
  };

  const handleImport = () => {
    // TODO: Implement CSV import
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // In a real app, you would parse the CSV and update products
        showToast(`Import functionality will be implemented. File selected: ${file.name}`, 'info');
      }
    };
    input.click();
  };

  const handleViewProduct = (product: Product) => {
    // TODO: Navigate to product detail page or open modal
    showToast(`Viewing product: ${product.name} (SKU: ${product.sku}, Price: $${product.price})`, 'info');
  };

  const handleDuplicateProduct = (product: Product) => {
    const duplicatedProduct: Product = {
      ...product,
      id: `PROD-${Date.now()}`,
      sku: `${product.sku}-COPY`,
      name: `${product.name} (Copy)`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setProducts((prev) => [...prev, duplicatedProduct]);
    showToast(`Product "${product.name}" duplicated successfully!`, 'success');
  };

  const handlePreviewProduct = (product: Product) => {
    // TODO: Open product preview in new tab or modal
    const previewUrl = `/products/${product.id}`;
    window.open(previewUrl, '_blank');
  };

  const handleDeleteProduct = (product: Product) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        showToast(`Product "${product.name}" deleted successfully!`, 'success');
      },
    });
  };

  const getStatusBadge = (status: ProductStatus) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getVisibilityBadge = (visibility: VisibilityStatus) => {
    const styles = {
      published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[visibility]}`}>{visibility}</span>
    );
  };

  if (activeView === 'analytics' && selectedProduct) {
    return (
      <ProductAnalytics
        productId={selectedProduct.id}
        onBack={() => {
          setActiveView('list');
          setSelectedProduct(null);
        }}
      />
    );
  }

  if (activeView === 'moderation') {
    return (
      <ProductModeration
        onBack={() => setActiveView('list')}
      />
    );
  }

  if (activeView === 'logs' && selectedProduct) {
    return (
      <ProductLogs
        productId={selectedProduct.id}
        onBack={() => {
          setActiveView('list');
          setSelectedProduct(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Products • Management</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all products across the platform</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Out of Stock</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {products.filter((p) => p.status === 'out_of_stock').length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Published</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {products.filter((p) => p.visibility === 'published').length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Draft</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {products.filter((p) => p.visibility === 'draft').length}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Search by name, SKU, seller, or category"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="price_asc">Price Low → High</option>
            <option value="price_desc">Price High → Low</option>
            <option value="stock_asc">Stock Low → High</option>
            <option value="stock_desc">Stock High → Low</option>
            <option value="sales_desc">Sales High → Low</option>
            <option value="sales_asc">Sales Low → High</option>
            <option value="rating_desc">Rating High → Low</option>
            <option value="rating_asc">Rating Low → High</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
                setVisibilityFilter('all');
                setPriceRange([0, 1000]);
                setStockRange([0, 1000]);
                setSellerFilter('all');
                setDiscountFilter('all');
              }}
              className="text-xs text-emerald-500 hover:text-emerald-600"
            >
              Clear all
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Visibility</label>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as VisibilityStatus | 'all')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Visibility</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Seller</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Sellers</option>
                {sellers.map((seller) => (
                  <option key={seller} value={seller}>
                    {seller}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Price Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Max"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Stock Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={stockRange[0]}
                  onChange={(e) => setStockRange([Number(e.target.value), stockRange[1]])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={stockRange[1]}
                  onChange={(e) => setStockRange([stockRange[0], Number(e.target.value)])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Max"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Discount</label>
              <select
                value={discountFilter}
                onChange={(e) => setDiscountFilter(e.target.value as 'all' | 'has' | 'none')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Products</option>
                <option value="has">Has Discount</option>
                <option value="none">No Discount</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {selectedProducts.size} product(s) selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('delete')}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                Delete
              </button>
              <button
                onClick={() => handleBulkAction('disable')}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Disable
              </button>
              <button
                onClick={() => handleBulkAction('out_of_stock')}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
              >
                Mark Out of Stock
              </button>
              <button
                onClick={() => handleBulkAction('set_discount')}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
              >
                Set Discount
              </button>
              <button
                onClick={() => handleBulkAction('change_category')}
                className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
              >
                Change Category
              </button>
              <button
                onClick={() => handleBulkAction('change_seller')}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
              >
                Change Seller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Date Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredAndSortedProducts.map((product) => (
                <tr
                  key={product.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-gray-500">{product.rating}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{product.sales} sales</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{product.sku}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{product.category}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{product.brand || '-'}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Store className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{product.sellerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{product.stock}</td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">${product.price.toFixed(2)}</p>
                      {product.discountPrice && (
                        <p className="text-xs text-gray-500 line-through">${product.discountPrice.toFixed(2)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {product.hasDiscount ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                        {product.discountPercent}% OFF
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(product.status)}</td>
                  <td className="px-4 py-4">{getVisibilityBadge(product.visibility)}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(product.dateAdded).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="relative flex items-center justify-end">
                      <button
                        ref={(el) => (buttonRefs.current[product.id] = el)}
                        onClick={() => setOpenDropdownId(openDropdownId === product.id ? null : product.id)}
                        className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-emerald-900/20 transition-colors"
                        title="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openDropdownId === product.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <div
                            ref={(el) => (dropdownRefs.current[product.id] = el)}
                            style={dropdownStyle[product.id]}
                            className="w-56 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setActiveView('analytics');
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                                  <span>View Analytics</span>
                                </div>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowAddProduct(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <Edit className="h-4 w-4 text-emerald-600" />
                                  <span>Edit Product</span>
                                </div>
                              </button>
                              <button
                                onClick={() => {
                                  handleViewProduct(product);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-blue-600" />
                                  <span>View Product</span>
                                </div>
                              </button>
                              <button
                                onClick={() => {
                                  handleDuplicateProduct(product);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <Copy className="h-4 w-4 text-purple-600" />
                                  <span>Duplicate Product</span>
                                </div>
                              </button>
                              <button
                                onClick={() => {
                                  handlePreviewProduct(product);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4 text-cyan-600" />
                                  <span>Preview on Customer Side</span>
                                </div>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setActiveView('logs');
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-indigo-600" />
                                  <span>View Logs</span>
                                </div>
                              </button>
                              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                              <button
                                onClick={() => {
                                  handleDeleteProduct(product);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <div className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete Product</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedProducts.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">No products found matching your filters.</p>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <ProductForm
          product={selectedProduct || undefined}
          onClose={() => {
            setShowAddProduct(false);
            setSelectedProduct(null);
          }}
          onSave={() => {
            setShowAddProduct(false);
            setSelectedProduct(null);
            // Reload products
          }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />

      {/* Input Dialog */}
      <InputDialog
        isOpen={inputDialog.isOpen}
        onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
        onConfirm={inputDialog.onConfirm}
        title={inputDialog.title}
        label={inputDialog.label}
        placeholder={inputDialog.placeholder}
        type={inputDialog.type}
        min={inputDialog.min}
        max={inputDialog.max}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
