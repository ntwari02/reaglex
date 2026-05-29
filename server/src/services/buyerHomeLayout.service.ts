import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_MODE_LABELS,
  HOME_LAYOUT_SECTION_META,
  HOME_CARD_DENSITY_LABELS,
  mergeLayoutOverrides,
  resolveHomeSectionLayout,
  type HomeLayoutSectionId,
  type HomeSectionLayoutEntry,
} from '../constants/buyerHomeLayoutDefaults';
import { BuyerHomeLayoutConfig } from '../models/BuyerHomeLayoutConfig';

type Overrides = Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>>;

async function readLayoutDoc() {
  const doc = await BuyerHomeLayoutConfig.findById('default').lean();
  if (!doc) {
    return { published: {} as Overrides, draft: {} as Overrides, publishedAt: null as Date | null };
  }
  const legacy = (doc as { sections?: Overrides }).sections;
  const published =
    ((doc as { publishedSections?: Overrides }).publishedSections ?? legacy ?? {}) as Overrides;
  const draft = ((doc as { draftSections?: Overrides }).draftSections ?? published ?? {}) as Overrides;
  const publishedAt = (doc as { publishedAt?: Date }).publishedAt || null;
  return { published, draft, publishedAt };
}

export async function getPublishedLayoutOverrides(): Promise<Overrides> {
  const { published } = await readLayoutDoc();
  return published;
}

export async function getDraftLayoutOverrides(): Promise<Overrides> {
  const { draft } = await readLayoutDoc();
  return draft;
}

export function buildResolvedHomeLayout(overrides: Overrides) {
  const sections = {} as Record<
    HomeLayoutSectionId,
    { mobile: ReturnType<typeof resolveHomeSectionLayout>; desktop: ReturnType<typeof resolveHomeSectionLayout> }
  >;
  const ids = Object.keys(DEFAULT_HOME_LAYOUT) as HomeLayoutSectionId[];
  for (const id of ids) {
    sections[id] = {
      mobile: resolveHomeSectionLayout(id, 'mobile', overrides),
      desktop: resolveHomeSectionLayout(id, 'desktop', overrides),
    };
  }
  return sections;
}

export async function getPublicHomeLayoutPayload() {
  const { published, publishedAt } = await readLayoutDoc();
  return {
    sections: buildResolvedHomeLayout(published),
    defaults: DEFAULT_HOME_LAYOUT,
    publishedAt: publishedAt?.toISOString() || null,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminHomeLayoutPayload() {
  const { published, draft, publishedAt } = await readLayoutDoc();
  const resolvedPublished = buildResolvedHomeLayout(published);
  const resolvedDraft = buildResolvedHomeLayout(draft);
  const hasUnpublishedChanges = JSON.stringify(published) !== JSON.stringify(draft);

  return {
    publishedOverrides: published,
    draftOverrides: draft,
    resolvedPublished,
    resolvedDraft,
    hasUnpublishedChanges,
    publishedAt: publishedAt?.toISOString() || null,
    defaults: DEFAULT_HOME_LAYOUT,
    meta: HOME_LAYOUT_SECTION_META,
    modeLabels: HOME_LAYOUT_MODE_LABELS,
    cardDensityLabels: HOME_CARD_DENSITY_LABELS,
  };
}

/** Save draft only — does not affect live site */
export async function saveHomeLayoutDraft(
  patch: Overrides,
): Promise<Awaited<ReturnType<typeof getAdminHomeLayoutPayload>>> {
  const { draft } = await readLayoutDoc();
  const merged = mergeLayoutOverrides(draft, patch);
  await BuyerHomeLayoutConfig.findByIdAndUpdate(
    'default',
    { $set: { draftSections: merged } },
    { upsert: true, new: true },
  );
  return getAdminHomeLayoutPayload();
}

/** Copy draft → published (live storefront) */
export async function publishHomeLayoutDraft(): Promise<Awaited<ReturnType<typeof getAdminHomeLayoutPayload>>> {
  const { draft } = await readLayoutDoc();
  await BuyerHomeLayoutConfig.findByIdAndUpdate(
    'default',
    {
      $set: {
        publishedSections: draft,
        publishedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
  return getAdminHomeLayoutPayload();
}

/** @deprecated — use saveHomeLayoutDraft */
export async function updateHomeLayoutOverrides(patch: Overrides) {
  return saveHomeLayoutDraft(patch);
}

export async function resetHomeLayoutToDefaults() {
  await BuyerHomeLayoutConfig.findByIdAndUpdate(
    'default',
    {
      $set: {
        publishedSections: {},
        draftSections: {},
        publishedAt: new Date(),
      },
      $unset: { sections: '' },
    },
    { upsert: true, new: true },
  );
  return getAdminHomeLayoutPayload();
}
