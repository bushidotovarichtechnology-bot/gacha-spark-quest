/**
 * Lazy-load Midtrans Snap.js only when needed (checkout flows).
 * Supports both sandbox and production modes — the script URL differs
 * between environments and MUST match the server-side mode, otherwise
 * `window.snap.pay(token)` will fail with an opaque error.
 */
const SNAP_SRC_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";
const SNAP_SRC_PRODUCTION = "https://app.midtrans.com/snap/snap.js";

export type MidtransMode = "sandbox" | "production";

let loadPromise: Promise<void> | null = null;
let loadedMode: MidtransMode | null = null;
let loadedClientKey: string | null = null;

function srcForMode(mode: MidtransMode) {
  return mode === "production" ? SNAP_SRC_PRODUCTION : SNAP_SRC_SANDBOX;
}

function removeExistingSnap() {
  document
    .querySelectorAll<HTMLScriptElement>('script[src*="midtrans.com/snap/snap.js"]')
    .forEach((s) => s.remove());
  try {
    delete (window as any).snap;
  } catch {
    (window as any).snap = undefined;
  }
}

export function loadMidtransSnap(
  mode: MidtransMode = "sandbox",
  clientKey?: string,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const needsReload =
    loadedMode !== null &&
    (loadedMode !== mode || (clientKey && loadedClientKey !== clientKey));

  if (needsReload) {
    removeExistingSnap();
    loadPromise = null;
    loadedMode = null;
    loadedClientKey = null;
  }

  if ((window as any).snap && loadedMode === mode) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const SNAP_SRC = srcForMode(mode);

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SNAP_SRC}"]`,
    );
    if (existing) {
      if ((window as any).snap) {
        loadedMode = mode;
        loadedClientKey = clientKey ?? loadedClientKey;
        resolve();
        return;
      }
      existing.addEventListener("load", () => {
        loadedMode = mode;
        loadedClientKey = clientKey ?? loadedClientKey;
        resolve();
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Midtrans Snap")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = SNAP_SRC;
    s.async = true;
    if (clientKey) s.setAttribute("data-client-key", clientKey);
    s.onload = () => {
      loadedMode = mode;
      loadedClientKey = clientKey ?? null;
      resolve();
    };
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Midtrans Snap"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}
