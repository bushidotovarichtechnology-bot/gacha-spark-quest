/**
 * Realtime events (trade accepted/rejected/incoming/claimed) can fire before
 * `<BrowserRouter>` has mounted its `useNavigate` hook — e.g. when a notification
 * arrives during the first paint or while React is still hydrating routes.
 *
 * Strategy:
 *  - The app registers a `navigate` function once `<BrowserRouter>` is ready
 *    (see `RouterReadyBridge` in App.tsx).
 *  - Toast actions / notification clicks call `safeNavigate(href)`. If the
 *    navigate fn is registered we use SPA navigation; otherwise we queue the
 *    href and flush it as soon as the bridge registers, falling back to a
 *    `window.location.assign` after a short timeout if the bridge never wakes
 *    up (defensive — should not happen in practice).
 */

type NavigateFn = (to: string) => void;

let navigateFn: NavigateFn | null = null;
const queue: string[] = [];
const FALLBACK_MS = 1500;

export const registerNavigator = (fn: NavigateFn) => {
  navigateFn = fn;
  // Flush any deep links queued before the router was ready.
  while (queue.length) {
    const href = queue.shift();
    if (href) fn(href);
  }
};

export const unregisterNavigator = () => {
  navigateFn = null;
};

export const safeNavigate = (href: string) => {
  if (!href) return;
  if (navigateFn) {
    navigateFn(href);
    return;
  }
  queue.push(href);
  // Fallback: if the router never registers (e.g. hard bug), force a full
  // navigation so the user is never stranded on a stale page.
  window.setTimeout(() => {
    const idx = queue.indexOf(href);
    if (idx === -1) return; // already flushed by registerNavigator
    queue.splice(idx, 1);
    window.location.assign(href);
  }, FALLBACK_MS);
};
