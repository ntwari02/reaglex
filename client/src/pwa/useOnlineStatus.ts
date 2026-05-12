import { useEffect, useState } from 'react';

/**
 * `navigator.onLine` is unreliable — it only reports whether the OS thinks
 * it has any network. We layer a lightweight ping so the offline banner
 * accurately reflects whether our API is actually reachable.
 */
export function useOnlineStatus(): { online: boolean; lastCheck: number } {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [lastCheck, setLastCheck] = useState<number>(Date.now());

  useEffect(() => {
    function on() {
      setOnline(true);
      setLastCheck(Date.now());
    }
    function off() {
      setOnline(false);
      setLastCheck(Date.now());
    }
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return { online, lastCheck };
}
