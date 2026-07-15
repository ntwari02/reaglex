import { Plus, ShoppingCart } from 'lucide-react';

/**
 * Compact mobile add-to-cart control (icon or pill).
 * Matches Spacilly brand CTA: --brand-primary, ~26–30px touch target.
 */
export default function MobileAddCta({
  onClick,
  disabled = false,
  className = '',
  label,
  variant = 'icon',
  iconType = 'plus',
  'aria-label': ariaLabel = 'Add to cart',
}) {
  const Icon = iconType === 'cart' ? ShoppingCart : Plus;
  const iconSize = iconType === 'cart' ? 13 : variant === 'pill' ? 12 : 14;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={`mob-add-cta mob-add-cta--pill ${iconType === 'cart' ? 'mob-add-cta--cart' : ''} ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <Icon size={iconSize} strokeWidth={iconType === 'cart' ? 2 : 2.5} aria-hidden />
        {label ? <span>{label}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`mob-add-cta ${iconType === 'cart' ? 'mob-add-cta--cart' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Icon size={iconSize} strokeWidth={iconType === 'cart' ? 2 : 2.5} aria-hidden />
    </button>
  );
}
