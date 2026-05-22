import { Plus } from 'lucide-react';

/**
 * Compact mobile add-to-cart control (icon or pill).
 * Matches Reaglex brand CTA: --brand-primary, ~26–30px touch target.
 */
export default function MobileAddCta({
  onClick,
  disabled = false,
  className = '',
  label,
  variant = 'icon',
  'aria-label': ariaLabel = 'Add to cart',
}) {
  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={`mob-add-cta mob-add-cta--pill ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <Plus size={12} strokeWidth={2.5} aria-hidden />
        {label ? <span>{label}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`mob-add-cta ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Plus size={14} strokeWidth={2.5} aria-hidden />
    </button>
  );
}
