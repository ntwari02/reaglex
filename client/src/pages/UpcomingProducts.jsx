import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useHomeFeedSection } from '../hooks/useHomeFeedSections';
import { mergeUpcomingList, UPCOMING_DROPS } from '../components/home/mobile/upcomingProductsData';
import UpcomingProductCard from '../components/home/mobile/UpcomingProductCard';
import { useToastStore } from '../stores/toastStore';

function useLaunchLabel(launchAt) {
  const d = new Date(launchAt);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function UpcomingPageCard({ drop, tall }) {
  const showToast = useToastStore((s) => s.showToast);
  const release = useLaunchLabel(drop.launchAt);

  return (
    <article className={`up-page-card${tall ? ' up-page-card--tall' : ''}`}>
      <div className="up-card-inner" style={{ minHeight: tall ? 188 : 160 }}>
        <div className="up-card-left" style={{ width: '56%' }}>
          <span className="up-badge">COMING SOON</span>
          <h3 className="up-card-name">{drop.name}</h3>
          <p className="up-card-desc">{drop.description}</p>
          <div className="up-page-tags">
            {drop.label && <span className="up-tag up-tag--limited">{drop.label}</span>}
            {drop.edition && <span className="up-tag up-tag--preorder">{drop.edition}</span>}
            <span className="up-tag up-tag--ai">
              <Sparkles size={10} style={{ marginRight: 4 }} />
              AI recommended
            </span>
          </div>
          <span className="up-countdown">{release}</span>
          <button
            type="button"
            className="up-notify-btn"
            onClick={() => showToast(`Early access reserved for ${drop.name}`, 'success')}
          >
            Notify Me
          </button>
        </div>
        <div className="up-card-right">
          <div className="up-img-glow" aria-hidden />
          <img src={drop.image} alt="" className="up-product-img" style={{ height: tall ? 150 : 130 }} loading="lazy" />
        </div>
      </div>
    </article>
  );
}

export default function UpcomingProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: fresh } = useHomeFeedSection('fresh', 6);
  const drops = useMemo(
    () => mergeUpcomingList(Array.isArray(fresh) ? fresh : []),
    [fresh],
  );

  const focusId = location.state?.focusId;

  return (
    <BuyerLayout className="up-page-shell">
      <div className="up-page">
        <header className="up-page-head">
          <button type="button" className="up-page-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="up-header-left">
            <h1 className="up-title">Upcoming Drops</h1>
            <p className="up-subtitle">AI-curated launch feed</p>
          </div>
        </header>

        <div className="up-page-list">
          {drops.map((drop, i) => (
            <div
              key={drop.id}
              id={drop.id}
              style={
                focusId === drop.id
                  ? { outline: '2px solid var(--brand-primary)', borderRadius: 22 }
                  : undefined
              }
            >
              {i % 3 === 0 ? (
                <UpcomingPageCard drop={drop} tall />
              ) : (
                <UpcomingProductCard drop={drop} />
              )}
            </div>
          ))}
          {drops.length === 0 &&
            UPCOMING_DROPS.map((drop) => <UpcomingProductCard key={drop.id} drop={drop} />)}
        </div>

        <p style={{ textAlign: 'center', padding: '12px 16px 20px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          <Link to="/" className="up-view-all">
            Back to home
          </Link>
        </p>
      </div>
    </BuyerLayout>
  );
}
