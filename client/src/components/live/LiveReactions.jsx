import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = [
  { id: 'heart', char: '❤️' },
  { id: 'fire', char: '🔥' },
  { id: 'thumbs', char: '👍' },
];

export default function LiveReactions({ reactions = [], onSend, compact = false }) {
  return (
    <div className={`live-reactions-wrap${compact ? ' live-reactions-wrap--compact' : ''}`}>
      <div className="live-reactions-float" aria-hidden>
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.span
              key={r.id}
              className="live-reaction-bubble"
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, y: -120, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {onSend && (
        <div className="live-reactions-bar">
          {EMOJIS.map((e) => (
            <button
              key={e.id}
              type="button"
              className="live-reaction-btn"
              onClick={() => onSend(e.char)}
              aria-label={`React ${e.char}`}
            >
              {e.char}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
