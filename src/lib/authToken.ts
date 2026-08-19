/**
 * The bearer token store (H2).
 *
 * A tiny framework-free module so both the fetch layer (lib/api.ts, no React) and the React auth
 * context can share one source of truth. The token is persisted to localStorage so a full page
 * reload keeps the session, and mirrored in memory for synchronous reads on every request.
 *
 * Storing the token in localStorage is the simple choice and is exposed to XSS; for this internal
 * app behind the Vercel proxy that trade-off is acceptable. If stronger isolation is wanted later,
 * move the token to an httpOnly cookie set by a Next.js route handler — only this module and the
 * request header in api.ts would change.
 */

const STORAGE_KEY = "stamporders.token";

let current: string | null = null;
let hydrated = false;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Reads the persisted token once, lazily (guards against SSR where localStorage is absent). */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    current = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    current = null;
  }
}

/** The current bearer token, or null when signed out. */
export function getToken(): string | null {
  hydrate();
  return current;
}

/** Sets (or, with null, clears) the token, persists it, and notifies subscribers. */
export function setToken(token: string | null): void {
  hydrate();
  current = token;

  if (typeof window !== "undefined") {
    try {
      if (token) window.localStorage.setItem(STORAGE_KEY, token);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private-mode / storage-disabled: fall back to the in-memory value for this session.
    }
  }

  for (const listener of listeners) listener();
}

export function clearToken(): void {
  setToken(null);
}

/** Subscribes to token changes (e.g. a 401 clearing it in another tab flow). Returns an unsubscribe. */
export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
