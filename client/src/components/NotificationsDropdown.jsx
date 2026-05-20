import NotificationDrawer from '../notifications/NotificationDrawer';

/**
 * Notification popup / drawer — futuristic Reaglex inbox (2027+).
 * @param {'drawer'|'popover'} [placement] — mobile: drawer; desktop navbar: popover
 */
export function NotificationsDropdown({ isOpen, onClose, onUnreadChange, placement = 'popover' }) {
  return (
    <NotificationDrawer
      isOpen={isOpen}
      onClose={onClose}
      onUnreadChange={onUnreadChange}
      placement={placement}
    />
  );
}

export default NotificationsDropdown;
