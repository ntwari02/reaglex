import { useEffect, useMemo, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  ShoppingBag,
  Heart,
  Tag,
  Compass,
  LayoutGrid,
  Zap,
  Shield,
  Package,
  Bookmark,
  Clock,
  Wand2,
  Bot,
  Package2,
  X,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { haptic } from '../haptics';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useRecentlyViewed } from '../../stores/recentlyViewedStore';
import { SERVER_URL } from '../../lib/config';

type MobileAssistantSheetProps = {
  open: boolean;
  onClose: () => void;
};

type RowProps = {
  icon: ComponentType<{ size?: number; strokeWidth?: number; style?: CSSProperties; className?: string }>;
  iconStyle: CSSProperties;
  title: string;
  subtitle?: string;
  onClick: () => void;
  trailing?: ReactNode;
  iconContent?: ReactNode;
};

function ActionRow({ icon: Icon, iconStyle, title, subtitle, onClick, trailing, iconContent }: RowProps) {
  return (
    <button type="button" className="ai-action-row" onClick={onClick}>
      <span className="ai-action-icon" style={iconStyle}>
        {iconContent ?? (
          <Icon size={18} strokeWidth={1.75} style={{ color: iconStyle.color as string }} />
        )}
      </span>
      <span className="ai-action-text">
        <span className="ai-action-title">{title}</span>
        {subtitle && <span className="ai-action-sub">{subtitle}</span>}
      </span>
      {trailing ?? <ChevronRight size={16} className="ai-action-chevron" strokeWidth={2} />}
    </button>
  );
}

function resolveAvatar(url?: string) {
  if (!url?.trim()) return null;
  const v = url.trim();
  if (v.startsWith('http') || v.startsWith('data:')) return v;
  return `${SERVER_URL}${v.startsWith('/') ? v : `/${v}`}`;
}

export default function MobileAssistantSheet({ open, onClose }: MobileAssistantSheetProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cartItems = useBuyerCart((s) => s.items);
  const openCart = useBuyerCart((s) => s.openCart);
  const wishlistItems = useWishlistStore((s) => s.items);
  const recentItems = useRecentlyViewed((s) => s.items);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const wishCount = wishlistItems.length;
  const recentCount = recentItems.length;

  const displayName = useMemo(() => {
    const n = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Guest';
    return n.split(' ')[0];
  }, [user]);

  const initials = useMemo(() => {
    const n = user?.full_name?.trim() || user?.email || 'G';
    return n
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const avatarSrc = resolveAvatar(user?.avatar_url);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = (fn: () => void) => {
    haptic('selection');
    fn();
    onClose();
  };

  const openChat = (query?: string) => {
    window.dispatchEvent(
      new CustomEvent('spacilly:assistant:open', { detail: query ? { query } : undefined }),
    );
    onClose();
  };

  const cartSub =
    cartCount > 0 ? `${cartCount} item${cartCount > 1 ? 's' : ''}` : 'Empty';
  const wishSub = wishCount > 0 ? `${wishCount} items` : 'Saved';
  const recentSub =
    recentCount > 0 ? `${recentCount} item${recentCount > 1 ? 's' : ''}` : 'Items you viewed';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close assistant"
            className="ai-sheet-backdrop md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
          />
          <div className="ai-sheet-wrap md:hidden">
            <motion.div
              className="ai-sheet-panel"
              role="dialog"
              aria-modal="true"
              aria-label="AI Assistant"
              initial={{ y: '100%', opacity: 0.92 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.92 }}
              transition={{ type: 'spring', stiffness: 440, damping: 38, mass: 0.82 }}
            >
              <div className="ai-sheet-top">
                <div className="ai-sheet-handle" aria-hidden />
                <div className="ai-sheet-user-row">
                  <div className="ai-sheet-avatar" aria-hidden>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="ai-sheet-user-meta">
                    <p className="ai-sheet-user-name">
                      {displayName} 👋
                    </p>
                    <p className="ai-sheet-user-greet">Welcome back to Spacilly</p>
                  </div>
                  <div className="ai-sheet-header-actions">
                    <button
                      type="button"
                      className="ai-sheet-icon-btn"
                      aria-label="Settings"
                      onClick={() =>
                        go(() =>
                          navigate(user ? '/account?tab=settings' : '/auth?tab=login'),
                        )
                      }
                    >
                      <Settings size={18} strokeWidth={1.85} />
                    </button>
                    <button
                      type="button"
                      className="ai-sheet-icon-btn"
                      aria-label="Close"
                      onClick={onClose}
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="ai-sheet-scroll">
                <button
                  type="button"
                  className="ai-sheet-hero"
                  onClick={() => {
                    haptic('selection');
                    openChat();
                  }}
                >
                  <span className="ai-sheet-hero-icon">
                    <Sparkles size={22} strokeWidth={1.85} />
                  </span>
                  <span className="flex-1 min-w-0 pr-1">
                    <span className="ai-sheet-hero-title">Ask AI assistant</span>
                    <span className="ai-sheet-hero-sub">
                      Get personalized help, deals, or suggestions
                    </span>
                  </span>
                  <ChevronRight size={18} className="ai-sheet-hero-chevron" />
                </button>

                <div className="ai-quick-grid">
                  <button
                    type="button"
                    className="ai-quick-tile"
                    onClick={() => go(() => navigate('/search'))}
                  >
                    <span className="ai-quick-tile-icon ai-quick-icon--search">
                      <Search size={18} strokeWidth={1.75} />
                    </span>
                    <span className="ai-quick-tile-label">Search</span>
                    <span className="ai-quick-tile-sub">Find anything</span>
                  </button>
                  <button
                    type="button"
                    className="ai-quick-tile"
                    onClick={() => go(() => openCart())}
                  >
                    {cartCount > 0 && (
                      <span className="ai-badge">{cartCount > 99 ? '99+' : cartCount}</span>
                    )}
                    <span className="ai-quick-tile-icon ai-quick-icon--cart">
                      <ShoppingBag size={18} strokeWidth={1.75} />
                    </span>
                    <span className="ai-quick-tile-label">Cart</span>
                    <span className="ai-quick-tile-sub">{cartSub}</span>
                  </button>
                  <button
                    type="button"
                    className="ai-quick-tile"
                    onClick={() => go(() => navigate('/account?tab=wishlist'))}
                  >
                    <span className="ai-quick-tile-icon ai-quick-icon--wish">
                      <Heart size={18} strokeWidth={1.75} />
                    </span>
                    <span className="ai-quick-tile-label">Wishlist</span>
                    <span className="ai-quick-tile-sub">{wishSub}</span>
                  </button>
                  <button
                    type="button"
                    className="ai-quick-tile"
                    onClick={() => go(() => navigate('/search?sort=discount'))}
                  >
                    <span className="ai-quick-tile-icon ai-quick-icon--deals">
                      <Tag size={18} strokeWidth={1.75} />
                    </span>
                    <span className="ai-quick-tile-label">Today&apos;s deals</span>
                    <span className="ai-quick-tile-sub">Hot discounts</span>
                  </button>
                  <button
                    type="button"
                    className="ai-quick-tile"
                    onClick={() => go(() => navigate('/search'))}
                  >
                    <span className="ai-quick-tile-icon ai-quick-icon--discover">
                      <Compass size={18} strokeWidth={1.75} />
                    </span>
                    <span className="ai-quick-tile-label">Discover</span>
                    <span className="ai-quick-tile-sub">Recommended</span>
                  </button>
                </div>

                <p className="ai-section-label">Shop</p>
                <ActionRow
                  icon={LayoutGrid}
                  iconStyle={{ background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' }}
                  title="Categories"
                  subtitle="Browse all categories"
                  onClick={() => go(() => navigate('/category/all'))}
                />
                <ActionRow
                  icon={Zap}
                  iconStyle={{ background: 'rgba(249, 115, 22, 0.18)', color: '#fb923c' }}
                  title="Flash Deals"
                  subtitle="Limited time offers"
                  onClick={() => go(() => navigate('/search?sort=discount'))}
                />
                <ActionRow
                  icon={Tag}
                  iconStyle={{ background: 'rgba(236, 72, 153, 0.18)', color: '#f472b6' }}
                  title="New Arrivals"
                  subtitle="Fresh products"
                  onClick={() => go(() => navigate('/search?sort=newest'))}
                  iconContent={<span className="ai-new-badge">NEW!</span>}
                />
                <ActionRow
                  icon={Shield}
                  iconStyle={{ background: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}
                  title="Top Brands"
                  subtitle="Popular brands"
                  onClick={() => go(() => navigate('/search'))}
                />

                <p className="ai-section-label">Account</p>
                <ActionRow
                  icon={Package}
                  iconStyle={{ background: 'rgba(249, 115, 22, 0.18)', color: '#fb923c' }}
                  title="Orders"
                  subtitle="Track and manage orders"
                  onClick={() => go(() => navigate(user ? '/account?tab=orders' : '/auth?tab=login'))}
                />
                <ActionRow
                  icon={Bookmark}
                  iconStyle={{ background: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}
                  title="Saved Items"
                  subtitle="Your saved products"
                  onClick={() => go(() => navigate(user ? '/account?tab=wishlist' : '/auth?tab=login'))}
                />
                <ActionRow
                  icon={Clock}
                  iconStyle={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                  title="Recently Viewed"
                  subtitle={recentSub}
                  onClick={() => go(() => navigate('/search'))}
                />

                <p className="ai-section-label">Smart</p>
                <ActionRow
                  icon={Wand2}
                  iconStyle={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c4b5fd' }}
                  title="AI Recommendations"
                  subtitle="Products for you"
                  onClick={() => go(() => navigate('/search'))}
                />
                <ActionRow
                  icon={Bot}
                  iconStyle={{ background: 'rgba(148, 163, 184, 0.12)', color: '#e2e8f0' }}
                  title="Spacilly AI Assistant"
                  subtitle="Get help instantly"
                  onClick={() => {
                    haptic('selection');
                    openChat();
                  }}
                />
                <ActionRow
                  icon={Package2}
                  iconStyle={{ background: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}
                  title="Free shipping"
                  subtitle="On orders over $50"
                  onClick={() => go(() => navigate('/buyer-protection'))}
                  trailing={<span className="ai-cta-pill">Shop now &gt;</span>}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
