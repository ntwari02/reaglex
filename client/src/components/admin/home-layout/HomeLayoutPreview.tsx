import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import HomeExploreSection from '../../home/mobile/HomeExploreSection';
import { buildResolvedHomeLayout, HOME_LAYOUT_SECTION_META } from '@/constants/buyerHomeLayoutDefaults';
import '@/styles/explore-all.css';
import '@/styles/home-explore-bridge.css';
import '@/styles/home-layout-cards.css';

const MOCK_PRODUCTS = [
  {
    _id: 'preview-1',
    name: 'Wireless earbuds Pro',
    price: 45000,
    rating: 4.8,
    reviewCount: 240,
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
  },
  {
    _id: 'preview-2',
    name: 'Casual linen shirt',
    price: 28000,
    rating: 4.6,
    reviewCount: 89,
    thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
  },
  {
    _id: 'preview-3',
    name: 'Smart watch band',
    price: 12000,
    rating: 4.7,
    reviewCount: 512,
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  },
  {
    _id: 'preview-4',
    name: 'Running shoes elite',
    price: 89000,
    rating: 4.5,
    reviewCount: 120,
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
  },
  {
    _id: 'preview-5',
    name: 'Ceramic mug set',
    price: 15000,
    rating: 4.9,
    reviewCount: 890,
    thumbnail: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80',
  },
  {
    _id: 'preview-6',
    name: 'Leather tote bag',
    price: 52000,
    rating: 4.4,
    reviewCount: 67,
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
  },
];

type Viewport = 'mobile' | 'desktop';

type Props = {
  viewport: Viewport;
  sectionId: string;
  draftOverrides: Record<string, unknown>;
  comparingLive?: boolean;
};

/** Inline preview — uses draft layout; does not hit the storefront. */
export default function HomeLayoutPreview({
  viewport,
  sectionId,
  draftOverrides,
  comparingLive = false,
}: Props) {
  const resolved = useMemo(
    () => buildResolvedHomeLayout(draftOverrides as Record<string, unknown>),
    [draftOverrides],
  );

  const layoutSettings = resolved[sectionId]?.[viewport];
  const meta = HOME_LAYOUT_SECTION_META[sectionId];

  const variantMap: Record<string, string> = {
    trending: 'trending',
    bestsellers: 'bestseller',
    fresh: 'new',
    foryou: 'ai',
    recommended: 'trending',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Eye className="w-4 h-4 text-violet-500" />
          Preview · {meta?.label}
        </span>
        <span
          className={`home-layout-preview-badge ${comparingLive ? 'home-layout-preview-badge--live' : ''}`}
        >
          {comparingLive ? 'Live on site' : 'Draft — not published'}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Mode: <strong>{layoutSettings?.mode}</strong>
        {layoutSettings?.cardDensity && layoutSettings.cardDensity !== 'standard' && (
          <> · cards: <strong>{layoutSettings.cardDensity}</strong></>
        )}
      </p>
      <div
        className={`home-layout-preview-frame home-layout-preview-frame--${viewport}`}
        data-preview-viewport={viewport}
      >
        <PreviewSection
          sectionId={sectionId}
          viewport={viewport}
          layoutSettings={layoutSettings}
          variant={variantMap[sectionId] || 'trending'}
        />
      </div>
    </div>
  );
}

function PreviewSection({
  sectionId,
  viewport,
  layoutSettings,
  variant,
}: {
  sectionId: string;
  viewport: Viewport;
  layoutSettings: Record<string, unknown>;
  variant: string;
}) {
  const mode = String(layoutSettings?.mode || 'grid');

  if (viewport === 'mobile') {
    return (
      <HomeExploreSection
        id={`preview-${sectionId}`}
        sectionKey={sectionId}
        title={HOME_LAYOUT_SECTION_META[sectionId]?.label || sectionId}
        subtitle="Preview sample products"
        href="#"
        products={MOCK_PRODUCTS}
        loading={false}
        variant={variant}
        layoutOverride={layoutSettings}
      />
    );
  }

  if (mode === 'horizontal_carousel') {
    return (
      <div className="p-4 flex gap-3 overflow-x-auto">
        {MOCK_PRODUCTS.slice(0, 6).map((p, i) => (
          <div
            key={p._id}
            className="flex-shrink-0 w-[200px] rounded-xl border p-2 bg-[var(--card-bg)]"
            style={{ borderColor: 'var(--divider)' }}
          >
            <img src={p.thumbnail} alt="" className="w-full aspect-square object-cover rounded-lg" />
            <p className="text-xs font-semibold mt-2 line-clamp-2">{p.name}</p>
            <p className="text-xs text-[var(--text-price)]">RWF {p.price.toLocaleString()}</p>
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'trending_rail') {
    const railN = Number(layoutSettings?.railCount) || 4;
    return (
      <div className="p-4 space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {MOCK_PRODUCTS.slice(0, railN).map((p) => (
            <div key={p._id} className="flex-shrink-0 w-[180px] rounded-xl border overflow-hidden">
              <img src={p.thumbnail} alt="" className="w-full aspect-[4/3] object-cover" />
              <p className="text-xs p-2 font-semibold">{p.name}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {MOCK_PRODUCTS.slice(railN).map((p) => (
            <div key={p._id} className="rounded-xl border overflow-hidden">
              <img src={p.thumbnail} alt="" className="w-full aspect-square object-cover" />
              <p className="text-[10px] p-1.5">{p.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cols = Number(layoutSettings?.gridColumns) || 4;
  return (
    <div
      className="p-4 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {MOCK_PRODUCTS.map((p) => (
        <div key={p._id} className="rounded-xl border overflow-hidden bg-[var(--card-bg)]">
          <img src={p.thumbnail} alt="" className="w-full aspect-square object-cover" />
          <p className="text-xs p-2 font-semibold line-clamp-2">{p.name}</p>
        </div>
      ))}
    </div>
  );
}
