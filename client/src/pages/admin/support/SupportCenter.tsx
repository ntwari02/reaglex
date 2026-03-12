import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Ticket,
  AlertTriangle,
  MessageSquare,
  Users,
  BookOpen,
  Shield,
  BarChart3,
  Settings,
} from 'lucide-react';
import SupportDashboard from './SupportDashboard';
import TicketingSystem from './TicketingSystem';
import DisputeResolutionCenter from './DisputeResolutionCenter';
import LiveChatSupport from './LiveChatSupport';
import SupportStaffManagement from './SupportStaffManagement';
import KnowledgeBaseManagement from './KnowledgeBaseManagement';
import FraudSecurityAlerts from './FraudSecurityAlerts';
import SupportReportsAnalytics from './SupportReportsAnalytics';
import SupportSystemTools from './SupportSystemTools';
import { pageTransition, tabButton } from './supportAnimations';


type TabId =
  | 'dashboard'
  | 'tickets'
  | 'disputes'
  | 'chat'
  | 'staff'
  | 'knowledge'
  | 'fraud'
  | 'reports'
  | 'tools';

export default function SupportCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets' as TabId, label: 'Tickets', icon: Ticket },
    { id: 'disputes' as TabId, label: 'Disputes', icon: AlertTriangle },
    { id: 'chat' as TabId, label: 'Live Chat', icon: MessageSquare },
    { id: 'staff' as TabId, label: 'Staff', icon: Users },
    { id: 'knowledge' as TabId, label: 'Knowledge Base', icon: BookOpen },
    { id: 'fraud' as TabId, label: 'Fraud Alerts', icon: Shield },
    { id: 'reports' as TabId, label: 'Reports', icon: BarChart3 },
    { id: 'tools' as TabId, label: 'Settings', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SupportDashboard />;
      case 'tickets':
        return <TicketingSystem />;
      case 'disputes':
        return <DisputeResolutionCenter />;
      case 'chat':
        return <LiveChatSupport />;
      case 'staff':
        return <SupportStaffManagement />;
      case 'knowledge':
        return <KnowledgeBaseManagement />;
      case 'fraud':
        return <FraudSecurityAlerts />;
      case 'reports':
        return <SupportReportsAnalytics />;
      case 'tools':
        return <SupportSystemTools />;
      default:
        return <SupportDashboard />;
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.04 } } }}
    >
      {/* Header */}
      <motion.div
        variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage tickets, disputes, chat support, and customer service operations
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={pageTransition}
        className="overflow-x-auto border-b border-gray-200 scroll-smooth dark:border-gray-800 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-700"
      >
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                variants={tabButton}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <div className="min-h-[calc(100vh-200px)] overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
            className="space-y-6"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

