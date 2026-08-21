import { useEffect, useState } from "react";

/**
 * Persists one piece of a grid page's state (sort, column filters, search text, the
 * customer/run-number pickers above the grid — whatever the page decides to pass in) to
 * `sessionStorage`, keyed per page and per piece of state.
 *
 * Drop-in replacement for `useState` for that purpose: same tuple return, same lazy-initial-
 * value convention, but the value survives clicking through to a detail screen and back.
 * Without this, following a row link to `/orders/123` and hitting Back remounts the list
 * page from scratch and every sort/filter reverts to its default — the same "where did my
 * filters go" problem `orderListContext` solves for Previous/Next, just for the grid state
 * itself rather than the row sequence it produced.
 *
 * Deliberately `sessionStorage`, not a query param or a context: it needs to survive a full
 * component remount (a browser Back navigation reloads the list route from scratch) without
 * cluttering the URL, and there's no shared layout between a list page and its detail page
 * to hold context state across the navigation. Each caller picks its own storage key, so
 * unrelated grids never collide and each can be cleared independently in devtools if needed.
 *
 * Usage:
 *   const [sort, setSort] = useGridState<Sort | null>("orders:sort", null);
 *   const [filterSelected, setFilterSelected] = useGridState("invoices:filters", {});
 */
export function useGridState<T>(storageKey: string, initial: T) {
  const [state, setState] = useState<T>(() => readGridState(storageKey) ?? initial);

  useEffect(() => {
    writeGridState(storageKey, state);
  }, [storageKey, state]);

  return [state, setState] as const;
}

function readGridState<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Storage can be unavailable (private browsing, quota exceeded) or hold something that
    // no longer parses (an older shape from a previous deploy) — either way, fall back to
    // the caller's initial value rather than breaking the page.
    return null;
  }
}

function writeGridState<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the page still works, the state just won't survive navigation.
  }
}
