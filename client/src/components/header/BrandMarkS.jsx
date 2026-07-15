import { Link } from 'react-router-dom';
import '../../styles/brand-mark.css';

export default function BrandMarkS({ className = '', onClick }) {
  const inner = (
    <span className="brand-mark-s__letter" aria-hidden>
      S
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`brand-mark-s ${className}`.trim()}
        aria-label="Spacilly home"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link to="/" className={`brand-mark-s ${className}`.trim()} aria-label="Spacilly home">
      {inner}
    </Link>
  );
}
