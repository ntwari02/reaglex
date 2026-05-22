import Footer from '../Footer';
import PremiumMobileFooter from '../footer/PremiumMobileFooter';

/*
 * Navbar renders from App.tsx (<GlobalNavbar />) outside the cart-push wrapper so
 * position:fixed stays viewport-relative.
 *
 * Mobile header: compact row (48px) + search row (48px) ≈ 96px + safe-area.
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
        className="pt-[var(--mob-header-total,calc(108px+env(safe-area-inset-top,0px)))] md:pt-[calc(158px+env(safe-area-inset-top,0px))] pb-[var(--mob-dock-bottom,calc(76px+env(safe-area-inset-bottom,0px)))] md:pb-0"
        style={{ color: 'var(--text-primary, #0f172a)' }}
      >
        {children}
      </div>
      <div className="md:hidden">
        <PremiumMobileFooter />
      </div>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
