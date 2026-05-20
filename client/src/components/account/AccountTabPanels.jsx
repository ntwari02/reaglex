import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Package,
  CreditCard,
  RotateCcw,
  Star,
  Settings,
} from 'lucide-react';
import api from '../../services/api';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useRecentlyViewed } from '../../stores/recentlyViewedStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { resolveProductImage, productDisplayName } from '../home/mobile/productUtils';
import { PANEL_TITLES } from './accountConfig';
import { OsCard, OsEmpty, OsPageHero, OsShimmer, OsBtn } from './os/AccountOsPrimitives';
import AccountSettingsEmbed from './AccountSettingsEmbed';
import { useAccountOverlay } from '../../stores/accountOverlayStore';
import { shouldUseAccountOverlay } from '../../lib/accountNavigation';

function mapOrder(order) {
  if (!order) return null;
  const createdAt = order.created_at || order.date || order.createdAt;
  return {
    id: order.order_number || order.orderNumber || order.id,
    date: createdAt
      ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
    status: String(order.status || 'processing'),
    total: order.total || 0,
    items: Array.isArray(order.items)
      ? order.items.reduce((s, i) => s + (i.quantity || 0), 0)
      : 0,
  };
}

function statusLabel(status) {
  const s = status.toLowerCase();
  if (s.includes('deliver')) return { label: 'Delivered', mod: 'delivered' };
  if (s.includes('ship')) return { label: 'Shipped', mod: 'shipped' };
  if (s.includes('pend') || s.includes('pay')) return { label: 'To Pay', mod: 'pending' };
  return { label: status, mod: 'default' };
}

export default function AccountTabPanels({ panelId, userId }) {
  const navigate = useNavigate();
  const currencyPricing = useCurrencyPricing();
  const openAppearance = useAccountOverlay((s) => s.openAppearance);
  const settingsSection = useAccountOverlay((s) => s.settingsSection);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['account-os-orders', userId],
    queryFn: async () => {
      const res = await api.get('/orders', { params: { limit: 50 } });
      const raw = res.data?.orders || res.data?.data?.orders || [];
      return raw.map(mapOrder).filter(Boolean);
    },
    enabled: panelId === 'orders' && Boolean(userId),
    staleTime: 60 * 1000,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['account-os-addresses', userId],
    queryFn: async () => {
      const res = await api.get('/buyer/addresses');
      return res.data?.addresses || res.data || [];
    },
    enabled: panelId === 'addresses' && Boolean(userId),
    staleTime: 60 * 1000,
  });

  const wishlist = useWishlistStore((s) => s.items);
  const recent = useRecentlyViewed((s) => s.items).slice(0, 8);

  useEffect(() => {
    if (userId && panelId === 'wishlist') {
      useWishlistStore.getState().fetchWishlist(userId);
    }
  }, [userId, panelId]);

  const openFullTab = (tab, section) => {
    if (shouldUseAccountOverlay()) return;
    const q = new URLSearchParams();
    q.set('tab', tab);
    if (section) q.set('section', section);
    navigate(`/account?${q.toString()}`);
  };

  const title = PANEL_TITLES[panelId] || 'Account';

  if (panelId === 'settings') {
    return (
      <div className="aos-panel-scroll">
        <OsPageHero
          eyebrow="System"
          title="Account Settings"
          subtitle="Profile, security, notifications & appearance"
        />
        <div className="aos-settings-embed">
          <AccountSettingsEmbed initialSection={settingsSection || 'profile'} />
        </div>
      </div>
    );
  }

  return (
    <div className="aos-panel-scroll">
      <OsPageHero eyebrow="Account" title={title} subtitle="Layered commerce OS · instant & secure" />

      {panelId === 'orders' && (
        <>
          {ordersLoading && <OsShimmer height={120} />}
          {!ordersLoading && !orders.length && (
            <OsEmpty title="No orders yet" desc="When you purchase, orders appear here instantly." />
          )}
          {orders.map((o) => {
            const st = statusLabel(o.status);
            return (
              <OsCard key={o.id} className="mb-3 aos-order-card">
                <div>
                  <p className="text-sm font-bold m-0">Order #{String(o.id).slice(-8)}</p>
                  <p className="text-xs mt-1 m-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {o.date} · {o.items} items
                  </p>
                </div>
                <div className="text-right">
                  <span className="aos-status-pill">{st.label}</span>
                  <p className="text-sm font-bold mt-2 m-0" style={{ color: '#ff6a00' }}>
                    {currencyPricing.formatLocalWithUsd(o.total)}
                  </p>
                </div>
              </OsCard>
            );
          })}
        </>
      )}

      {panelId === 'wishlist' && (
        <>
          {!wishlist.length && (
            <OsEmpty title="Wishlist empty" desc="Save products you love from any listing." />
          )}
          {wishlist.map((item) => {
            const p = item.product || item;
            return (
              <OsCard key={item.id || item.product_id} className="mb-3">
                <p className="text-sm font-semibold m-0">
                  {p?.title || p?.name || 'Saved product'}
                </p>
                {p?.price != null && (
                  <p className="text-xs mt-1 m-0" style={{ color: '#ff6a00' }}>
                    {currencyPricing.formatLocalWithUsd(p.price)}
                  </p>
                )}
              </OsCard>
            );
          })}
        </>
      )}

      {panelId === 'addresses' && (
        <>
          {addressesLoading && <OsShimmer height={100} />}
          {!addressesLoading && !addresses.length && (
            <OsEmpty
              title="No addresses"
              desc="Add a delivery address for faster checkout."
              action={
                !shouldUseAccountOverlay() ? (
                  <OsBtn className="mt-4" onClick={() => openFullTab('addresses')}>
                    Manage addresses
                  </OsBtn>
                ) : null
              }
            />
          )}
          {addresses.map((a) => (
            <OsCard key={a.id || a._id} className="mb-3">
              <div className="flex gap-3">
                <MapPin size={18} style={{ color: '#ff6a00', flexShrink: 0 }} />
                <div>
                  <p className="text-sm font-semibold m-0">{a.label || a.name || 'Address'}</p>
                  <p className="text-xs mt-1 m-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {[a.street, a.city, a.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </OsCard>
          ))}
        </>
      )}

      {panelId === 'payments' && (
        <OsEmpty
          title="Payment methods"
          desc="Cards, mobile money, and escrow wallets — managed securely in your vault."
          action={
            <OsBtn className="mt-4" variant="ghost" onClick={() => openFullTab('payments')}>
              {!shouldUseAccountOverlay() && 'Open payments hub'}
            </OsBtn>
          }
        />
      )}

      {panelId === 'returns' && (
        <OsEmpty
          title="Returns & refunds"
          desc="Track return requests and dispute status in one place."
          action={
            !shouldUseAccountOverlay() ? (
              <OsBtn className="mt-4" onClick={() => openFullTab('returns')}>
                View returns
              </OsBtn>
            ) : null
          }
        />
      )}

      {panelId === 'reviews' && (
        <OsEmpty
          title="Your reviews"
          desc="Reviews you have written appear here."
          action={
            !shouldUseAccountOverlay() ? (
              <OsBtn className="mt-4" onClick={() => openFullTab('reviews')}>
                My reviews
              </OsBtn>
            ) : null
          }
        />
      )}

      {panelId === 'overview' && (
        <>
          <p className="aos-section-title" style={{ marginTop: 0 }}>
            RECENTLY VIEWED
          </p>
          {!recent.length && (
            <OsEmpty title="Nothing recent" desc="Browse the marketplace to build your trail." />
          )}
          {recent.map((p) => (
            <OsCard key={p._id || p.id} className="mb-3 flex gap-3">
              <img
                src={resolveProductImage(p)}
                alt=""
                className="w-14 h-14 rounded-[14px] object-cover"
              />
              <div>
                <p className="text-sm font-semibold m-0">{productDisplayName(p)}</p>
                <p className="text-xs mt-1 m-0" style={{ color: '#ff6a00' }}>
                  {currencyPricing.formatLocalWithUsd(p.price || 0)}
                </p>
              </div>
            </OsCard>
          ))}
        </>
      )}

      {!['orders', 'wishlist', 'addresses', 'payments', 'returns', 'reviews', 'overview', 'settings'].includes(
        panelId,
      ) && (
        <OsEmpty
          title={title}
          desc="This section is part of your Reaglex account OS."
          action={
            <OsBtn className="mt-4" variant="ghost" onClick={openAppearance}>
              <Settings size={16} className="inline mr-2" />
              Appearance settings
            </OsBtn>
          }
        />
      )}
    </div>
  );
}
