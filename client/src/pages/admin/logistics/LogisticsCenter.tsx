import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  Users,
  Warehouse,
  Package,
  BarChart3,
  RotateCcw,
  Settings,
  Shield,
  Plug,
  AlertTriangle,
} from 'lucide-react';
import DeliveryPartners from './DeliveryPartners';
import ShippingZones from './ShippingZones';
import FleetDrivers from './FleetDrivers';
import WarehouseInventory from './WarehouseInventory';
import LiveTracking from './LiveTracking';
import LogisticsAnalytics from './LogisticsAnalytics';
import ReturnsReverse from './ReturnsReverse';
import AutomationSettings from './AutomationSettings';
import AccessControl from './AccessControl';
import SystemIntegrations from './SystemIntegrations';
import ExceptionManagement from './ExceptionManagement';

type TabId =
  | 'partners'
  | 'zones'
  | 'fleet'
  | 'warehouse'
  | 'tracking'
  | 'analytics'
  | 'returns'
  | 'automation'
  | 'access'
  | 'integrations'
  | 'exceptions';

export default function LogisticsCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('partners');

  const tabs = [
    { id: 'partners' as TabId, label: 'Delivery Partners', icon: Truck },
    { id: 'zones' as TabId, label: 'Shipping Zones', icon: MapPin },
    { id: 'fleet' as TabId, label: 'Fleet & Drivers', icon: Users },
    { id: 'warehouse' as TabId, label: 'Warehouses', icon: Warehouse },
    { id: 'tracking' as TabId, label: 'Live Tracking', icon: Package },
    { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
    { id: 'returns' as TabId, label: 'Returns', icon: RotateCcw },
    { id: 'automation' as TabId, label: 'Automation', icon: Settings },
    { id: 'access' as TabId, label: 'Access Control', icon: Shield },
    { id: 'integrations' as TabId, label: 'Integrations', icon: Plug },
    { id: 'exceptions' as TabId, label: 'Exceptions', icon: AlertTriangle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'partners':
        return <DeliveryPartners />;
      case 'zones':
        return <ShippingZones />;
      case 'fleet':
        return <FleetDrivers />;
      case 'warehouse':
        return <WarehouseInventory />;
      case 'tracking':
        return <LiveTracking />;
      case 'analytics':
        return <LogisticsAnalytics />;
      case 'returns':
        return <ReturnsReverse />;
      case 'automation':
        return <AutomationSettings />;
      case 'access':
        return <AccessControl />;
      case 'integrations':
        return <SystemIntegrations />;
      case 'exceptions':
        return <ExceptionManagement />;
      default:
        return <DeliveryPartners />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Logistics & Delivery</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage shipping, delivery partners, warehouses, and tracking operations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[calc(100vh-200px)] overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
        {renderTabContent()}
      </div>
    </div>
  );
}

