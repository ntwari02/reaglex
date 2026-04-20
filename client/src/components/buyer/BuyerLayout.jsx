import Navbar from '../Navbar';
import Footer from '../Footer';

export default function BuyerLayout({ children, className = '' }) {
  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        background: 'var(--bg-page, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
      }}
    >
      <Navbar />
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
