import React from 'react';
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
  MessageCircle,
  LifeBuoy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  menuItems?: MenuItem[];
  title: string;
  tier: string;
  accentVariant?: 'emerald' | 'orange';
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  menuItems,
  title,
  tier,
  accentVariant = 'emerald',
}) => {
  const defaultMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'inbox', label: 'Inbox & RFQs', icon: MessageCircle },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'collections', label: 'Collections', icon: FolderKanban },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'support', label: 'Support Center', icon: LifeBuoy },
    { id: 'settings', label: 'Profile & Settings', icon: Settings },
  ];

  const itemsToRender = menuItems || defaultMenuItems;

  const accentClasses = accentVariant === 'emerald'
    ? {
        badgeBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
        activeBg: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
        activeShadow: 'shadow-emerald-500/30',
      }
    : {
        badgeBg: 'bg-gradient-to-br from-red-500 to-orange-500',
        activeBg: 'bg-gradient-to-r from-red-500 to-orange-500',
        activeShadow: 'shadow-red-500/40',
      };

  const sidebarContent = (
  <div
    className="flex flex-col h-full overflow-y-auto overflow-x-hidden scroll-smooth sidebar transition-colors duration-300 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600"
    style={{
      background:
        'linear-gradient(135deg, rgba(15,23,42,0.94), rgba(15,23,42,0.88))',
      borderRight: '1px solid rgba(148,163,184,0.28)',
      backdropFilter: 'blur(18px)',
    }}
  >
      <div className="p-6 flex items-center justify-between sidebar-profile">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${accentClasses.badgeBg} rounded-lg flex items-center justify-center`}>
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-on-dark)' }}>{title}</h2>
            <p className="text-xs" style={{ color: 'var(--text-on-dark)' }}>{tier}</p>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="flex-1 p-4 sidebar-stats">
        <div className="space-y-2">
          {itemsToRender.map((item) => {
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
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative overflow-hidden group sidebar-nav-item",
                  isActive && `active ${accentClasses.activeShadow}`
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId={`activeTab-${title}`}
                    className={`absolute inset-0 ${accentClasses.activeBg}`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  className="w-5 h-5 relative z-10 sidebar-nav-icon"
                  style={isActive ? { color: '#ffffff' } : undefined}
                />
                <span
                  className="font-medium relative z-10"
                  style={isActive ? { color: '#ffffff' } : undefined}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t transition-colors duration-300 text-xs" style={{ borderColor: 'var(--divider)', color: 'var(--text-muted)' }}>
        <p className="text-center">
          Need help? Open <span className="font-semibold">Support Center</span> in the menu.
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
              className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden"
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

