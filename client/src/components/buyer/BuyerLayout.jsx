import Footer from '../Footer';
import PremiumMobileFooter from '../footer/PremiumMobileFooter';

/*
 * Navbar renders from App.tsx (<GlobalNavbar />) outside the cart-push wrapper so
 * position:fixed stays viewport-relative.
 *
 * Mobile header: compact row (48px) + search row (48px) ≈ 96px + safe-area.
 * Desktop: UtilityBar + MainHeader + CategoryNav.
 */
export default function BuyerLayout({ children, className = '', focused = false, noHeaderPad = false }) {
  const skipHeaderPad = focused || noHeaderPad;
  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        background: 'var(--bg-page, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
      }}
    >
      <div
        className={
          skipHeaderPad
            ? 'pb-[env(safe-area-inset-bottom,0px)]'
            : 'pt-[var(--mob-header-total,calc(108px+env(safe-area-inset-top,0px)))] md:pt-[calc(158px+env(safe-area-inset-top,0px))] pb-0 md:pb-0'
        }
        style={{ color: 'var(--text-primary, #0f172a)' }}
      >
        {children}
      </div>
      {!focused && (
        <>
          <div className="md:hidden">
            <PremiumMobileFooter />
          </div>
          <div className="hidden md:block">
            <Footer />
          </div>
        </>
      )}
    </div>
  );
}
