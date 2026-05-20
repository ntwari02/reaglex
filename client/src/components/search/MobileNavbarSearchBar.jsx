import { Link } from 'react-router-dom';
import { Search, Camera, Mic, SlidersHorizontal } from 'lucide-react';
import { useImmersiveSearch } from '../../stores/immersiveSearchStore';
import { useMotionUi } from '../../stores/motionUiStore';
import { useSearchBarGestures } from '../../hooks/useSearchBarGestures';

/**
 * Premium mobile navbar search with gesture shortcuts:
 * tap → text search · double-tap → voice · long-press → camera
 */
export default function MobileNavbarSearchBar({ searchQuery, t }) {
  const openSearch = useImmersiveSearch((s) => s.openSearch);
  const openVoiceSearch = useImmersiveSearch((s) => s.openVoiceSearch);
  const openVisualSearch = useMotionUi((s) => s.openVisualSearch);

  const gestures = useSearchBarGestures({
    onOpenSearch: () => openSearch(searchQuery),
    onVoiceSearch: () => openVoiceSearch(searchQuery),
    onCameraSearch: () => openVisualSearch(),
  });

  return (
    <div className="md:hidden px-4 pb-3">
      <div className="mob-search-wrap">
        <div
          role="search"
          className="mob-search-bar"
          onPointerDown={gestures.onPointerDown}
          onPointerUp={gestures.onPointerUp}
          onPointerCancel={gestures.onPointerCancel}
          onClick={gestures.onClick}
        >
          <Search className="mob-search-icon" strokeWidth={2} aria-hidden />
          <span className="mob-search-placeholder">
            {searchQuery || 'Search products, brands, stores…'}
          </span>
        </div>

        <button
          type="button"
          className="mob-search-mic"
          onClick={(e) => {
            e.stopPropagation();
            openVoiceSearch(searchQuery);
          }}
          aria-label="Voice search"
        >
          <Mic size={20} strokeWidth={2} />
        </button>

        <button
          type="button"
          className="mob-search-cam"
          onClick={(e) => {
            e.stopPropagation();
            openVisualSearch();
          }}
          aria-label="Camera search"
        >
          <Camera size={18} strokeWidth={2} />
        </button>

        <Link
          to="/products"
          className="mob-search-filter"
          aria-label={t('footer.links.shop.allProducts')}
          onClick={(e) => e.stopPropagation()}
        >
          <SlidersHorizontal size={18} strokeWidth={1.85} />
        </Link>
      </div>
    </div>
  );
}
