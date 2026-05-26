import { useAdminHubTab } from '@/hooks/useAdminHubTab';
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
import { pageTransition } from './supportAnimations';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminHubTabs } from '@/components/admin/layout/AdminHubTabs';
import { adminMobileClasses } from '@/components/admin/layout/adminMobileClasses';


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

const SUPPORT_TABS = ['dashboard', 'tickets', 'disputes', 'chat', 'staff', 'knowledge', 'fraud', 'reports', 'tools'] as const;

export default function SupportCenter() {
  const { activeTab, setActiveTab } = useAdminHubTab<TabId>('support', 'dashboard', SUPPORT_TABS);

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
      className={adminMobileClasses.pageShell}
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.04 } } }}
    >
      <motion.div
        variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.3 }}
      >
        <AdminPageHeader
          title="Support Center"
          description="Manage tickets, disputes, chat support, and customer service operations"
        />
      </motion.div>

      <motion.div variants={pageTransition}>
        <AdminHubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </motion.div>

      <div className={adminMobileClasses.hubTabContent}>
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

