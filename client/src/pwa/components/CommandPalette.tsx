import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Home,
  ShoppingCart,
  Package,
  Heart,
  User,
  Bell,
  Tag,
  LayoutDashboard,
  Compass,
  ArrowRight,
  Command as CmdIcon,
  MessageCircle,
} from 'lucide-react';
import { haptic } from '../haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import MobileAssistantSheet from './MobileAssistantSheet';

type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  group: 'Pages' | 'Account' | 'Shop' | 'Help' | 'AI';
  keywords?: string;
  action: () => void;
};

const COMMAND_OPEN_EVENT = 'spacilly:commandpalette:open';

export function openCommandPalette() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COMMAND_OPEN_EVENT));
}

function fuzzy(text: string, query: string): number {
  if (!query) return 1;
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t.includes(q)) return 5;
  let score = 0;
  let i = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, i);
    if (idx < 0) return 0;
    score += idx === i ? 2 : 1;
    i = idx + 1;
  }
  return score;
}

/** Desktop command palette (unchanged behavior). */
function DesktopCommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const close = () => {
    onClose();
    setQuery('');
    setSelected(0);
  };

  const go = (to: string) => {
    navigate(to);
    close();
  };

  const items = useMemo<CommandItem[]>(
    () => [
      {
        id: 'ai',
        title: 'Ask AI assistant',
        subtitle: query ? `Ask: "${query}"` : 'Get personalized help, deals, or summaries',
        icon: Sparkles,
        group: 'AI',
        keywords: 'ai assistant chat help support',
        action: () => {
          window.dispatchEvent(
            new CustomEvent('spacilly:assistant:open', { detail: { query } }),
          );
          close();
        },
      },
      {
        id: 'search',
        title: query ? `Search "${query}"` : 'Search products',
        subtitle: 'Find anything across the marketplace',
        icon: Search,
        group: 'Shop',
        keywords: 'search find products',
        action: () => go(`/search?q=${encodeURIComponent(query)}`),
      },
      {
        id: 'home',
        title: 'Home',
        subtitle: 'Open the storefront',
        icon: Home,
        group: 'Pages',
        keywords: 'home start',
        action: () => go('/'),
      },
      {
        id: 'cart',
        title: 'Open Cart',
        subtitle: 'Review items before checkout',
        icon: ShoppingCart,
        group: 'Shop',
        keywords: 'cart basket bag',
        action: () => go('/cart'),
      },
      {
        id: 'wishlist',
        title: 'Wishlist',
        subtitle: 'Saved and liked items',
        icon: Heart,
        group: 'Shop',
        keywords: 'wishlist favorites likes',
        action: () => go('/account?tab=wishlist'),
      },
      {
        id: 'orders',
        title: 'My Orders',
        subtitle: 'Track recent orders',
        icon: Package,
        group: 'Account',
        keywords: 'orders tracking purchases history',
        action: () => go('/account?tab=orders'),
      },
      {
        id: 'notifications',
        title: 'Notifications',
        subtitle: 'See alerts and updates',
        icon: Bell,
        group: 'Account',
        keywords: 'notifications inbox alerts',
        action: () => go('/account?tab=notifications'),
      },
      {
        id: 'deals',
        title: 'Today\u2019s deals',
        subtitle: 'Hot products & discounts',
        icon: Tag,
        group: 'Shop',
        keywords: 'deals promotions sale discount',
        action: () => go('/search?q=deals'),
      },
      {
        id: 'discover',
        title: 'Discover',
        subtitle: 'Recommended for you',
        icon: Compass,
        group: 'Shop',
        keywords: 'discover explore browse',
        action: () => go('/recommendations'),
      },
      {
        id: 'account',
        title: 'Account settings',
        subtitle: 'Profile, security & preferences',
        icon: User,
        group: 'Account',
        keywords: 'account profile settings',
        action: () => go('/account'),
      },
      {
        id: 'seller',
        title: 'Seller Hub',
        subtitle: 'Manage your store',
        icon: LayoutDashboard,
        group: 'Account',
        keywords: 'seller dashboard hub store',
        action: () => go('/seller'),
      },
      {
        id: 'support',
        title: 'Contact support',
        subtitle: 'Reach our help team',
        icon: MessageCircle,
        group: 'Help',
        keywords: 'support help contact',
        action: () => go('/contact'),
      },
    ],
    [query, navigate],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((i) => ({
        item: i,
        score:
          fuzzy(i.title, query) * 2 +
          fuzzy(i.subtitle || '', query) +
          fuzzy(i.keywords || '', query),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selected];
      if (item) {
        haptic('selection');
        item.action();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const it of filtered) {
      const list = map.get(it.group) || [];
      list.push(it);
      map.set(it.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmd-palette-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="hidden md:flex fixed inset-0 z-[100] items-start justify-center pt-[12vh] px-4"
          style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-2xl rounded-3xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <Search className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search Spacilly or ask AI…"
                className="cmd-palette-input flex-1 bg-transparent text-base outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <div
                className="hidden sm:flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted)',
                }}
              >
                <CmdIcon className="h-3 w-3" /> K
              </div>
            </div>
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No results. Try a different keyword or ask the AI assistant.
                </div>
              )}
              {grouped.map(([group, list]) => (
                <div key={group} className="px-2 py-1">
                  <p
                    className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {group}
                  </p>
                  {list.map((item) => {
                    const idx = filtered.indexOf(item);
                    const active = idx === selected;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setSelected(idx)}
                        onClick={() => {
                          haptic('selection');
                          item.action();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                        style={{
                          background: active ? 'var(--bg-active)' : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{
                            background: active
                              ? 'var(--commerce-gradient-cta)'
                              : 'var(--bg-tertiary)',
                          }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)' }}
                          />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        {active && <ArrowRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              className="flex items-center justify-between px-4 py-2 text-[11px]"
              style={{
                borderTop: '1px solid var(--divider)',
                color: 'var(--text-faint)',
              }}
            >
              <span>
                <kbd className="rounded px-1 py-0.5" style={{ border: '1px solid var(--border-card)' }}>↑↓</kbd>{' '}
                <kbd className="rounded px-1 py-0.5" style={{ border: '1px solid var(--border-card)' }}>↵</kbd> to navigate
              </span>
              <span>
                <kbd className="rounded px-1 py-0.5" style={{ border: '1px solid var(--border-card)' }}>Esc</kbd> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const close = () => setOpen(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        haptic('selection');
        setOpen((v) => !v);
      } else if (e.key === '/' && !open && !isMobile) {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        close();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isMobile]);

  useEffect(() => {
    function evt() {
      setOpen(true);
    }
    window.addEventListener(COMMAND_OPEN_EVENT, evt);
    return () => window.removeEventListener(COMMAND_OPEN_EVENT, evt);
  }, []);

  if (isMobile) {
    return <MobileAssistantSheet open={open} onClose={close} />;
  }

  return <DesktopCommandPalette open={open} onClose={close} />;
}
