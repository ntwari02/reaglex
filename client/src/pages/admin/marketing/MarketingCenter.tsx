import React, { useState } from 'react';
import {
  LayoutDashboard,
  Megaphone,
  Ticket,
  Users,
  MessageSquare,
  ShoppingCart,
  Star,
  Share2,
  UserPlus,
  BarChart3,
  Sparkles,
  Settings,
  Image,
  TrendingUp,
} from 'lucide-react';
import MarketingDashboard from './MarketingDashboard';
import CampaignManagement from './CampaignManagement';
import DiscountCouponManagement from './DiscountCouponManagement';
import CustomerSegmentation from './CustomerSegmentation';
import MarketingMessagingTools from './MarketingMessagingTools';
import AbandonedCartRecovery from './AbandonedCartRecovery';
import ProductPromotionTools from './ProductPromotionTools';
import AdsSocialMediaIntegration from './AdsSocialMediaIntegration';
import CreativesBannerManager from './CreativesBannerManager';
import ReferralProgramManager from './ReferralProgramManager';
import AffiliateProgramManagement from './AffiliateProgramManagement';
import MarketingAnalyticsSuite from './MarketingAnalyticsSuite';
import AIMarketingTools from './AIMarketingTools';
import MarketingSettings from './MarketingSettings';

type TabId =
  | 'dashboard'
  | 'campaigns'
  | 'coupons'
  | 'segmentation'
  | 'messaging'
  | 'abandoned-cart'
  | 'promotions'
  | 'ads'
  | 'creatives'
  | 'referral'
  | 'affiliate'
  | 'analytics'
  | 'ai-tools'
  | 'settings';

export default function MarketingCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns' as TabId, label: 'Campaigns', icon: Megaphone },
    { id: 'coupons' as TabId, label: 'Coupons', icon: Ticket },
    { id: 'segmentation' as TabId, label: 'Segmentation', icon: Users },
    { id: 'messaging' as TabId, label: 'Messaging', icon: MessageSquare },
    { id: 'abandoned-cart' as TabId, label: 'Abandoned Cart', icon: ShoppingCart },
    { id: 'promotions' as TabId, label: 'Promotions', icon: Star },
    { id: 'ads' as TabId, label: 'Ads & Social', icon: Share2 },
    { id: 'creatives' as TabId, label: 'Creatives', icon: Image },
    { id: 'referral' as TabId, label: 'Referral', icon: UserPlus },
    { id: 'affiliate' as TabId, label: 'Affiliate', icon: TrendingUp },
    { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
    { id: 'ai-tools' as TabId, label: 'AI Tools', icon: Sparkles },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MarketingDashboard />;
      case 'campaigns':
        return <CampaignManagement />;
      case 'coupons':
        return <DiscountCouponManagement />;
      case 'segmentation':
        return <CustomerSegmentation />;
      case 'messaging':
        return <MarketingMessagingTools />;
      case 'abandoned-cart':
        return <AbandonedCartRecovery />;
      case 'promotions':
        return <ProductPromotionTools />;
      case 'ads':
        return <AdsSocialMediaIntegration />;
      case 'creatives':
        return <CreativesBannerManager />;
      case 'referral':
        return <ReferralProgramManager />;
      case 'affiliate':
        return <AffiliateProgramManagement />;
      case 'analytics':
        return <MarketingAnalyticsSuite />;
      case 'ai-tools':
        return <AIMarketingTools />;
      case 'settings':
        return <MarketingSettings />;
      default:
        return <MarketingDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketing Center</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage campaigns, promotions, customer engagement, and marketing analytics
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

