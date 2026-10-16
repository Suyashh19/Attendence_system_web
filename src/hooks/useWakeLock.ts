import { useEffect } from 'react';

/** Keeps the screen on while `active`, so the code stays visible to the class. iOS 16.4+. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (released) lock.release().catch(() => null);
      } catch {
        // Not allowed right now (low power mode, hidden page); the session still works
      }
    };

    // The lock is dropped whenever the page is hidden, so take it again on return
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => null);
    };
  }, [active]);
}
