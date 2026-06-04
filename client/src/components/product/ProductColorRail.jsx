import { ChevronRight, Flame } from 'lucide-react';
import { resolvePreviewImage } from './productPreviewUtils';
import '../../styles/product-detail-ali.css';

/**
 * AliExpress-style horizontal color picker with image thumbnails.
 */
export default function ProductColorRail({
  label = 'Color',
  selectedLabel = '',
  options = [],
  activeKey = '',
  onSelect,
  showChevron = true,
}) {
  if (!options.length) return null;

  return (
    <section className="pd2-ali-block" aria-label={`${label} selection`}>
      <div className="pd2-ali-block__head">
        <p className="pd2-ali-block__title">
          {label}: <span>{selectedLabel || '—'}</span>
        </p>
        {showChevron && (
          <span className="pd2-ali-block__link" aria-hidden>
            <ChevronRight size={16} />
          </span>
        )}
      </div>
      <div className="pd2-color-rail">
        {options.map((opt) => {
          const key = opt.key || opt.color || opt.label;
          const active = activeKey === key;
          const thumb = resolvePreviewImage(opt.thumbnailUrl || opt.image);
          return (
            <button
              key={key}
              type="button"
              className="pd2-color-chip"
              data-active={active ? 'true' : 'false'}
              aria-pressed={active}
              aria-label={`${opt.label || key}${opt.badge ? `, ${opt.badge}` : ''}`}
              onClick={() => onSelect?.(opt)}
            >
              <span className="pd2-color-chip__img">
                <img src={thumb} alt="" loading="lazy" />
                {opt.badge && (
                  <span className="pd2-color-chip__badge" title={opt.badge}>
                    <Flame size={10} fill="currentColor" />
                  </span>
                )}
              </span>
              <span className="pd2-color-chip__label">{opt.label || key}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
