import React from 'react';
import { useAdminHubTab } from '@/hooks/useAdminHubTab';
import {
  LayoutDashboard,
  LayoutGrid,
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
  MailCheck,
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
import HeroCarouselManager from './HeroCarouselManager';
import ReferralProgramManager from './ReferralProgramManager';
import AffiliateProgramManagement from './AffiliateProgramManagement';
import MarketingAnalyticsSuite from './MarketingAnalyticsSuite';
import AIMarketingTools from './AIMarketingTools';
import MarketingSettings from './MarketingSettings';
import MarketingEmailAutomation from './MarketingEmailAutomation';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminHubTabs } from '@/components/admin/layout/AdminHubTabs';
import { adminMobileClasses } from '@/components/admin/layout/adminMobileClasses';

type TabId =
  | 'dashboard'
  | 'campaigns'
  | 'coupons'
  | 'segmentation'
  | 'messaging'
  | 'email-automation'
  | 'abandoned-cart'
  | 'promotions'
  | 'ads'
  | 'creatives'
  | 'hero-carousel'
  | 'referral'
  | 'affiliate'
  | 'analytics'
  | 'ai-tools'
  | 'settings';

const MARKETING_TABS = [
  'dashboard',
  'campaigns',
  'coupons',
  'segmentation',
  'messaging',
  'email-automation',
  'abandoned-cart',
  'promotions',
  'ads',
  'creatives',
  'hero-carousel',
  'referral',
  'affiliate',
  'analytics',
  'ai-tools',
  'settings',
] as const;

export default function MarketingCenter() {
  const { activeTab, setActiveTab } = useAdminHubTab<TabId>('marketing', 'dashboard', MARKETING_TABS);

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns' as TabId, label: 'Campaigns', icon: Megaphone },
    { id: 'coupons' as TabId, label: 'Coupons', icon: Ticket },
    { id: 'segmentation' as TabId, label: 'Segmentation', icon: Users },
    { id: 'messaging' as TabId, label: 'Messaging', icon: MessageSquare },
    { id: 'email-automation' as TabId, label: 'Email automation', icon: MailCheck },
    { id: 'abandoned-cart' as TabId, label: 'Abandoned Cart', icon: ShoppingCart },
    { id: 'promotions' as TabId, label: 'Promotions', icon: Star },
    { id: 'ads' as TabId, label: 'Ads & Social', icon: Share2 },
    { id: 'creatives' as TabId, label: 'Creatives', icon: Image },
    { id: 'hero-carousel' as TabId, label: 'Hero Carousel', icon: Image },
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
      case 'email-automation':
        return <MarketingEmailAutomation />;
      case 'abandoned-cart':
        return <AbandonedCartRecovery />;
      case 'promotions':
        return <ProductPromotionTools />;
      case 'ads':
        return <AdsSocialMediaIntegration />;
      case 'creatives':
        return <CreativesBannerManager />;
      case 'hero-carousel':
        return <HeroCarouselManager />;
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
    <div className={adminMobileClasses.pageShell}>
      <AdminPageHeader
        title="Marketing Center"
        description="Manage campaigns, promotions, customer engagement, and marketing analytics"
      />

      <AdminHubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={adminMobileClasses.hubTabContent}>{renderTabContent()}</div>
    </div>
  );
}

