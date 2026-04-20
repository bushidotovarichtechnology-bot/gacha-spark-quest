/**
 * Lazy-load Midtrans Snap.js only when needed (checkout flows).
 * Avoids render-blocking ~700KB script on initial page load.
 */
const SNAP_SRC = "https://app.sandbox.midtrans.com/snap/snap.js";

let loadPromise: Promise<void> | null = null;

export function loadMidtransSnap(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).snap) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SNAP_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Midtrans Snap")));
      return;
    }
    const s = document.createElement("script");
    s.src = SNAP_SRC;
    s.async = true;
    s.setAttribute("data-client-key", "");
    s.onload = () => resolve();
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Midtrans Snap"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}
