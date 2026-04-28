import Footer from '../Footer';

/*
 * Navbar is intentionally NOT rendered here.
 * It is rendered in App.tsx via <GlobalNavbar /> which lives OUTSIDE the
 * cart-push motion.div.  Rendering it here (inside the transformed wrapper)
 * would make position:fixed anchor to the transformed ancestor, causing the
 * navbar to scroll away with the page and shift with the cart animation.
 * The pt-[150px] offset below still compensates for the fixed navbar height.
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
        className="pt-[150px]"
        style={{ color: 'var(--text-primary, #0f172a)' }}
      >
        {children}
      </div>
      <Footer />
    </div>
  );
}
