import React, { useState } from 'react';
import {
  LayoutDashboard,
  Send,
  FileText,
  Clock,
  BarChart3,
  Users,
  List,
  Settings,
  Zap,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import NotificationsDashboard from './NotificationsDashboard';
import CreateSendNotification from './CreateSendNotification';
import NotificationTemplates from './NotificationTemplates';
import ScheduledNotifications from './ScheduledNotifications';
import NotificationAnalytics from './NotificationAnalytics';
import UserNotificationControl from './UserNotificationControl';
import NotificationLogs from './NotificationLogs';
import IntegrationSettings from './IntegrationSettings';
import AutomationRules from './AutomationRules';
import NotificationPermissions from './NotificationPermissions';
import SystemAlerts from './SystemAlerts';

type TabId =
  | 'dashboard'
  | 'create'
  | 'templates'
  | 'scheduled'
  | 'analytics'
  | 'user-control'
  | 'logs'
  | 'integrations'
  | 'automation'
  | 'permissions'
  | 'alerts';

export default function NotificationsCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create' as TabId, label: 'Create & Send', icon: Send },
    { id: 'templates' as TabId, label: 'Templates', icon: FileText },
    { id: 'scheduled' as TabId, label: 'Scheduled', icon: Clock },
    { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
    { id: 'user-control' as TabId, label: 'User Control', icon: Users },
    { id: 'logs' as TabId, label: 'Logs', icon: List },
    { id: 'integrations' as TabId, label: 'Integrations', icon: Settings },
    { id: 'automation' as TabId, label: 'Automation', icon: Zap },
    { id: 'permissions' as TabId, label: 'Permissions', icon: Shield },
    { id: 'alerts' as TabId, label: 'System Alerts', icon: AlertTriangle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <NotificationsDashboard />;
      case 'create':
        return <CreateSendNotification />;
      case 'templates':
        return <NotificationTemplates />;
      case 'scheduled':
        return <ScheduledNotifications />;
      case 'analytics':
        return <NotificationAnalytics />;
      case 'user-control':
        return <UserNotificationControl />;
      case 'logs':
        return <NotificationLogs />;
      case 'integrations':
        return <IntegrationSettings />;
      case 'automation':
        return <AutomationRules />;
      case 'permissions':
        return <NotificationPermissions />;
      case 'alerts':
        return <SystemAlerts />;
      default:
        return <NotificationsDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Notifications & Communication
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage notifications for admins, sellers, and customers
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

