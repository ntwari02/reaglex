import { ChevronRight } from 'lucide-react';
import '../../styles/product-detail-ali.css';

/**
 * Horizontal review media rail (AliExpress “Review gallery”).
 */
export default function ProductReviewGalleryRail({
  items = [],
  totalCount = 0,
  onSeeAll,
  title = 'Review gallery',
}) {
  if (!items.length) return null;
  const count = totalCount || items.length;

  return (
    <section className="pd2-ali-block" aria-label={title}>
      <div className="pd2-ali-block__head">
        <p className="pd2-ali-block__title">{title}</p>
        {onSeeAll && (
          <button type="button" className="pd2-ali-block__link" onClick={onSeeAll}>
            See all ({count})
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="pd2-review-gallery-rail">
        {items.slice(0, 12).map((item) => (
          <button
            key={item.id}
            type="button"
            className="pd2-review-gallery-item"
            onClick={onSeeAll}
            aria-label="View customer review photos"
          >
            <img src={item.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
}
