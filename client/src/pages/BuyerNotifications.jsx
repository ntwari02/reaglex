import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useNotificationFeed } from '../components/notifications/useNotificationFeed';
import NotificationList from '../components/notifications/NotificationList';
import '../styles/notifications-os.css';

export default function BuyerNotifications() {
  const navigate = useNavigate();
  const feed = useNotificationFeed({ enabled: true, limit: 100 });

  const handleItemPress = (n) => {
    feed.markAsRead(n.id, n);
    if (n.type === 'order' && n.orderId) navigate(`/track/${n.orderId}`);
    else if (n.type === 'message') navigate('/account?tab=messages');
    else if (n.type === 'deal') navigate('/search?sort=discount');
  };

  return (
    <BuyerLayout>
      <div className="rxn-page md:max-w-2xl md:mx-auto">
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
              <h1>Notifications</h1>
              <p>
                {feed.unreadCount > 0
                  ? `${feed.unreadCount} unread · orders, messages & updates`
                  : 'All caught up'}
              </p>
            </div>
            <span className="rxn-sheet-icon" style={{ marginLeft: 'auto' }}>
              <Bell size={20} strokeWidth={1.75} />
            </span>
          </div>
        </header>

        <div className="rxn-page-body">
          <NotificationList
            {...feed}
            enableSwipe
            showFooter={false}
            onItemPress={handleItemPress}
            onMarkRead={feed.markAsRead}
            onDelete={feed.removeNotification}
          />
          <div className="px-3 pb-8 pt-2">
            <Link to="/account?tab=settings&section=notifications" className="rxn-footer-link">
              Notification settings →
            </Link>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
