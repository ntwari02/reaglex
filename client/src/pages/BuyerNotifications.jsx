import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useNotificationFeed } from '../components/notifications/useNotificationFeed';
import NotificationList from '../components/notifications/NotificationList';
import { getNotificationHref } from '../lib/notificationPresentation';
import '../styles/notifications-os.css';

export default function BuyerNotifications() {
  const navigate = useNavigate();
  const [limit, setLimit] = useState(50);
  const feed = useNotificationFeed({ enabled: true, limit });

  const handleItemPress = (n) => {
    feed.markAsRead(n.id, n);
    const href = getNotificationHref(n);
    if (href) navigate(href);
  };

  return (
    <BuyerLayout>
      <div className="rxn-page rxn-page--premium md:max-w-2xl md:mx-auto">
        <header className="rxn-page-header">
          <div className="rxn-page-header-row">
            <button
              type="button"
              className="rxn-page-back"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ArrowLeft size={20} strokeWidth={1.85} />
            </button>
            <div className="rxn-page-heading">
              <h1>All Notifications</h1>
              <p>Stay updated with everything</p>
            </div>
            <span className="rxn-page-header-bell" aria-hidden>
              <Bell size={20} strokeWidth={1.75} />
            </span>
          </div>
        </header>

        <div className="rxn-page-body">
          <NotificationList
            {...feed}
            enableSwipe
            showFooter
            showPushBanner
            onItemPress={handleItemPress}
            onMarkRead={feed.markAsRead}
            onDelete={feed.removeNotification}
            onLoadOlder={() => setLimit((l) => l + 40)}
          />
        </div>
      </div>
    </BuyerLayout>
  );
}
