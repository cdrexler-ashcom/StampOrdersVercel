import { useMemo, useState } from "react";

/** Maps each filterable column's key to a function that pulls a display string off a row. */
export type FilterAccessors<T> = Record<string, (row: T) => string>;

/**
 * Generic click-to-filter behaviour for grid column headers (the "funnel" filter used by
 * `Th`'s `filter` prop / `ColumnFilterMenu`).
 *
 * Each filterable column supplies an accessor that pulls the display string off a row —
 * the same string that's rendered in the cell, so the values in the filter popup match
 * what the person sees in the grid. Return `""` for empty/missing values; empty strings
 * are excluded from the option list.
 *
 * Selections within one column are OR'd together (checking "Brisbane" and "Sydney" shows
 * rows in either suburb); selections across different columns are AND'd (also checking a
 * price code narrows further within that suburb match).
 *
 * Distinct values are computed from the incoming `data` as given — not re-filtered by this
 * hook's own `selected` state — so unchecking a filter on one column doesn't shrink that
 * column's own option list. Whether *other* columns' options narrow as filters are applied
 * depends on what's passed as `data`: for client-side-only grids that's the full unfiltered
 * set, so every column's options stay independent of every other column's selection: for
 * grids where filtering has moved server-side (see the `controlled` param below), `data` is
 * already the server-filtered page, so other columns' options narrow the same way a normal
 * spreadsheet AutoFilter's would — a deliberate trade-off documented where each page uses it.
 *
 * By default this hook owns its own `selected` state. Pass `controlled` when something
 * outside the hook — typically a `useQuery` call that needs the selection to build its
 * request — needs to read or drive that same state; the hook then defers to it instead of
 * keeping an internal copy.
 *
 * Like `useSortableTable`, this re-derives options and the (client-side) filtered set on
 * every render rather than memoizing against a stable accessors reference. Every grid in
 * this app caps results at 100–200 rows, so this is cheap; memoizing would need the
 * accessors object to be stable across renders, which isn't guaranteed when it's declared
 * inline in the component body.
 *
 * Usage:
 *   const { filtered, colFilter, isFiltered, clearAll } = useFilterableTable(data, {
 *     title: (c) => c.title?.trim() ?? "",
 *     address3: (c) => c.address3?.trim() ?? "",
 *   });
 *
 *   <Th filter={colFilter("title")}>Name</Th>
 *   ...
 *   {filtered?.map((customer) => ...)}
 */
export function useFilterableTable<T, A extends FilterAccessors<T>>(
  data: T[] | undefined,
  accessors: A,
  controlled?: {
    selected: Partial<Record<keyof A & string, string[]>>;
    onChange: (selected: Partial<Record<keyof A & string, string[]>>) => void;
  },
) {
  type K = keyof A & string;
  type Selected = Partial<Record<K, string[]>>;

  const [internalSelected, setInternalSelected] = useState<Selected>({});
  const selected = controlled ? (controlled.selected as Selected) : internalSelected;

  const options = useMemo(() => {
    const result = {} as Record<K, string[]>;
    for (const key of Object.keys(accessors) as K[]) {
      const accessor = accessors[key];
      const values = new Set<string>();
      (data ?? []).forEach((row) => {
        const value = accessor(row);
        if (value) values.add(value);
      });
      result[key] = [...values].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const activeKeys = (Object.keys(selected) as K[]).filter(
    (key) => (selected[key]?.length ?? 0) > 0,
  );

  // Runs even when `controlled` (and the server) is already filtering — a harmless no-op
  // in that case, since every row returned already satisfies `selected`. Kept as a single
  // code path rather than branching, so there's one behaviour to reason about either way.
  const filtered = useMemo(() => {
    if (!data || activeKeys.length === 0) return data;
    return data.filter((row) =>
      activeKeys.every((key) => selected[key]!.includes(accessors[key](row))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selected]);

  const setFilter = (key: K, values: string[]) => {
    const next: Selected = { ...selected, [key]: values };
    if (controlled) controlled.onChange(next);
    else setInternalSelected(next);
  };

  const clearAll = () => {
    if (controlled) controlled.onChange({});
    else setInternalSelected({});
  };

  /** Spread onto a <Th filter={...}>: `<Th filter={colFilter("title")}>Name</Th>` */
  const colFilter = (key: K) => ({
    options: options[key] ?? [],
    selected: selected[key] ?? [],
    onChange: (values: string[]) => setFilter(key, values),
  });

  return { filtered, options, selected, setFilter, clearAll, isFiltered: activeKeys.length > 0, colFilter };
}
