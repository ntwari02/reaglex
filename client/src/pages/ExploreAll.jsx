import { PageSeo } from '../components/seo/PageSeo';
import ExploreAllMobile from '../components/explore/ExploreAllMobile';

/** Premium discovery hub — mobile + desktop; opens from homepage “View All”. */
export default function ExploreAll() {
  return (
    <>
      <PageSeo
        title="Explore All — Reaglex"
        description="Discover trending picks, best sellers, AI recommendations, new arrivals, and more in one premium feed."
      />
      <ExploreAllMobile />
    </>
  );
}
