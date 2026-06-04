import React from 'react';
import { useAdminHubTab } from '@/hooks/useAdminHubTab';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Star,
  Shield,
  AlertTriangle,
  Users,
  MessageSquare,
  Image,
  BarChart3,
  Mail,
  Sparkles,
  Link,
  Settings,
} from 'lucide-react';
import { pageTransition } from './reviewAnimations';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminHubTabs } from '@/components/admin/layout/AdminHubTabs';
import { adminMobileClasses } from '@/components/admin/layout/adminMobileClasses';
import ReviewsDashboard from './ReviewsDashboard';
import CustomerProductReviews from './CustomerProductReviews';
import ReviewModeration from './ReviewModeration';
import SuspiciousFraudDetection from './SuspiciousFraudDetection';
import SellerRatings from './SellerRatings';
import SellerResponses from './SellerResponses';
import MediaManagement from './MediaManagement';
import ReviewAnalytics from './ReviewAnalytics';
import ReviewRequests from './ReviewRequests';
import AIReviewAssistant from './AIReviewAssistant';
import IntegrationFeatures from './IntegrationFeatures';
import ReviewModuleSettings from './ReviewModuleSettings';

type TabId =
  | 'dashboard'
  | 'reviews'
  | 'moderation'
  | 'fraud'
  | 'seller-ratings'
  | 'seller-responses'
  | 'media'
  | 'analytics'
  | 'requests'
  | 'ai-assistant'
  | 'integrations'
  | 'settings';

const REVIEWS_TABS = [
  'dashboard',
  'reviews',
  'moderation',
  'fraud',
  'seller-ratings',
  'seller-responses',
  'media',
  'analytics',
  'requests',
  'ai-assistant',
  'integrations',
  'settings',
] as const;

export default function ReviewsCenter() {
  const { activeTab, setActiveTab } = useAdminHubTab<TabId>('reviews', 'dashboard', REVIEWS_TABS);

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reviews' as TabId, label: 'Product Reviews', icon: Star },
    { id: 'moderation' as TabId, label: 'Moderation', icon: Shield },
    { id: 'fraud' as TabId, label: 'Fraud Detection', icon: AlertTriangle },
    { id: 'seller-ratings' as TabId, label: 'Seller Ratings', icon: Users },
    { id: 'seller-responses' as TabId, label: 'Seller Responses', icon: MessageSquare },
    { id: 'media' as TabId, label: 'Media', icon: Image },
    { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
    { id: 'requests' as TabId, label: 'Review Requests', icon: Mail },
    { id: 'ai-assistant' as TabId, label: 'AI Assistant', icon: Sparkles },
    { id: 'integrations' as TabId, label: 'Integrations', icon: Link },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ReviewsDashboard />;
      case 'reviews':
        return <CustomerProductReviews />;
      case 'moderation':
        return <ReviewModeration />;
      case 'fraud':
        return <SuspiciousFraudDetection />;
      case 'seller-ratings':
        return <SellerRatings />;
      case 'seller-responses':
        return <SellerResponses />;
      case 'media':
        return <MediaManagement />;
      case 'analytics':
        return <ReviewAnalytics />;
      case 'requests':
        return <ReviewRequests />;
      case 'ai-assistant':
        return <AIReviewAssistant />;
      case 'integrations':
        return <IntegrationFeatures />;
      case 'settings':
        return <ReviewModuleSettings />;
      default:
        return <ReviewsDashboard />;
    }
  };

  return (
    <div className={adminMobileClasses.pageShell}>
      <AdminPageHeader
        title="Reviews & Moderation"
        description="Moderate customer reviews, seller ratings, and manage review quality"
      />

      <AdminHubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accent="amber" />

      <div className={adminMobileClasses.hubTabContent}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            {...pageTransition}
            className="min-h-[200px]"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

