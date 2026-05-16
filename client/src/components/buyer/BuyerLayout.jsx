import Footer from '../Footer';

/*
 * Navbar renders from App.tsx (<GlobalNavbar />) outside the cart-push wrapper so
 * position:fixed stays viewport-relative.
 *
 * Mobile header: compact row (~68px with padding) + search row (~68px) ≈ 136px + safe-area.
 * Desktop: UtilityBar + MainHeader + CategoryNav.
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
      <div
        className="pt-[calc(136px+env(safe-area-inset-top,0px))] md:pt-[calc(158px+env(safe-area-inset-top,0px))] pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-0"
        style={{ color: 'var(--text-primary, #0f172a)' }}
      >
        {children}
      </div>
      <Footer />
    </div>
  );
}
