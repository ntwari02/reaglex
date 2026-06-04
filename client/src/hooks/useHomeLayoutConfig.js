import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { publicSiteContentAPI } from '../lib/api';
import { resolveHomeSectionLayout } from '../constants/buyerHomeLayoutDefaults';

export function useHomeLayoutConfig() {
  const { data, isLoading, isPending } = useQuery({
    queryKey: ['site', 'home-product-layout'],
    queryFn: () => publicSiteContentAPI.getHomeProductLayout(),
    staleTime: 5 * 60 * 1000,
  });

  const resolvedSections = data?.sections;

  const getLayout = useCallback(
    (sectionId, viewport) => resolveHomeSectionLayout(sectionId, viewport, resolvedSections),
    [resolvedSections],
  );

  return {
    loading: isLoading || isPending,
    sections: resolvedSections,
    defaults: data?.defaults,
    getLayout,
  };
}

export function useInvalidateHomeLayout() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['site', 'home-product-layout'] });
}

export function useHomeLayoutForSection(sectionId, viewport) {
  const { getLayout, loading } = useHomeLayoutConfig();
  const layout = useMemo(
    () => getLayout(sectionId, viewport),
    [getLayout, sectionId, viewport],
  );
  return { layout, loading };
}
