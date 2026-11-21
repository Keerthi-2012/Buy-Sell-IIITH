import { useEffect } from 'react';
import { useStore } from 'react-redux';

// Cookies and localStorage are shared by every tab, so logging in or out in one tab changes the
// session for all of them. When another tab changes who is logged in, reload this one so it
// never shows a stale user while its requests quietly go out as someone else.
export const useTabSync = (reload = () => window.location.reload()) => {
  const store = useStore();

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'user') return;

      let next = null; // null = logged out (or an unreadable value)
      try {
        next = JSON.parse(event.newValue)?._id ?? null;
      } catch {
        /* treat a corrupted value like a logout */
      }

      const current = store.getState().auth.user?._id ?? null;
      if (next !== current) reload();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store, reload]);
};
