import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  Box, 
  BarChart3, 
  Crown, 
  Settings, 
  X,
  ShieldCheck,
  LucideIcon,
  FolderKanban,
  LifeBuoy,
  Truck,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { useSystemFeatures } from '@/hooks/useSystemFeatures';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Small status chip (e.g. OK / WARN / CRITICAL) */
  badge?: string;
  badgeTone?: 'ok' | 'warn' | 'critical' | 'neutral';
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  menuItems?: MenuItem[];
  /** Grouped nav (admin panel); when set, menuItems is ignored. */
  menuSections?: MenuSection[];
  title: string;
  tier: string;
  accentVariant?: 'emerald' | 'orange';
  /** Prevents admin shell from falling back to seller nav when menus are loading/empty. */
  hub?: 'seller' | 'admin';
}

function badgeClasses(tone: MenuItem['badgeTone']) {
  switch (tone) {
    case 'ok':
      return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    case 'warn':
      return 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30';
    case 'critical':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/35';
    default:
      return 'bg-gray-500/15 text-gray-600 dark:text-gray-300 border border-gray-500/25';
  }
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  menuItems,
  menuSections,
  title,
  tier,
  accentVariant = 'emerald',
  hub = 'seller',
}) => {
  const { t } = useTranslation();
  const { isEnabled, loading: featuresLoading } = useSystemFeatures();
  const sellerSupportEmail = 'spacillyltd@gmail.com';
  const sellerDefaultMenuItems: MenuItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'inventory', label: t('header.inventory'), icon: Package },
    { id: 'orders', label: t('nav.orders'), icon: ShoppingCart },
    { id: 'disputes', label: t('sidebar.disputes'), icon: AlertTriangle },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'products', label: t('header.products'), icon: Box },
    { id: 'shipping', label: t('sidebar.shippingSpacilly'), icon: Truck },
    { id: 'collections', label: t('sidebar.collections'), icon: FolderKanban },
    { id: 'analytics', label: t('header.analytics'), icon: BarChart3 },
    { id: 'subscription', label: t('sidebar.subscription'), icon: Crown },
    { id: 'payments', label: 'Payments & Escrow', icon: Wallet },
    { id: 'support', label: t('sidebar.supportCenter'), icon: LifeBuoy },
    { id: 'settings', label: t('account.profileSettings'), icon: Settings },
  ];

  const sellerMenuItems = useMemo(() => {
    if (hub !== 'seller') return sellerDefaultMenuItems;
    if (featuresLoading || isEnabled('seller_subscriptions')) return sellerDefaultMenuItems;
    return sellerDefaultMenuItems.filter((item) => item.id !== 'subscription');
  }, [hub, featuresLoading, isEnabled, sellerDefaultMenuItems]);

  const flatItems =
    menuItems ??
    (hub === 'admin' ? [] : sellerMenuItems);
  const useSections = Boolean(menuSections?.length);
  const showEmptyAdminNav =
    hub === 'admin' && !useSections && flatItems.length === 0;

  const accentClasses = accentVariant === 'emerald'
    ? {
        badgeBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
        activeBg: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
        activeShadow: 'shadow-emerald-500/30',
      }
    : {
        badgeBg: 'bg-gradient-to-br from-red-500 to-[var(--brand-primary)]',
        activeBg: 'bg-gradient-to-r from-red-500 to-[var(--brand-primary)]',
        activeShadow: 'shadow-red-500/40',
      };

  const renderNavButton = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <motion.button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          setSidebarOpen(false);
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-[10px] transition-colors duration-150 relative overflow-hidden group sidebar-nav-item min-h-[44px] lg:min-h-0',
          isActive
            ? `${accentClasses.activeShadow} text-white hover:bg-transparent`
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200',
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isActive && (
          <motion.div
            layoutId={`activeTab-${title}`}
            className={`absolute inset-0 ${accentClasses.activeBg}`}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
          <Icon className="w-[18px] h-[18px] shrink-0 sidebar-nav-icon" />
          <span
            className={cn(
              'font-medium transition-colors truncate text-left',
              isActive
                ? 'text-white'
                : 'text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white',
            )}
          >
            {item.label}
          </span>
        </div>
        {item.badge && (
          <span
            className={cn(
              'relative z-10 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0',
              badgeClasses(item.badgeTone),
              isActive && 'border-white/30 text-white bg-white/15',
            )}
          >
            {item.badge}
          </span>
        )}
      </motion.button>
    );
  };

  const sidebarContent = (
  <div
    className="dashboard-sidebar flex flex-col h-full overflow-y-auto overflow-x-hidden scroll-smooth sidebar transition-colors duration-300 text-gray-900 dark:text-gray-100 backdrop-blur border-r border-gray-200 dark:border-gray-800 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600"
  >
      <div className="p-4 sm:p-5 lg:p-6 flex items-center justify-between sidebar-profile border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${accentClasses.badgeBg} rounded-lg flex items-center justify-center`}>
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tier}</p>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)}
          type="button"
          aria-label={t('buttons.close')}
          className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="flex-1 p-3 sm:p-4 sidebar-stats">
        {useSections ? (
          <div className="space-y-4">
            {menuSections!.map((section) => (
              <div key={section.id}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => renderNavButton(item))}
                </div>
              </div>
            ))}
          </div>
        ) : showEmptyAdminNav ? (
          <div
            className="mx-2 rounded-xl px-3 py-4 text-center text-xs leading-relaxed"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-card)',
            }}
          >
            No admin modules are assigned to your account yet. Ask a super admin to update your
            role in Admin team.
          </div>
        ) : (
          <div className="space-y-1 sm:space-y-2">
            {flatItems.map((item) => renderNavButton(item))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t bg-gray-50 dark:bg-dark-secondary border-gray-200 dark:border-[var(--border-card)] transition-colors duration-300 text-xs text-gray-500 dark:text-[var(--text-muted)]">
        <p className="text-center leading-relaxed">
          {t('sidebar.supportEmailIntro')}{' '}
          <a
            href={`mailto:${sellerSupportEmail}`}
            className="font-semibold text-[var(--brand-primary)] hover:underline break-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40 rounded"
          >
            {sellerSupportEmail}
          </a>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-[min(100vw-3rem,18rem)] z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;

