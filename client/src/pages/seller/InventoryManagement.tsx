import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, Download, History, MapPin, Filter, X, Layers, DollarSign, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToastStore } from '@/stores/toastStore';
import { useNavigate } from 'react-router-dom';

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  description?: string;
  sku: string;
  stock: number;
  price: number;
  discount?: number;
  moq?: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  location?: string;
  weight?: number;
  variants?: { color?: string; size?: string; sku: string; stock: number }[];
  tiers?: { minQty: number; maxQty?: number; price: number }[];
}

interface StockHistory {
  id: string;
  productName: string;
  sku: string;
  change: number;
  reason: string;
  date: string;
  type: 'added' | 'removed' | 'sold';
}

interface Warehouse {
  id: string;
  name: string;
  address: string;
  capacity: number;
  currentStock: number;
  capacityUnit?: string;
  isDefault?: boolean;
}

const InventoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'warehouse' | 'history' | 'variants'>('stock');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProduct, setNewProduct] = useState<
    Omit<InventoryItem, 'id' | 'variants' | 'tiers'>
  >({
    name: '',
    category: '',
    description: '',
    sku: '',
    stock: 0,
    price: 0,
    location: '',
    discount: 0,
    moq: 0,
    status: 'in_stock',
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState<
    Omit<Warehouse, 'id'>
  >({
    name: '',
    address: '',
    capacity: 0,
    currentStock: 0,
    capacityUnit: 'units',
    isDefault: false,
  });
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const API_BASE = 'http://localhost:5000/api/seller/inventory';
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [warehouseDetail, setWarehouseDetail] = useState<Warehouse | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<InventoryItem | null>(null);
  const [deleteWarehouseTarget, setDeleteWarehouseTarget] = useState<Warehouse | null>(null);

  const getDefaultWarehouseName = (): string | undefined => {
    const def = warehouses.find((w) => w.isDefault);
    return def?.name;
  };

  // Load inventory data from backend (real-time-ish with fast polling + focus refresh)
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (cancelled) return;

      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const [productsRes, warehousesRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/products`, {
            method: 'GET',
            headers,
            credentials: 'include',
          }),
          fetch(`${API_BASE}/warehouses`, {
            method: 'GET',
            headers,
            credentials: 'include',
          }),
          fetch(`${API_BASE}/history`, {
            method: 'GET',
            headers,
            credentials: 'include',
          }),
        ]);

        if (!productsRes.ok) {
          throw new Error('Failed to load products');
        }
        if (!warehousesRes.ok) {
          throw new Error('Failed to load warehouses');
        }
        if (!historyRes.ok) {
          throw new Error('Failed to load stock history');
        }

        const productsData = await productsRes.json();
        const warehousesData = await warehousesRes.json();
        const historyData = await historyRes.json();

        if (cancelled) return;

        setInventory(
          (productsData.products || []).map((p: any) => ({
            id: p._id?.toString() ?? p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            sku: p.sku,
            stock: p.stock,
            price: p.price,
            discount: p.discount,
            moq: p.moq,
            status: p.status,
            location: p.location,
            weight: p.weight,
            variants: p.variants || [],
            tiers: p.tiers || [],
          }))
        );

        setWarehouses(
          (warehousesData.warehouses || []).map((w: any) => ({
            id: w._id?.toString() ?? w.id,
            name: w.name,
            address: w.address,
            capacity: w.capacity,
            currentStock: w.currentStock,
            capacityUnit: w.capacityUnit || 'units',
            isDefault: !!w.isDefault,
          }))
        );

        setStockHistory(
          (historyData.history || []).map((h: any) => ({
            id: h._id?.toString() ?? h.id,
            productName: h.productName,
            sku: h.sku,
            change: h.change,
            reason: h.reason,
            date: new Date(h.date).toISOString().slice(0, 10),
            type: h.type,
          }))
        );

        setLastUpdated(new Date());
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load inventory data:', error);
        showToast('Failed to load inventory data. Please try again.', 'error');
      }
    };

    // Initial load
    fetchData();

    // Fast polling every 3 seconds
    const intervalId = window.setInterval(fetchData, 3000);

    // Extra refresh when tab/browser gains focus
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [showToast, API_BASE]);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock');
  const outOfStockItems = inventory.filter(item => item.status === 'out_of_stock');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'low_stock': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'out_of_stock': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Product edit & tiered pricing state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // CSV export
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map(item => item.id));
    }
  };

  const openEditModal = (item: InventoryItem) => {
    // Work on a shallow copy so edits are local until saved
    setEditingItem({
      ...item,
      tiers: item.tiers ? [...item.tiers] : [],
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const updateEditingTier = (index: number, field: 'minQty' | 'maxQty' | 'price', value: string) => {
    if (!editingItem) return;
    const tiers = editingItem.tiers ? [...editingItem.tiers] : [];
    const parsed = value === '' ? undefined : Number(value);

    if (!tiers[index]) {
      tiers[index] = { minQty: 1, price: editingItem.price };
    }

    if (field === 'price' && parsed !== undefined) {
      tiers[index] = { ...tiers[index], price: parsed };
    } else if (field === 'minQty' && parsed !== undefined) {
      tiers[index] = { ...tiers[index], minQty: parsed };
    } else if (field === 'maxQty') {
      tiers[index] = { ...tiers[index], maxQty: parsed };
    }

    setEditingItem({ ...editingItem, tiers });
  };

  const addTierRow = () => {
    if (!editingItem) return;
    const tiers = editingItem.tiers ? [...editingItem.tiers] : [];
    tiers.push({
      minQty: tiers.length > 0 ? tiers[tiers.length - 1].minQty + 1 : 1,
      price: editingItem.price,
    });
    setEditingItem({ ...editingItem, tiers });
  };

  // Calculate total load for a warehouse based on product weight * quantity.
  const getWarehouseStock = (warehouse: Warehouse): number => {
    const name = (warehouse.name || '').toLowerCase();

    return inventory.reduce((sum, item) => {
      const loc = (item.location || '').toLowerCase();
      const belongsToWarehouse =
        loc === name || (!loc && warehouse.isDefault);

      if (!belongsToWarehouse) return sum;

      // If weight is not set for a product yet, fall back to 0 so it doesn't distort
      // weight-based capacity calculations. Encourage setting weight per product.
      const unitWeight = item.weight ?? 0;
      return sum + unitWeight * (item.stock || 0);
    }, 0);
  };

  const removeTierRow = (index: number) => {
    if (!editingItem || !editingItem.tiers) return;
    const tiers = editingItem.tiers.filter((_, i) => i !== index);
    setEditingItem({ ...editingItem, tiers });
  };

  const handleSaveProduct = async () => {
    if (!editingItem) return;

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/seller/inventory/products/${editingItem.id}`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: editingItem.name,
            category: editingItem.category,
            description: editingItem.description,
            sku: editingItem.sku,
            stock: editingItem.stock,
            price: editingItem.price,
            discount: editingItem.discount,
            moq: editingItem.moq,
            status: editingItem.status,
            location: editingItem.location,
            variants: editingItem.variants,
            tiers: editingItem.tiers,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update product');
      }

      const data = await response.json();
      const updated = data.product;

      setInventory((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                id: updated._id?.toString() ?? updated.id,
                name: updated.name,
                category: updated.category,
                description: updated.description,
                sku: updated.sku,
                stock: updated.stock,
                price: updated.price,
                discount: updated.discount,
                moq: updated.moq,
                status: updated.status,
                location: updated.location,
                variants: updated.variants || [],
                tiers: updated.tiers || [],
              }
            : item
        )
      );

      showToast('Product updated successfully.', 'success');
      closeEditModal();
    } catch (error: any) {
      console.error('Failed to update product:', error);
      showToast(error.message || 'Failed to update product.', 'error');
    }
  };

  const handleSaveLocation = async () => {
    if (!newWarehouse.name.trim() || !newWarehouse.address.trim()) {
      showToast('Name and address are required for a location.', 'error');
      return;
    }

    if (newWarehouse.capacity <= 0) {
      showToast('Capacity must be a positive number.', 'error');
      return;
    }

    if (newWarehouse.currentStock < 0 || newWarehouse.currentStock > newWarehouse.capacity) {
      showToast('Current stock must be between 0 and capacity.', 'error');
      return;
    }

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('http://localhost:5000/api/seller/inventory/warehouses', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: newWarehouse.name.trim(),
          address: newWarehouse.address.trim(),
          capacity: newWarehouse.capacity,
          currentStock: newWarehouse.currentStock,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create location');
      }

      const created = data.warehouse;

      setWarehouses((prev) => [
        {
          id: created._id?.toString() ?? created.id,
          name: created.name,
          address: created.address,
          capacity: created.capacity,
          currentStock: created.currentStock,
          capacityUnit: newWarehouse.capacityUnit,
          isDefault: !!created.isDefault,
        },
        ...prev,
      ]);

      showToast('Location created successfully.', 'success');
      setShowLocationModal(false);
      setNewWarehouse({
        name: '',
        address: '',
        capacity: 0,
        currentStock: 0,
      });
    } catch (error: any) {
      console.error('Failed to create location:', error);
      showToast(error.message || 'Failed to create location.', 'error');
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingWarehouse) return;

    if (!editingWarehouse.name.trim() || !editingWarehouse.address.trim()) {
      showToast('Name and address are required for a location.', 'error');
      return;
    }

    if (editingWarehouse.capacity <= 0) {
      showToast('Capacity must be a positive number.', 'error');
      return;
    }

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/seller/inventory/warehouses/${editingWarehouse.id}`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: editingWarehouse.name.trim(),
            address: editingWarehouse.address.trim(),
            capacity: editingWarehouse.capacity,
            currentStock: editingWarehouse.currentStock,
            isDefault: editingWarehouse.isDefault,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update location');
      }

      const updated = data.warehouse;

      setWarehouses((prev) =>
        prev.map((w) =>
          w.id === editingWarehouse.id
            ? {
                id: updated._id?.toString() ?? updated.id,
                name: updated.name,
                address: updated.address,
                capacity: updated.capacity,
                currentStock: updated.currentStock,
                capacityUnit: editingWarehouse.capacityUnit || w.capacityUnit || 'units',
                isDefault: !!updated.isDefault && w.id === (updated._id?.toString() ?? updated.id),
              }
            : w
        )
      );

      showToast('Location updated successfully.', 'success');
      setEditingWarehouse(null);
    } catch (error: any) {
      console.error('Failed to update location:', error);
      showToast(error.message || 'Failed to update location.', 'error');
    }
  };

  const handleSetDefaultWarehouse = async (warehouse: Warehouse) => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/seller/inventory/warehouses/${warehouse.id}`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            isDefault: true,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set default location');
      }

      const updated = data.warehouse;
      const updatedId = updated._id?.toString() ?? updated.id;

      setWarehouses((prev) =>
        prev.map((w) => ({
          ...w,
          isDefault: w.id === updatedId ? !!updated.isDefault : false,
        }))
      );

      showToast('Default location updated.', 'success');
    } catch (error: any) {
      console.error('Failed to set default location:', error);
      showToast(error.message || 'Failed to set default location.', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/seller/inventory/products/${id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete product');
      }

      setInventory((prev) => prev.filter((item) => item.id !== id));
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
      showToast('Product deleted successfully.', 'success');
      setDeleteProductTarget(null);
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      showToast(error.message || 'Failed to delete product.', 'error');
    }
  };

  const confirmDeleteSelectedProduct = () => {
    if (deleteProductTarget) {
      handleDeleteProduct(deleteProductTarget.id);
    }
  };

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(
        `${API_BASE}/warehouses/${warehouse.id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete location');
      }

      setWarehouses((prev) => prev.filter((w) => w.id !== warehouse.id));
      showToast('Location deleted successfully.', 'success');
      setDeleteWarehouseTarget(null);
    } catch (error: any) {
      console.error('Failed to delete warehouse:', error);
      showToast(error.message || 'Failed to delete location.', 'error');
    }
  };

  const handleExportCsv = () => {
    const header = [
      'id',
      'name',
      'sku',
      'stock',
      'price',
      'status',
      'location',
    ].join(',');

    const rows = inventory.map((item) =>
      [
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        item.sku,
        item.stock,
        item.price.toFixed(2),
        item.status,
        item.location ?? '',
      ].join(',')
    );

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input (reserved for future features) */}
      <input type="file" ref={fileInputRef} className="hidden" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <Package className="w-8 h-8 text-red-400" />
            Inventory Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Manage your product inventory and stock levels</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Last updated at {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-700"
            onClick={handleExportCsv}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            onClick={() => navigate('/seller/products')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
              {outOfStockItems.length > 0 && `${outOfStockItems.length} items out of stock`}
              {outOfStockItems.length > 0 && lowStockItems.length > 0 && ' • '}
              {lowStockItems.length > 0 && `${lowStockItems.length} items low on stock`}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700/30">
        {[
          { id: 'stock', label: 'Stock Management' },
          { id: 'warehouse', label: 'Warehouse/Location' },
          { id: 'history', label: 'Inventory History' },
          { id: 'variants', label: 'Variants & SKUs' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors duration-300 border-b-2 ${
              activeTab === tab.id
                ? 'border-red-500 text-red-500 dark:text-red-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Management Tab */}
      {activeTab === 'stock' && (
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-300"
              />
            </div>
            {selectedItems.length > 0 && null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
                  <th className="text-left py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredInventory.length && filteredInventory.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-700"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Product Name</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">SKU</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Stock</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Weight</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Location</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Price</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Status</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-gray-200 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-300 ${
                      item.status === 'out_of_stock' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded border-gray-300 dark:border-gray-700"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {item.status === 'out_of_stock' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {item.status === 'low_stock' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        <span className="text-gray-900 dark:text-white font-medium transition-colors duration-300">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400 transition-colors duration-300">{item.sku}</td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white transition-colors duration-300">{item.stock} units</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-xs transition-colors duration-300">
                      {item.weight != null && item.weight > 0
                        ? `${item.weight} kg / unit`
                        : '—'}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      {item.location || getDefaultWarehouseName() || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white transition-colors duration-300">${item.price.toFixed(2)}</td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(item.status)} font-medium`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          onClick={() => setDeleteProductTarget(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warehouse/Location Management Tab */}
      {activeTab === 'warehouse' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Storage Locations</h2>
            <Button
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              onClick={() => setShowLocationModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((warehouse, index) => {
              const stock = getWarehouseStock(warehouse);
              const unit = warehouse.capacityUnit || 'units';
              const percent =
                warehouse.capacity > 0 ? Math.min(100, (stock / warehouse.capacity) * 100) : 0;

              return (
                <motion.div
                  key={warehouse.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300 cursor-pointer"
                  onClick={() => setWarehouseDetail(warehouse)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-400" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white transition-colors duration-300">
                            {warehouse.name}
                          </h3>
                          {warehouse.isDefault && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="w-3 h-3 fill-current" />
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!warehouse.isDefault && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px] border-amber-300 text-amber-700 dark:border-amber-500 dark:text-amber-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultWarehouse(warehouse);
                          }}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Make default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWarehouse(warehouse);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteWarehouseTarget(warehouse);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-300">
                    {warehouse.address}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        Capacity ({unit})
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                        {warehouse.capacity} {unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        Current Load
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                        {stock} {unit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {percent.toFixed(0)}% used • {Math.max(warehouse.capacity - stock, 0).toFixed(2)} {unit} free
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
              <History className="w-6 h-6 text-red-400" />
              Stock Change Logs
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                <option>All Changes</option>
                <option>Added</option>
                <option>Removed</option>
                <option>Sold</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {stockHistory.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 transition-colors duration-300"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      entry.type === 'added' ? 'bg-green-500' : 
                      entry.type === 'sold' ? 'bg-blue-500' : 
                      'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white transition-colors duration-300">{entry.productName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">{entry.sku} • {entry.reason}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    entry.type === 'added' ? 'text-green-500' : 
                    entry.type === 'sold' ? 'text-blue-500' : 
                    'text-red-500'
                  }`}>
                    {entry.type === 'added' ? '+' : ''}{entry.change}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{entry.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Variants & SKUs Tab */}
      {activeTab === 'variants' && (
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">Product Variants & SKUs</h2>
          <div className="space-y-6">
            {inventory.filter(item => item.variants && item.variants.length > 0).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300"
              >
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">{item.name}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700/30">
                        <th className="text-left py-2 px-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">Color</th>
                        <th className="text-left py-2 px-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">Size</th>
                        <th className="text-left py-2 px-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">SKU</th>
                        <th className="text-left py-2 px-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">Stock</th>
                        <th className="text-right py-2 px-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.variants?.map((variant, vIndex) => (
                        <tr key={vIndex} className="border-b border-gray-200 dark:border-gray-700/30">
                          <td className="py-2 px-3 text-gray-900 dark:text-white">{variant.color || 'N/A'}</td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white">{variant.size || 'N/A'}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 font-mono text-sm">{variant.sku}</td>
                          <td className="py-2 px-3">
                            <span className={`text-sm px-2 py-1 rounded ${
                              variant.stock === 0 ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                              variant.stock < 10 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                              'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            }`}>
                              {variant.stock} units
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-600 dark:text-gray-400"
                                onClick={() => openEditModal(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      <Dialog
        open={showLocationModal}
        onOpenChange={(open) => {
          if (!open) setShowLocationModal(false);
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Add Storage Location
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Create a new warehouse or storage location for your inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={newWarehouse.name}
                onChange={(e) =>
                  setNewWarehouse((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. Main Warehouse A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address *
              </label>
              <textarea
                value={newWarehouse.address}
                onChange={(e) =>
                  setNewWarehouse((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                rows={3}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Street, city, country"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacity Unit
                </label>
                <select
                  value={newWarehouse.capacityUnit}
                  onChange={(e) =>
                    setNewWarehouse((prev) => ({
                      ...prev,
                      capacityUnit: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="units">Units</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="m2">Square meters (m²)</option>
                  <option value="m3">Cubic meters (m³)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacity (units) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={newWarehouse.capacity || ''}
                  onChange={(e) =>
                    setNewWarehouse((prev) => ({
                      ...prev,
                      capacity: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Stock
                </label>
                <input
                  type="number"
                  min={0}
                  value={newWarehouse.currentStock || ''}
                  onChange={(e) =>
                    setNewWarehouse((prev) => ({
                      ...prev,
                      currentStock: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0"
                />
              </div>
            </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
                onClick={() => setShowLocationModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                onClick={handleSaveLocation}
              >
                Save Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Location Modal */}
      <Dialog
        open={editingWarehouse !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWarehouse(null);
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Storage Location
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Update warehouse details. Current stock is calculated automatically from products.
            </DialogDescription>
          </DialogHeader>

          {editingWarehouse && (
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={editingWarehouse.name}
                  onChange={(e) =>
                    setEditingWarehouse((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address *
                </label>
                <textarea
                  value={editingWarehouse.address}
                  onChange={(e) =>
                    setEditingWarehouse((prev) =>
                      prev ? { ...prev, address: e.target.value } : prev
                    )
                  }
                  rows={3}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity Unit
                  </label>
                  <select
                    value={editingWarehouse.capacityUnit || 'units'}
                    onChange={(e) =>
                      setEditingWarehouse((prev) =>
                        prev ? { ...prev, capacityUnit: e.target.value } : prev
                      )
                    }
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="units">Units</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="m2">Square meters (m²)</option>
                    <option value="m3">Cubic meters (m³)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Capacity (units) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editingWarehouse.capacity || ''}
                      onChange={(e) =>
                        setEditingWarehouse((prev) =>
                          prev ? { ...prev, capacity: Number(e.target.value) || 0 } : prev
                        )
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Stock (auto)
                    </label>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white flex items-center justify-between">
                      <span>{getWarehouseStock(editingWarehouse)}</span>
                      <span className="text-xs text-gray-500">
                        {editingWarehouse.capacityUnit || 'units'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                  onClick={() => setEditingWarehouse(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  onClick={handleUpdateLocation}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warehouse Detail Modal */}
      <Dialog
        open={warehouseDetail !== null}
        onOpenChange={(open) => {
          if (!open) setWarehouseDetail(null);
        }}
      >
        <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {warehouseDetail?.name || 'Warehouse details'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Products currently assigned to this storage location, including quantities and weight.
            </DialogDescription>
          </DialogHeader>

          {warehouseDetail && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Address:</span> {warehouseDetail.address}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Capacity:</span> {warehouseDetail.capacity}{' '}
                {warehouseDetail.capacityUnit || 'units'}
              </p>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Product
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        SKU
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Weight / unit
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Total weight
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .filter((item) => {
                        const loc = (item.location || '').toLowerCase();
                        const name = (warehouseDetail.name || '').toLowerCase();
                        return loc === name || (!loc && warehouseDetail.isDefault);
                      })
                      .map((item) => {
                        const unitWeight = item.weight ?? 0;
                        const totalWeight = unitWeight * (item.stock || 0);
                        return (
                          <tr
                            key={item.id}
                            className="border-t border-gray-200 dark:border-gray-700"
                          >
                            <td className="px-3 py-2 text-gray-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono">
                              {item.sku}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                              {item.stock}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                              {unitWeight ? `${unitWeight} kg` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                              {totalWeight ? `${totalWeight.toFixed(2)} kg` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete product confirmation */}
      <Dialog
        open={deleteProductTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProductTarget(null);
        }}
      >
        <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deleteProductTarget?.name || 'this product'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
              onClick={() => setDeleteProductTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteSelectedProduct}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete warehouse confirmation */}
      <Dialog
        open={deleteWarehouseTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteWarehouseTarget(null);
        }}
      >
        <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              Delete Location
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deleteWarehouseTarget?.name || 'this location'}
              </span>
              ? Products assigned to this location will no longer be linked to it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
              onClick={() => setDeleteWarehouseTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteWarehouseTarget) {
                  handleDeleteWarehouse(deleteWarehouseTarget);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Edit / Tiered Pricing Modal (styled like Products page dialog) */}
      <Dialog open={showEditModal} onOpenChange={(open) => (open ? setShowEditModal(true) : closeEditModal())}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <DialogHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                <Layers className="w-5 h-5 text-red-400" />
                Edit Product & B2B Pricing
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Adjust core inventory details and configure tiered pricing for volume-based B2B orders.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={closeEditModal}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-6 mt-2">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) =>
                        setEditingItem((prev) => prev ? { ...prev, name: e.target.value } : prev)
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter product title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={editingItem.category || ''}
                      onChange={(e) =>
                        setEditingItem((prev) => prev ? { ...prev, category: e.target.value } : prev)
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g. Electronics"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : prev
                        )
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      value={editingItem.discount ?? 0}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, discount: Number(e.target.value) || 0 } : prev
                        )
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={editingItem.stock}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, stock: Number(e.target.value) || 0 } : prev
                        )
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={editingItem.sku}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, sku: e.target.value } : prev
                        )
                      }
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="SKU-001"
                    />
                  </div>
                </div>
              </div>

              {/* Tiered pricing editor */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      Tiered Pricing (B2B)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Define volume breaks and discounted unit prices for qualified buyers.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-dashed border-gray-300 dark:border-gray-600"
                    onClick={addTierRow}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Tier
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr className="border-b border-gray-200 dark:border-gray-700/60">
                        <th className="text-left py-2 px-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                          Min Qty
                        </th>
                        <th className="text-left py-2 px-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                          Max Qty (optional)
                        </th>
                        <th className="text-left py-2 px-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                          Unit Price
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editingItem.tiers || []).map((tier, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800/60">
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min={1}
                              value={tier.minQty}
                              onChange={(e) =>
                                updateEditingTier(index, 'minQty', e.target.value)
                              }
                              className="w-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min={tier.minQty}
                              value={tier.maxQty ?? ''}
                              onChange={(e) =>
                                updateEditingTier(index, 'maxQty', e.target.value)
                              }
                              placeholder="No upper limit"
                              className="w-32 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">$</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={tier.price}
                                onChange={(e) =>
                                  updateEditingTier(index, 'price', e.target.value)
                                }
                                className="w-28 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={() => removeTierRow(index)}
                              aria-label="Remove tier"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {(editingItem.tiers?.length ?? 0) === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 px-3 text-xs text-gray-500 dark:text-gray-400 text-center"
                          >
                            No tiered pricing defined yet. Use "Add Tier" to create volume
                            discounts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                  These pricing tiers are local to this session and can be exported via CSV for
                  further processing in your B2B systems.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 dark:border-gray-700"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    onClick={handleSaveProduct}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Product Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => setShowCreateModal(open)}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product in your inventory. You can configure variants and tiered pricing later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={newProduct.category || ''}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    category: e.target.value,
                  }))
                }
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="e.g. Electronics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Description
              </label>
              <textarea
                required
                value={newProduct.description || ''}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                rows={3}
                placeholder="Short description of the product"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                SKU
              </label>
              <input
                type="text"
                required
                value={newProduct.sku}
                onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Unique SKU code"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, stock: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Price (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct((p) => ({
                      ...p,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newProduct.discount ?? 0}
                  onChange={(e) =>
                    setNewProduct((p) => ({
                      ...p,
                      discount: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Minimum Order Qty (MOQ)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newProduct.moq ?? 0}
                  onChange={(e) =>
                    setNewProduct((p) => ({
                      ...p,
                      moq: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Location
              </label>
              <input
                type="text"
                required
                value={newProduct.location || ''}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    location: e.target.value,
                  }))
                }
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="e.g. Warehouse A"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                onClick={async () => {
                  if (!newProduct.name.trim() || !newProduct.sku.trim() || !newProduct.location?.trim()) {
                    showToast('Name, SKU and Location are required.', 'error');
                    return;
                  }

                  if (!newProduct.category?.trim() || !newProduct.description?.trim()) {
                    showToast('Category and Description are required.', 'error');
                    return;
                  }

                  if (newProduct.stock == null || Number.isNaN(newProduct.stock)) {
                    showToast('Stock is required.', 'error');
                    return;
                  }

                  if (newProduct.price == null || Number.isNaN(newProduct.price)) {
                    showToast('Price is required.', 'error');
                    return;
                  }

                  const token = localStorage.getItem('auth_token');
                  const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                  };
                  if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                  }

                  try {
                    const response = await fetch(
                      'http://localhost:5000/api/seller/inventory/products',
                      {
                        method: 'POST',
                        headers,
                        credentials: 'include',
                        body: JSON.stringify({
                          name: newProduct.name.trim(),
                          category: newProduct.category?.trim(),
                          description: newProduct.description?.trim(),
                          sku: newProduct.sku.trim(),
                          stock: newProduct.stock,
                          price: newProduct.price,
                          discount: newProduct.discount ?? 0,
                          moq: newProduct.moq ?? 0,
                          status: newProduct.status,
                          location: newProduct.location || undefined,
                        }),
                      }
                    );

                    if (!response.ok) {
                      const data = await response.json().catch(() => ({}));
                      throw new Error(data.message || 'Failed to create product');
                    }

                    const data = await response.json();
                    const created = data.product;

                    setInventory((prev) => [
                      {
                        id: created._id?.toString() ?? created.id,
                        name: created.name,
                        category: created.category,
                        description: created.description,
                        sku: created.sku,
                        stock: created.stock,
                        price: created.price,
                        discount: created.discount,
                        moq: created.moq,
                        status: created.status,
                        location: created.location,
                        variants: created.variants || [],
                        tiers: created.tiers || [],
                      },
                      ...prev,
                    ]);

                    showToast('Product created successfully.', 'success');
                    setShowCreateModal(false);
                    setNewProduct({
                      name: '',
                      category: '',
                      description: '',
                      sku: '',
                      stock: 0,
                      price: 0,
                      location: '',
                      discount: 0,
                      moq: 0,
                      status: 'in_stock',
                    });
                  } catch (error: any) {
                    console.error('Failed to create product:', error);
                    showToast(error.message || 'Failed to create product.', 'error');
                  }
                }}
              >
                Create Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
