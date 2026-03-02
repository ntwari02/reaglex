import React, { useState } from 'react';
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

export default function ReviewsCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews & Moderation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Moderate customer reviews, seller ratings, and manage review quality
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

