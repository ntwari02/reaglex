import Navbar from '../Navbar';
import Footer from '../Footer';

export default function BuyerLayout({ children, className = '' }) {
  return (
    <div
      className={`min-h-screen ${className}`}
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      <Navbar />
      <div
        className="pt-[150px]"
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </div>
      <Footer />
    </div>
  );
}
