import OsNotificationCard from '../notifications/OsNotificationCard';
import { formatSellerNotificationTime } from '@/lib/sellerNotificationPresentation';

type SellerNotificationCardProps = {
  notification: {
    id: string;
    title: string;
    message: string;
    createdAt?: string;
    unread?: boolean;
    priority?: string;
    actionLink?: string;
    actionLabel?: string;
    osVariant?: string;
    osGlow?: string;
    meta?: {
      Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
      label?: string;
      accent?: string;
      surface?: string;
    };
    thumbnails?: string[];
    showProductPreview?: boolean;
  };
  onOpen?: (id: string) => void;
  compact?: boolean;
  index?: number;
};

export default function SellerNotificationCard({
  notification: n,
  onOpen,
  compact = false,
  index = 0,
}: SellerNotificationCardProps) {
  const Icon = n.meta?.Icon;

  return (
    <OsNotificationCard
      variant={n.osVariant || 'stack'}
      unread={n.unread}
      accent={n.meta?.accent || 'var(--brand-primary)'}
      surface={n.meta?.surface || 'var(--brand-tint)'}
      glow={n.osGlow}
      Icon={Icon}
      kicker={n.meta?.label}
      title={n.title}
      message={n.message}
      time={formatSellerNotificationTime(n.createdAt)}
      actionLabel={n.actionLink ? n.actionLabel || 'Open' : undefined}
      thumbnails={n.thumbnails}
      showThumbs={n.showProductPreview}
      compact={compact}
      index={index}
      onClick={() => onOpen?.(n.id)}
    />
  );
}
