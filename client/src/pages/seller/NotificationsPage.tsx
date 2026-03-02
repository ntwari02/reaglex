import React, { useState } from 'react';
import {
  Bell,
  Package,
  Gift,
  MessageSquare,
  Store,
  Shield,
  FileText,
  CheckCircle,
  TrendingDown,
  Settings,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Notification {
  id: number;
  type: 'order' | 'promotion' | 'system' | 'message' | 'seller' | 'security';
  icon: any;
  title: string;
  message: string;
  date: string;
  unread: boolean;
  iconBg: string;
  iconColor: string;
  priority: 'high' | 'medium' | 'low';
  actionLink?: string;
  actionLabel?: string;
  category: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'seller',
      icon: Store,
      title: 'New Order Received',
      message: 'You have received a new order #ORD-1235 worth $249.99',
      date: '12/12/2025',
      unread: true,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      priority: 'high',
      actionLink: '/seller/orders',
      actionLabel: 'View Order',
      category: 'seller',
    },
    {
      id: 2,
      type: 'seller',
      icon: Package,
      title: 'Low Stock Alert',
      message: 'Wireless Headphones stock is running low (12 units remaining)',
      date: '11/12/2025',
      unread: true,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      priority: 'medium',
      actionLink: '/seller/inventory',
      actionLabel: 'Restock',
      category: 'seller',
    },
    {
      id: 3,
      type: 'message',
      icon: MessageSquare,
      title: 'New Customer Message',
      message: 'Customer sent you a message about order #ORD-1234',
      date: '10/12/2025',
      unread: false,
      iconBg: 'bg-purple-100 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      priority: 'medium',
      actionLink: '/seller/inbox',
      actionLabel: 'View Message',
      category: 'message',
    },
    {
      id: 4,
      type: 'seller',
      icon: CheckCircle,
      title: 'Product Approved',
      message: 'Your product "Wireless Headphones" has been approved and is now live',
      date: '09/12/2025',
      unread: false,
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      priority: 'low',
      actionLink: '/seller/products',
      actionLabel: 'View Product',
      category: 'seller',
    },
    {
      id: 5,
      type: 'promotion',
      icon: Gift,
      title: 'Promotion Opportunity',
      message: 'Flash sale event starting soon! Add your products to participate',
      date: '08/12/2025',
      unread: false,
      iconBg: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      priority: 'low',
      actionLink: '/seller/products',
      actionLabel: 'Join Sale',
      category: 'promotion',
    },
  ]);

  const filters = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'seller', label: 'Seller', icon: Store },
    { id: 'order', label: 'Orders', icon: Package },
    { id: 'message', label: 'Messages', icon: MessageSquare },
    { id: 'promotion', label: 'Promotions', icon: Gift },
    { id: 'system', label: 'System', icon: FileText },
  ];

  const filteredNotifications = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === activeFilter);

  const unreadCount = notifications.filter(n => n.unread).length;
  const filteredUnreadCount = filteredNotifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, unread: false } : n
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredUnreadCount > 0 ? `${filteredUnreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            >
              Mark All Read
            </button>
          )}
          <Link
            to="/seller/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const count = filter.id === 'all' 
            ? unreadCount 
            : notifications.filter(n => n.category === filter.id && n.unread).length;
          const isActive = activeFilter === filter.id;
          
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{filter.label}</span>
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-orange-600 dark:bg-orange-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No notifications</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {activeFilter !== 'all' ? `No ${filters.find(f => f.id === activeFilter)?.label.toLowerCase()} notifications` : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    notification.unread
                      ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  } hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 ${notification.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 border-2 ${
                      notification.type === 'seller' 
                        ? 'border-emerald-300 dark:border-emerald-700' 
                        : notification.type === 'order'
                        ? 'border-blue-300 dark:border-blue-700'
                        : notification.type === 'message'
                        ? 'border-purple-300 dark:border-purple-700'
                        : 'border-orange-300 dark:border-orange-700'
                    }`}>
                      <Icon className={`h-6 w-6 ${notification.iconColor}`} strokeWidth={2} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={`font-bold text-base ${
                          notification.unread 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h4>
                        {notification.unread && (
                          <div className="w-3 h-3 bg-orange-600 dark:bg-orange-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                          {notification.date}
                        </p>
                        {notification.actionLink && notification.actionLabel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Use navigate to ensure proper routing within seller dashboard
                              navigate(notification.actionLink!);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          >
                            {notification.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

