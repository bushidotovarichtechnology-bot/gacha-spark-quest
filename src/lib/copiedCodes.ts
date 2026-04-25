// Tracks which digital voucher codes the user has already copied.
// Persisted in localStorage so the "uncopied" indicator survives reloads.
// A custom event lets components react to changes across the tree.

const LS_KEY = "bushido:copied-codes";
const EVENT = "bushido:copied-codes-changed";

const read = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const write = (set: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
};

export const isCodeCopied = (code: string): boolean => read().has(code);

export const markCodeCopied = (code: string) => {
  const s = read();
  if (s.has(code)) return;
  s.add(code);
  write(s);
};

export const subscribeCopiedCodes = (cb: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

export const getCopiedCodes = read;
