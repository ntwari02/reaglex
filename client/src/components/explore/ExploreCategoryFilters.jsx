import { TRENDING_CATEGORY_FILTERS } from './exploreConfig';

export default function ExploreCategoryFilters({ activeId = 'all', onChange }) {
  return (
    <div className="ex-cat-filters" role="tablist" aria-label="Product categories">
      <div className="ex-cat-scroll">
        {TRENDING_CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeId === cat.id}
            className={`ex-cat-pill${activeId === cat.id ? ' is-active' : ''}`}
            onClick={() => onChange(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
