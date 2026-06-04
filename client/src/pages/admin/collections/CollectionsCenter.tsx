import { useAdminHubTab } from '@/hooks/useAdminHubTab';
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
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminHubTabs } from '@/components/admin/layout/AdminHubTabs';
import { adminMobileClasses } from '@/components/admin/layout/adminMobileClasses';

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

const COLLECTIONS_TABS = [
  'dashboard',
  'list',
  'create',
  'media',
  'products',
  'sorting',
  'scheduling',
  'analytics',
  'import-export',
  'permissions',
  'moderation',
  'enhanced',
] as const;

export default function CollectionsCenter() {
  const { activeTab, setActiveTab } = useAdminHubTab<TabId>('collections', 'dashboard', COLLECTIONS_TABS);

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
    <div className={adminMobileClasses.pageShell}>
      <AdminPageHeader
        title="Collections Management"
        description="Manage platform-wide collections, products, and display settings"
      />

      <AdminHubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={adminMobileClasses.hubTabContent}>{renderTabContent()}</div>
    </div>
  );
}
