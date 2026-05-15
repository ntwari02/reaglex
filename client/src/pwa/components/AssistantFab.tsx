import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Command as CmdIcon } from 'lucide-react';
import { haptic } from '../haptics';
import { openCommandPalette } from './CommandPalette';

const STORAGE_KEY = 'reaglex-fab-coachmark-dismissed';

/**
 * Compact floating action that gives users one-tap access to the global
 * command palette + AI assistant from anywhere in the app, mimicking the
 * native experience of apps like Linear or Raycast.
 */
export default function AssistantFab() {
  const [expanded, setExpanded] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShowHint(true), 4000);
    const hide = setTimeout(() => {
      setShowHint(false);
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    }, 11000);
    return () => {
      clearTimeout(t);
      clearTimeout(hide);
    };
  }, []);

  return (
    <div
      className="fixed z-[55] right-3 sm:right-5"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <AnimatePresence>
        {showHint && !expanded && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-[58px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{
              background: 'rgba(15,23,42,0.96)',
              color: 'white',
              border: '1px solid rgba(148,163,184,0.22)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
            }}
          >
            Press <kbd className="px-1 py-0.5 rounded border border-white/20 mx-1">Ctrl</kbd>
            <kbd className="px-1 py-0.5 rounded border border-white/20">K</kbd> for AI search
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Open AI assistant and command palette"
        onClick={() => {
          haptic('selection');
          openCommandPalette();
        }}
        whileTap={{ scale: 0.92 }}
        animate={{
          width: expanded ? 168 : 52,
          transition: { type: 'spring', stiffness: 360, damping: 28 },
        }}
        className="overflow-hidden flex items-center gap-2 h-[52px] pl-[14px] pr-[14px] rounded-full text-white"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          boxShadow: '0 18px 40px rgba(6,182,212,0.45)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
      >
        <Sparkles className="h-5 w-5 flex-shrink-0" />
        <AnimatePresence>
          {expanded && (
            <motion.span
              key="label"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="whitespace-nowrap text-sm font-semibold"
            >
              Ask AI
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {expanded && (
            <motion.span
              key="kbd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="ml-auto flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider"
            >
              <CmdIcon className="h-3 w-3" />K
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
