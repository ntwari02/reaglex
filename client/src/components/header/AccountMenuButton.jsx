import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleUser, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../i18n/useTranslation';
import { SERVER_URL } from '../../lib/config';
import '../../styles/account-menu.css';

function resolveAvatar(src) {
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return `${SERVER_URL}${src}`;
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export default function AccountMenuButton({ onLogoutClick, openAuth, variant = 'mobile' }) {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useClickOutside(rootRef, () => setOpen(false));

  const isMobile = variant === 'mobile';
  const displayName = user?.full_name || user?.name || t('nav.profile');
  const email = user?.email || '';
  const initial = (displayName || email || 'U').charAt(0).toUpperCase();
  const avatarUrl = resolveAvatar(user?.avatar_url);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuth?.('login')}
        className={`account-menu-trigger account-menu-trigger--${variant}${isMobile ? ' mob-header-icon-btn' : ''}`}
        aria-label={t('header.loginRegister')}
      >
        <CircleUser size={22} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div className="account-menu-root" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`account-menu-trigger account-menu-trigger--${variant}${isMobile ? ' mob-header-icon-btn' : ''}${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('nav.profile')}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="account-menu-avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <span className="account-menu-initial" aria-hidden>{initial}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="account-menu-panel"
          >
            <div className="account-menu-user">
              <div className="account-menu-user-avatar" aria-hidden>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="account-menu-user-text">
                <p className="account-menu-user-name">{displayName}</p>
                {email ? <p className="account-menu-user-email">{email}</p> : null}
              </div>
            </div>

            <div className="account-menu-divider" />

            <Link
              to="/account?tab=settings"
              role="menuitem"
              className="account-menu-item"
              onClick={() => setOpen(false)}
            >
              <Settings size={16} strokeWidth={1.85} />
              {t('account.profileSettings')}
            </Link>

            <button
              type="button"
              role="menuitem"
              className="account-menu-item account-menu-item--theme"
              onClick={() => toggleTheme()}
            >
              <span className="account-menu-item-icon" aria-hidden>
                {theme === 'dark' ? <Sun size={16} strokeWidth={1.85} /> : <Moon size={16} strokeWidth={1.85} />}
              </span>
              <span className="account-menu-item-label">
                {theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
              </span>
              <span className="account-menu-theme-pill" aria-hidden>
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>

            <div className="account-menu-divider" />

            <button
              type="button"
              role="menuitem"
              className="account-menu-item account-menu-item--danger"
              onClick={() => {
                setOpen(false);
                onLogoutClick?.();
              }}
            >
              <LogOut size={16} strokeWidth={1.85} />
              {t('buttons.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
