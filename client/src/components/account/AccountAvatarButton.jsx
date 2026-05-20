import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useAccountAvatarGestures } from '../../hooks/useAccountAvatarGestures';
import { accountAvatarLayoutId } from '../../motion/presets';
import { SERVER_URL } from '../../lib/config';

function resolveAvatar(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return `${SERVER_URL}${src}`;
}

export default function AccountAvatarButton({ className = '', onOpen }) {
  const user = useAuthStore((s) => s.user);
  const gestures = useAccountAvatarGestures({ onSingleTap: onOpen });
  const layoutId = accountAvatarLayoutId(user);
  const avatarUrl = resolveAvatar(user?.avatar_url);
  const initial = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <motion.button
      type="button"
      className={`aco-nav-avatar-wrap md:hidden flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`.trim()}
      style={{
        width: 42,
        height: 42,
        border: '1px solid rgba(255,255,255,0.06)',
        background: avatarUrl ? 'transparent' : 'var(--brand-primary)',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label="Account"
      whileTap={{ scale: 0.94 }}
      {...gestures}
    >
      <motion.div
        layoutId={layoutId}
        layout
        className="aco-avatar aco-avatar--nav relative z-[1]"
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="block w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span>{initial}</span>
        )}
      </motion.div>
    </motion.button>
  );
}
