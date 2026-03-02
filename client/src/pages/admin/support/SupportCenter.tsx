import React, { useState } from 'react';
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage tickets, disputes, chat support, and customer service operations
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

