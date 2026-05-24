import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { pageTransition } from './logisticsAnimations';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminHubTabs } from '@/components/admin/layout/AdminHubTabs';
import { adminMobileClasses } from '@/components/admin/layout/adminMobileClasses';

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
    <motion.div
      className={adminMobileClasses.pageShell}
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
    >
      <AdminPageHeader
        title="Logistics & Delivery"
        description="Manage shipping, delivery partners, warehouses, and tracking operations"
      />

      <AdminHubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={adminMobileClasses.hubTabContent}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
