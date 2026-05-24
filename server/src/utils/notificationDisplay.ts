import { normalizeMediaUrls } from '../email/emailUrls';

export type InAppVisualStyle = {
  showProductPreview: boolean;
  compact: boolean;
  thumbnailCount: number;
};

export function buildInAppVisualStyle(input: {
  showProductPreview?: boolean;
  thumbnails?: string[];
  compact?: boolean;
}): InAppVisualStyle {
  const thumbs = normalizeMediaUrls(input.thumbnails);
  const show = Boolean(input.showProductPreview && thumbs.length);
  return {
    showProductPreview: show,
    compact: input.compact !== false,
    thumbnailCount: show ? Math.min(3, thumbs.length) : 0,
  };
}

export function prepareInAppNotificationPayload(input: {
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  tone?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  eventKey: string;
  entityId?: string;
  productThumbnails?: string[];
  visualStyle?: InAppVisualStyle;
  visualVariant?: string;
  copySource?: string;
}) {
  const thumbnails = normalizeMediaUrls(input.productThumbnails);
  const visualStyle =
    input.visualStyle ||
    buildInAppVisualStyle({
      showProductPreview: thumbnails.length > 0,
      thumbnails,
    });

  return {
    title: String(input.title || 'Update').slice(0, 240),
    message: String(input.message || '').slice(0, 8000),
    actionUrl: String(input.actionUrl || '/').slice(0, 500),
    actionText: String(input.actionLabel || 'Open').slice(0, 80),
    priority: input.priority,
    metadata: {
      category: input.category,
      tone: input.tone || 'operational',
      eventKey: input.eventKey,
      entityId: input.entityId,
      productThumbnails: thumbnails,
      visualStyle,
      visualVariant: input.visualVariant,
      copySource: input.copySource,
    },
  };
}
