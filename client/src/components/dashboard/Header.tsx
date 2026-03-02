import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, Search, User, Sun, Moon, ChevronDown, Settings, Package, BarChart3, ShoppingBag, LogOut, Store, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Helper to resolve avatar URL (handles both full URLs and relative paths)
// Adds cache-busting parameter to ensure fresh image loads
const resolveAvatarUrl = (url: string | null | undefined, cacheBust?: boolean): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    // For data URLs, return as-is
    if (url.startsWith('data:')) return url;
    // For Google profile images, they already have cache-busting parameters, so don't add another
    // Just return the URL as-is to preserve Google's cache-busting
    if (url.includes('googleusercontent.com')) {
      return url;
    }
    // For other HTTP URLs, add cache-busting if needed
    if (cacheBust) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${Date.now()}`;
    }
    return url;
  }
  // If it's a relative path, prepend the API host
  const API_HOST = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const fullUrl = `${API_HOST}${url}`;
  // Add cache-busting parameter to force fresh load
  if (cacheBust) {
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}t=${Date.now()}`;
  }
  return fullUrl;
};

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  userName: string;
  userRole: string;
  accentVariant?: 'emerald' | 'orange';
}

const Header: React.FC<HeaderProps> = ({
  setSidebarOpen,
  notificationsOpen,
  setNotificationsOpen,
  userName,
  userRole,
  accentVariant = 'emerald',
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuthStore();
  const { unreadMessageCount } = useNotificationStore();
  const notificationCount = unreadMessageCount; // Dynamic based on unread messages
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // Force re-render counter
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Force re-render when user.avatar_url changes
  // Handle both snake_case (avatar_url) and camelCase (avatarUrl) for compatibility
  // Ensure avatarUrl is a non-empty string
  const avatarUrl = (user?.avatar_url || (user as any)?.avatarUrl || '').trim();
  const hasAvatar = avatarUrl && avatarUrl.length > 0;
  
  // Debug: Log avatar URL for troubleshooting
  useEffect(() => {
    console.log('[Header] User object:', user);
    console.log('[Header] Avatar URL:', avatarUrl);
    console.log('[Header] Has avatar:', hasAvatar);
  }, [user, avatarUrl, hasAvatar]);

  const isSeller = location.pathname.startsWith('/seller');
  const isAdmin = location.pathname.startsWith('/admin');

  // Listen for avatar updates and user state changes
  useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log('[Header] Avatar update event received, forcing re-render');
      setAvatarKey(prev => prev + 1); // Force image re-render
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, []);

  // Also react to user.avatar_url changes from Zustand
  useEffect(() => {
    console.log('[Header] Avatar URL changed:', avatarUrl, 'hasAvatar:', hasAvatar);
    if (hasAvatar) {
      setAvatarKey(prev => prev + 1); // Force re-render when avatar URL changes
    }
  }, [avatarUrl, hasAvatar]);
  
  // Also react to user object changes
  useEffect(() => {
    if (user) {
      const currentAvatarUrl = (user.avatar_url || (user as any)?.avatarUrl || '').trim();
      if (currentAvatarUrl && currentAvatarUrl.length > 0) {
        console.log('[Header] User object changed, avatar URL:', currentAvatarUrl);
        setAvatarKey(prev => prev + 1);
      }
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleProfileClick = () => {
    // Determine profile route based on current path
    if (isAdmin) {
      navigate('/admin/settings');
    } else if (isSeller) {
      navigate('/seller/settings');
    } else {
      navigate('/profile');
    }
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    signOut();
    setShowUserMenu(false);
    navigate('/login');
  };

  const accent = accentVariant === 'emerald'
    ? {
        focusRing: 'focus:ring-emerald-500',
        badgeBg: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
        avatarBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
      }
    : {
        focusRing: 'focus:ring-red-500',
        badgeBg: 'bg-red-500',
        avatarBg: 'bg-gradient-to-br from-red-500 to-orange-500',
      };

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/30 px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </Button>

        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className={`w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 ${accent.focusRing} focus:border-transparent transition-all`}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-6 h-6 text-yellow-400" />
          ) : (
            <Moon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          {notificationCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-red-500/30"
            >
              {notificationCount}
            </motion.span>
          )}
        </motion.button>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">{userName}</p>
          </div>
          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="User menu"
              title="User menu"
            >
              {avatarUrl ? (
                <img
                  key={`${avatarUrl}-${user?.updated_at || Date.now()}-${avatarKey}`} // Force re-render when avatar changes
                  src={resolveAvatarUrl(avatarUrl, !avatarUrl.includes('googleusercontent.com')) || ''} // Don't cache-bust Google URLs
                  alt={user?.full_name || user?.email || userName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover relative cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-offset-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all"
                  loading="eager" // Load immediately, don't lazy load
                  // Don't use crossOrigin for Google images - they don't support CORS and will cause errors
                  referrerPolicy="no-referrer" // Don't send referrer for privacy
                  onError={(e) => {
                    console.error('[Header] Failed to load avatar image:', avatarUrl);
                    console.error('[Header] Image error details:', e);
                    // Fallback to default icon on error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-icon')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'fallback-icon w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center';
                      fallback.innerHTML = '<svg class="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                      parent.appendChild(fallback);
                    }
                  }}
                  onLoad={() => {
                    console.log('[Header] Avatar image loaded successfully:', avatarUrl);
                  }}
                />
              ) : (
                <div className={`w-7 h-7 sm:w-8 sm:h-8 ${accent.avatarBg} rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-offset-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all`}>
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              )}
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 hidden md:block" />
            </motion.button>
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-20 backdrop-blur-xl"
                >
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {user?.full_name || user?.email || userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {user?.email}
                    </p>
                    {isSeller && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs">
                        {user?.seller_status === 'approved' ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            Verified Seller
                          </span>
                        ) : user?.seller_status === 'rejected' ? (
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            Seller (Verification Rejected)
                          </span>
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            Seller (Pending Government & Admin Approval)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="py-1.5">
                    {isSeller && (
                      <>
                        <button
                          onClick={() => {
                            navigate('/seller');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Dashboard
                        </button>
                        <button
                          onClick={() => {
                            navigate('/seller/products');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Package className="h-4 w-4" />
                          Products
                        </button>
                        <button
                          onClick={() => {
                            navigate('/seller/inventory');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Layers className="h-4 w-4" />
                          Inventory
                        </button>
                        <button
                          onClick={() => {
                            navigate('/seller/orders');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Orders
                        </button>
                        <button
                          onClick={() => {
                            navigate('/seller/analytics');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Analytics
                        </button>
                        <div className="my-1.5 border-t border-gray-200 dark:border-gray-700" />
                      </>
                    )}
                    <button
                      onClick={handleProfileClick}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Profile & Settings
                    </button>
                    <div className="my-1.5 border-t border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400 transition-colors font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              Logout
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to log out from your seller account? Any unsaved changes in your dashboard pages will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                handleLogout();
                setShowLogoutConfirm(false);
              }}
            >
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;

