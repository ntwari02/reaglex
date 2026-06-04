import { Link } from 'react-router-dom';
import '../../styles/brand-mark.css';

export default function BrandMarkR({ className = '', onClick }) {
  const inner = (
    <span className="brand-mark-r__letter" aria-hidden>
      R
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`brand-mark-r ${className}`.trim()}
        aria-label="Reaglex home"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link to="/" className={`brand-mark-r ${className}`.trim()} aria-label="Reaglex home">
      {inner}
    </Link>
  );
}
