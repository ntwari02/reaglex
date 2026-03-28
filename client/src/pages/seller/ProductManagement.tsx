import React, { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, Edit, Trash2, Eye, Search, Filter, Upload, Download, X, Check, Image as ImageIcon, Tag, DollarSign, Package, Globe, LayoutGrid, Rows, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToastStore } from '@/stores/toastStore';
import * as XLSX from 'xlsx';
import SellerGuidancePanel from '@/components/seller/SellerGuidancePanel';
import { SERVER_URL, API_BASE_URL } from '@/lib/config';

const API_HOST = SERVER_URL;
const API_BASE = `${API_BASE_URL}/seller/inventory`;

type Variant = {
  color?: string;
  size?: string;
  sku: string;
  stock: number;
};

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discount?: number;
  stock: number;
  moq?: number;
  // UI status for display/filtering, derived from inventory state
  status: 'active' | 'draft' | 'out_of_stock' | 'hidden';
  sales: number;
  views: number;
  rating: number;
  images?: string[];
  description?: string;
  sku?: string;
  weight?: number;
  variants?: Variant[];
   seoTitle?: string;
   seoDescription?: string;
   seoKeywords?: string;
}

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
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; errors: string[] } | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useToastStore();
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    discount: '',
    stock: '',
    weight: '',
    sku: '',
    images: [] as string[],
    variants: [] as Variant[],
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });

  const [variantDraft, setVariantDraft] = useState({
    color: '',
    size: '',
    sku: '',
    stock: '',
  });

  const resolveImageUrl = (url: string): string => {
    if (!url) return url;
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${API_HOST}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      : { 'Content-Type': 'application/json' };
  };

  const mapApiProduct = (p: any): Product => ({
    id: p._id?.toString() || p.id?.toString(),
    name: p.name,
    category: p.category || 'Uncategorized',
    price: p.price,
    discount: p.discount,
    stock: p.stock,
    moq: p.moq,
    weight: p.weight,
    // Derive a simple UI status from stock level
    status: p.stock === 0 ? 'out_of_stock' : 'active',
    sales: 0,
    views: 0,
    rating: 0,
    images: Array.isArray(p.images) ? p.images.map(resolveImageUrl) : undefined,
    description: p.description,
    sku: p.sku,
    variants: p.variants,
  seoTitle: p.seoTitle,
  seoDescription: p.seoDescription,
  seoKeywords: p.seoKeywords,
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
    const priceValue = editingProduct
      ? editingProduct.price
      : newProduct.price ? parseFloat(newProduct.price) : NaN;

    if (!name || !sku || !sku.trim() || Number.isNaN(priceValue) || priceValue <= 0) {
      setFormError('Name, SKU and a valid positive price are required.');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
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
          price: editingProduct.price,
          discount: editingProduct.discount,
          moq: editingProduct.moq,
          images: editingProduct.images,
          variants: editingProduct.variants,
        };
        const response = await fetch(`${API_BASE}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setFormError(data.message || 'Failed to update product.');
          showToast(data.message || 'Failed to update product.', 'error');
          return;
        }
        showToast('Product updated successfully.', 'success');
      } else {
        // Create new product
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
          price: priceValue,
          discount: newProduct.discount
            ? parseFloat(newProduct.discount)
            : undefined,
          moq: (newProduct as any).moq
            ? parseInt((newProduct as any).moq, 10)
            : undefined,
          images: newProduct.images,
          variants: newProduct.variants,
        };
        const response = await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setFormError(data.message || 'Failed to create product.');
          showToast(data.message || 'Failed to create product.', 'error');
          return;
        }
        showToast('Product created successfully.', 'success');
      }

      await loadProducts();

      setShowAddProduct(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        description: '',
        category: '',
        price: '',
        discount: '',
        stock: '',
        weight: '',
        sku: '',
        images: [],
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
      });
      setVariantDraft({
        color: '',
        size: '',
        sku: '',
        stock: '',
      });
    } catch (e: any) {
      console.error('Save product failed:', e);
      const msg = e.message || 'Failed to save product.';
      setFormError(msg);
      showToast(msg, 'error');
    }
  };

  const handleSelectImagesClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });

    try {
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

      const urls: string[] = (data.urls || []).map((u: string) =>
        resolveImageUrl(u)
      );

      if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [...(editingProduct.images || []), ...urls],
        });
      } else {
        setNewProduct((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...urls],
        }));
      }
    } catch (e) {
      console.error('Image upload failed:', e);
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

    const newVariant: Variant = {
      color: variantDraft.color || undefined,
      size: variantDraft.size || undefined,
      sku: trimmedSku,
      stock: stockValue,
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

  const handleRemoveProductImage = (index: number) => {
    if (editingProduct) {
      const next = [...(editingProduct.images || [])];
      next.splice(index, 1);
      setEditingProduct({
        ...editingProduct,
        images: next,
      });
    } else {
      setNewProduct((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
  };

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
    
    return dataLines.map((line, index) => {
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
              
              if (p.price <= 0) {
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
            
            if (p.price <= 0) {
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
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            onClick={() => setShowAddProduct(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
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
                    onClick={() => setEditingProduct(product)}
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
                            onClick={() => setEditingProduct(product)}
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
          setShowAddProduct(false);
          setEditingProduct(null);
          setFormError(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Manage all product details, pricing, inventory, images, variants and SEO in one place.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {formError && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Title *</label>
                  <input
                    type="text"
                    value={editingProduct?.name || newProduct.name}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter product title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                  <select
                    value={editingProduct?.category || newProduct.category}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Home">Home</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea
                  value={editingProduct?.description || newProduct.description}
                  onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})}
                  rows={4}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter product description"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-400" />
                Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price *</label>
                  <input
                    type="number"
                    value={editingProduct?.price || newProduct.price}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, price: parseFloat(e.target.value)}) : setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    value={editingProduct?.discount || newProduct.discount}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, discount: parseFloat(e.target.value)}) : setNewProduct({...newProduct, discount: e.target.value})}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax (%)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                    defaultValue="10"
                  />
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-4">
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SKU</label>
                  <input
                    type="text"
                    value={editingProduct?.sku || newProduct.sku}
                    onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, sku: e.target.value}) : setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. 1.25"
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-red-400" />
                Product Images
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Upload product images
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
                  className="border-gray-300 dark:border-gray-700"
                  type="button"
                  onClick={handleSelectImagesClick}
                >
                  Select Images
                </Button>
                {(editingProduct?.images && editingProduct.images.length > 0) ||
                newProduct.images.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3 justify-center">
                    {(editingProduct?.images || newProduct.images).map(
                      (url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 group"
                        >
                          <img
                            src={resolveImageUrl(url)}
                            alt={`Product ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label="Remove image"
                            title="Remove image"
                            onClick={() => handleRemoveProductImage(idx)}
                            className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-md bg-black/70 text-white opacity-100 transition hover:bg-red-600 md:opacity-0 md:group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-400" />
                Variants (Colors, Sizes, etc.)
              </h3>

              {/* Existing variants list */}
              {((editingProduct?.variants && editingProduct.variants.length > 0) ||
                (newProduct as any).variants?.length > 0) && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800">
                  <div className="grid grid-cols-5 gap-2 font-semibold text-gray-700 dark:text-gray-300">
                    <span>Color</span>
                    <span>Size</span>
                    <span>SKU</span>
                    <span className="text-right">Stock</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className="space-y-2">
                    {(editingProduct?.variants || (newProduct as any).variants || []).map(
                      (variant: Variant, idx: number) => (
                        <div
                          key={idx}
                          className="grid grid-cols-5 gap-2 items-center text-gray-800 dark:text-gray-100"
                        >
                          <span>{variant.color || '-'}</span>
                          <span>{variant.size || '-'}</span>
                          <span className="font-mono">{variant.sku}</span>
                          <span className="text-right">{variant.stock}</span>
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
              <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3 text-xs dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">
                  Add variants for different colors / sizes. Each variant must have its own SKU and stock.
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <input
                    type="text"
                    placeholder="Color (optional)"
                    value={variantDraft.color}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Size (optional)"
                    value={variantDraft.size}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, size: e.target.value }))
                    }
                    className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Variant SKU *"
                    value={variantDraft.sku}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, sku: e.target.value }))
                    }
                    className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Stock *"
                    value={variantDraft.stock}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({ ...prev, stock: e.target.value }))
                    }
                    className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex items-stretch md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-gray-300 text-xs dark:border-gray-700"
                      onClick={handleAddVariant}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Variant
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="space-y-4">
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => {
                setShowAddProduct(false);
                setEditingProduct(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProduct}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                <Check className="w-4 h-4 mr-2" />
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Import Instructions
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
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
