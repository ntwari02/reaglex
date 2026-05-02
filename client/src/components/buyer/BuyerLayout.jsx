import Footer from '../Footer';

/*
 * Navbar is intentionally NOT rendered here.
 * It is rendered in App.tsx via <GlobalNavbar /> which lives OUTSIDE the
 * cart-push motion.div.  Rendering it here (inside the transformed wrapper)
 * would make position:fixed anchor to the transformed ancestor, causing the
 * navbar to scroll away with the page and shift with the cart animation.
 * The padding-top on the inner wrapper compensates for the fixed GlobalNavbar height
 * (mobile includes the extra search row) plus a small gap and safe-area insets.
 */
export default function BuyerLayout({ children, className = '' }) {
  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        background: 'var(--bg-page, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
      }}
    >
      {/*
       * Mobile: MainHeader(70) + mobile search row (h-11 + pb-3 ≈ 56) ≈ 126px, plus 8px gap,
       * plus safe-area for notched devices (Navbar is fixed to top-0).
       * md+: UtilityBar(36) + MainHeader(70) + CategoryNav(44) = 150px + gap + safe-area.
       * pb clears MobileBottomNav on small screens.
       */}
      <div
        className="pt-[calc(134px+env(safe-area-inset-top,0px))] md:pt-[calc(158px+env(safe-area-inset-top,0px))] pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0"
        style={{ color: 'var(--text-primary, #0f172a)' }}
      >
        {children}
      </div>
      <Footer />
    </div>
  );
}
