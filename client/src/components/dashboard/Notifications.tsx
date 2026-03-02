import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Gift,
  LucideIcon,
  Bell,
  MessageSquare,
  Shield,
  Store,
  CheckCircle,
  Settings,
  ExternalLink,
  TrendingDown,
  FileText,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface Notification {
  id: number;
  type: 'order' | 'promotion' | 'system' | 'message' | 'seller' | 'security';
  icon: LucideIcon;
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

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'order',
      icon: Package,
      title: 'Order Shipped',
      message: 'Your order #ORD-1234 has been shipped',
      date: '12/12/2025',
      unread: true,
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      priority: 'medium',
      actionLink: '/orders/ORD-1234',
      actionLabel: 'Track Order',
      category: 'order',
    },
    {
      id: 2,
      type: 'promotion',
      icon: Gift,
      title: 'Flash Sale Alert',
      message: 'Up to 50% off on Electronics - Limited time!',
      date: '12/12/2025',
      unread: true,
      iconBg: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      priority: 'low',
      actionLink: '/products?deals=true',
      actionLabel: 'Shop Now',
      category: 'promotion',
    },
    {
      id: 3,
      type: 'order',
      icon: CheckCircle,
      title: 'Order Delivered',
      message: 'Your order #ORD-1233 has been delivered successfully',
      date: '11/12/2025',
      unread: false,
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      priority: 'medium',
      actionLink: '/orders/ORD-1233',
      actionLabel: 'View Order',
      category: 'order',
    },
    {
      id: 4,
      type: 'message',
      icon: MessageSquare,
      title: 'New Message',
      message: 'You have a new message from seller regarding order #ORD-1234',
      date: '11/12/2025',
      unread: true,
      iconBg: 'bg-purple-100 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      priority: 'medium',
      actionLink: '/seller/inbox',
      actionLabel: 'View Message',
      category: 'message',
    },
    {
      id: 5,
      type: 'security',
      icon: Shield,
      title: 'Security Alert',
      message: 'New login detected from a new device. If this wasn\'t you, please secure your account.',
      date: '10/12/2025',
      unread: true,
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      priority: 'high',
      actionLink: '/profile/security',
      actionLabel: 'Review Security',
      category: 'security',
    },
    {
      id: 6,
      type: 'seller',
      icon: Store,
      title: 'New Order Received',
      message: 'You have received a new order #ORD-1235 worth $249.99',
      date: '10/12/2025',
      unread: false,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      priority: 'high',
      actionLink: '/seller/orders',
      actionLabel: 'View Order',
      category: 'seller',
    },
    {
      id: 7,
      type: 'promotion',
      icon: TrendingDown,
      title: 'Price Drop Alert',
      message: 'Price dropped on "Wireless Headphones" you viewed - Now $79.99 (was $99.99)',
      date: '09/12/2025',
      unread: false,
      iconBg: 'bg-pink-100 dark:bg-pink-900/20',
      iconColor: 'text-pink-600 dark:text-pink-400',
      priority: 'low',
      actionLink: '/products/123',
      actionLabel: 'View Product',
      category: 'promotion',
    },
    {
      id: 8,
      type: 'system',
      icon: Bell,
      title: 'System Update',
      message: 'New features available: Enhanced search, improved checkout, and more!',
      date: '08/12/2025',
      unread: false,
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      priority: 'low',
      actionLink: '/about',
      actionLabel: 'Learn More',
      category: 'system',
    },
  ]);

  const filters = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'order', label: 'Orders', icon: Package },
    { id: 'promotion', label: 'Promotions', icon: Gift },
    { id: 'system', label: 'System', icon: FileText },
    { id: 'message', label: 'Messages', icon: MessageSquare },
    { id: 'seller', label: 'Seller', icon: Store },
    { id: 'security', label: 'Security', icon: Shield },
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Determine the notifications page URL based on current route
  const getNotificationsUrl = () => {
    if (location.pathname.startsWith('/admin')) {
      return '/admin/notifications';
    } else if (location.pathname.startsWith('/seller')) {
      return '/seller/notifications';
    }
    return '/notifications';
  };

  // Determine the settings page URL based on current route
  const getSettingsUrl = () => {
    if (location.pathname.startsWith('/admin')) {
      return '/admin/settings';
    } else if (location.pathname.startsWith('/seller')) {
      return '/seller/settings';
    }
    return '/profile';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Notification Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
                    <button
                      onClick={onClose}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Close notifications"
                    >
                      <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredUnreadCount > 0 ? `${filteredUnreadCount} unread` : 'All caught up!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{filter.label}</span>
                      {count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
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
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4 bg-gray-50 dark:bg-gray-900">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {activeFilter !== 'all' ? `No ${filters.find(f => f.id === activeFilter)?.label.toLowerCase()} notifications` : 'You\'re all caught up!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification, index) => {
                    const Icon = notification.icon;
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`group relative p-4 rounded-lg bg-white dark:bg-gray-800 border-2 transition-all cursor-pointer ${
                          notification.unread
                            ? 'border-orange-200 dark:border-orange-800 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700'
                        } hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700`}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.actionLink) {
                            onClose();
                          }
                        }}
                      >
                        {/* Priority Indicator */}
                        {notification.priority === 'high' && (
                          <div className="absolute top-2 right-2">
                            <div className={`w-2 h-2 ${getPriorityColor(notification.priority)} rounded-full`} />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`w-10 h-10 ${notification.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 border-2 ${
                            notification.type === 'order' 
                              ? 'border-blue-300 dark:border-blue-700' 
                              : notification.type === 'promotion'
                              ? 'border-orange-300 dark:border-orange-700'
                              : notification.type === 'security'
                              ? 'border-red-300 dark:border-red-700'
                              : notification.type === 'message'
                              ? 'border-purple-300 dark:border-purple-700'
                              : notification.type === 'seller'
                              ? 'border-emerald-300 dark:border-emerald-700'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}>
                            <Icon className={`h-5 w-5 ${notification.iconColor}`} strokeWidth={2} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`font-bold text-sm ${
                                notification.unread 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </h4>
                              {notification.unread && (
                                <div className="w-2.5 h-2.5 bg-orange-600 dark:bg-orange-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
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
                                    // Close notifications panel when navigating
                                    onClose();
                                    // Use navigate to ensure proper routing within seller dashboard
                                    navigate(notification.actionLink!);
                                  }}
                                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 transition-colors"
                                >
                                  {notification.actionLabel}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <Link
                to={getNotificationsUrl()}
                onClick={onClose}
                className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 transition-colors"
              >
                View All Notifications
              </Link>
              <Link
                to={getSettingsUrl()}
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Notifications;
