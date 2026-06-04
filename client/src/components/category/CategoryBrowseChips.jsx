import { X } from 'lucide-react';
import {
  Cpu, Shirt, Home, Dumbbell, Sparkles, Gamepad2, BookOpen, Car, Layers, Footprints,
} from 'lucide-react';
import { useStorefrontCategories } from '../../hooks/useBuyerSiteContent';

const ICON_BY_SLUG = {
  clothing: Shirt,
  fashion: Shirt,
  electronics: Cpu,
  shoes: Footprints,
  'home-garden': Home,
  home: Home,
  sports: Dumbbell,
  beauty: Sparkles,
  books: BookOpen,
  automotive: Car,
  toys: Gamepad2,
  gaming: Gamepad2,
};

const FALLBACK_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'clothing', label: 'Fashion' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'home-garden', label: 'Home' },
  { id: 'sports', label: 'Sports' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'books', label: 'Books' },
  { id: 'automotive', label: 'Auto' },
  { id: 'toys', label: 'Gaming' },
];

function buildChips(categories) {
  if (!categories?.length) return FALLBACK_CHIPS;
  const fromApi = categories.slice(0, 12).map((c) => ({
    id: c.slug,
    label: c.name,
    icon: ICON_BY_SLUG[c.slug] || Layers,
  }));
  return [{ id: 'all', label: 'All', icon: Layers }, ...fromApi];
}

/**
 * Horizontal closable category pills for category browse.
 * Active non-All chip shows × to clear back to All.
 */
export default function CategoryBrowseChips({ activeId = 'all', onSelect, onClear }) {
  const { data: categories = [] } = useStorefrontCategories();
  const chips = buildChips(categories);

  return (
    <div className="cat-browse-chips-scroll" role="tablist" aria-label="Categories">
      {chips.map((c) => {
        const Icon = c.icon || Layers;
        const active = activeId === c.id;
        const closable = active && c.id !== 'all';

        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`cat-browse-chip${active ? ' is-active' : ''}${closable ? ' is-closable' : ''}`}
            onClick={() => onSelect?.(c.id)}
          >
            <Icon size={14} strokeWidth={1.85} aria-hidden className="cat-browse-chip__icon" />
            <span className="cat-browse-chip__label">{c.label}</span>
            {closable && (
              <span
                className="cat-browse-chip__close"
                role="button"
                aria-label={`Clear ${c.label} filter`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear?.();
                }}
              >
                <X size={12} strokeWidth={2.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
