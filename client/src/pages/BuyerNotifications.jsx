import BuyerLayout from '../components/buyer/BuyerLayout';
import NotificationCenter from '../notifications/NotificationCenter';

/** Full notification center — mobile commerce activity feed (notification-only redesign). */
export default function BuyerNotifications() {
  return (
    <BuyerLayout className="rnx-page-shell">
      <NotificationCenter />
    </BuyerLayout>
  );
}
