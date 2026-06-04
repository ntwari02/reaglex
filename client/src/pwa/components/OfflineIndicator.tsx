import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../useOnlineStatus';
import { flushQueue, subscribeQueue } from '../offlineQueue';

export default function OfflineIndicator() {
  const { online } = useOnlineStatus();
  const [queue, setQueue] = useState<{ pending: number; flushing: boolean }>({
    pending: 0,
    flushing: false,
  });
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => subscribeQueue(setQueue), []);

  useEffect(() => {
    if (online) {
      setShowBackOnline(true);
      const t = setTimeout(() => setShowBackOnline(false), 2400);
      return () => clearTimeout(t);
    } else {
      setShowBackOnline(false);
    }
    return undefined;
  }, [online]);

  useEffect(() => {
    if (online && queue.pending > 0 && !queue.flushing) {
      void flushQueue();
    }
  }, [online, queue.pending, queue.flushing]);

  const showOffline = !online;
  const showSyncing = online && queue.flushing;

  return (
    <AnimatePresence>
      {(showOffline || showSyncing || showBackOnline) && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[70] px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-xl"
          style={{
            background: showOffline
              ? 'rgba(239,68,68,0.95)'
              : showBackOnline
              ? 'rgba(16,185,129,0.95)'
              : 'rgba(15,23,42,0.92)',
            color: 'white',
            boxShadow: '0 10px 28px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {showOffline && (
            <>
              <CloudOff className="h-3.5 w-3.5" />
              <span>You’re offline — changes will sync later</span>
            </>
          )}
          {showSyncing && (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Syncing {queue.pending} pending action{queue.pending > 1 ? 's' : ''}…</span>
            </>
          )}
          {showBackOnline && !showSyncing && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Back online</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
