import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function MobileSectionHeader({
  id,
  title,
  subtitle,
  href,
  linkLabel = 'View all',
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 id={id} className="mob-section-title">
          {title}
        </h2>
        {subtitle && <p className="mob-section-sub">{subtitle}</p>}
      </div>
      {href && (
        <Link to={href} className="mob-link-all flex shrink-0 items-center gap-0.5">
          {linkLabel}
          <ChevronRight size={14} strokeWidth={2.25} />
        </Link>
      )}
    </div>
  );
}
