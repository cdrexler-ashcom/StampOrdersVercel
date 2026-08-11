/**
 * Remembers the sequence of order IDs shown by the last Orders list view (in whatever
 * filter/sort state it was in), so the order detail page can offer Previous/Next
 * navigation through that same sequence.
 *
 * This replaces Form2's F5 (Previous) / F6 (Next), which cycled through whatever record
 * set Sybiz had last loaded. F5/F6 aren't viable bindings in a browser (page reload /
 * address bar focus), and a button makes the "previous/next what?" question visible
 * instead of implicit — the list page's filters and sort are what define the sequence.
 *
 * Deliberately a dumb snapshot rather than a live query: it reflects the list as it stood
 * when you left it, not a re-fetch, so Previous/Next stay stable even if someone else adds
 * or invoices orders while you're working through them.
 */

const STORAGE_KEY = "orders:list-context";

export function setOrderListContext(orderIds: number[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(orderIds));
  } catch {
    // Storage can be unavailable (private browsing, quota exceeded) — navigation still
    // works, Previous/Next just won't have anything to offer.
  }
}

export function getOrderListContext(): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "number")
      ? parsed
      : null;
  } catch {
    return null;
  }
}
