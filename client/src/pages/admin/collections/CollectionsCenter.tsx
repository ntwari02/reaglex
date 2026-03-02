import { useState } from 'react';
import {
  LayoutDashboard,
  List,
  Plus,
  Image as ImageIcon,
  Package,
  ArrowUpDown,
  Calendar,
  BarChart3,
  Download,
  Shield,
  Sparkles,
  Rocket,
} from 'lucide-react';
import CollectionsDashboard from './CollectionsDashboard';
import CollectionsList from './CollectionsList';
import CreateCollection from './CreateCollection';
import CollectionMediaDisplay from './CollectionMediaDisplay';
import ProductManagement from './ProductManagement';
import SortingDisplayRules from './SortingDisplayRules';
import SchedulingLifecycle from './SchedulingLifecycle';
import CollectionAnalytics from './CollectionAnalytics';
import ImportExport from './ImportExport';
import PermissionsAccessControl from './PermissionsAccessControl';
import QualityModeration from './QualityModeration';
import EnhancedFeatures from './EnhancedFeatures';

type TabId =
  | 'dashboard'
  | 'list'
  | 'create'
  | 'media'
  | 'products'
  | 'sorting'
  | 'scheduling'
  | 'analytics'
  | 'import-export'
  | 'permissions'
  | 'moderation'
  | 'enhanced';

export default function CollectionsCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'list' as TabId, label: 'Collections List', icon: List },
    { id: 'create' as TabId, label: 'Create Collection', icon: Plus },
    { id: 'media' as TabId, label: 'Media & Display', icon: ImageIcon },
    { id: 'products' as TabId, label: 'Product Management', icon: Package },
    { id: 'sorting' as TabId, label: 'Sorting & Rules', icon: ArrowUpDown },
    { id: 'scheduling' as TabId, label: 'Scheduling', icon: Calendar },
    { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
    { id: 'import-export' as TabId, label: 'Import/Export', icon: Download },
    { id: 'permissions' as TabId, label: 'Permissions', icon: Shield },
    { id: 'moderation' as TabId, label: 'Quality & Moderation', icon: Sparkles },
    { id: 'enhanced' as TabId, label: 'Enhanced Features', icon: Rocket },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CollectionsDashboard />;
      case 'list':
        return <CollectionsList />;
      case 'create':
        return <CreateCollection />;
      case 'media':
        return <CollectionMediaDisplay />;
      case 'products':
        return <ProductManagement />;
      case 'sorting':
        return <SortingDisplayRules />;
      case 'scheduling':
        return <SchedulingLifecycle />;
      case 'analytics':
        return <CollectionAnalytics />;
      case 'import-export':
        return <ImportExport />;
      case 'permissions':
        return <PermissionsAccessControl />;
      case 'moderation':
        return <QualityModeration />;
      case 'enhanced':
        return <EnhancedFeatures />;
      default:
        return <CollectionsDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collections Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage platform-wide collections, products, and display settings
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

