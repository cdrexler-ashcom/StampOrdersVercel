import { useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;

/** Maps each sortable column's key to a function that pulls a comparable value off a row. */
export type SortAccessors<T> = Record<string, (row: T) => SortValue>;

function compareValues(a: SortValue, b: SortValue): number {
  const av = a === undefined ? null : a;
  const bv = b === undefined ? null : b;

  // Missing data always sorts last, regardless of direction.
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;

  if (typeof av === "boolean" || typeof bv === "boolean") {
    return Number(av) - Number(bv);
  }
  if (typeof av === "number" && typeof bv === "number") return av - bv;

  return String(av).localeCompare(String(bv), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Generic click-to-sort behaviour for grid pages.
 *
 * Each sortable column supplies an accessor that pulls a comparable primitive off a row,
 * rather than a plain field name. That covers direct fields (customer.title), derived
 * labels (order.custTitle ?? String(order.custId)), and dates — accessors should return
 * `new Date(value).getTime()` for date columns so sorting is chronological, not lexical.
 *
 * Sorting re-runs on every render rather than being memoized. Every grid in this app caps
 * results at 100 rows ("Showing the first 100 matches"), so re-sorting on each render is
 * cheap; memoizing would need the accessors object to be stable across renders, which
 * isn't guaranteed when it's declared inline in the component body.
 *
 * Usage:
 *   const { sorted, th } = useSortableTable(query.data, {
 *     accountNo: (c) => c.accountNo,
 *     title: (c) => c.title,
 *   });
 *
 *   <Th {...th("accountNo")}>Account</Th>
 *   ...
 *   {sorted?.map((customer) => ...)}
 *
 * With no `initialKey`, the grid starts unsorted (rows stay in whatever order the data
 * arrived in) until the person clicks a header. Pass `initialKey` to start pre-sorted
 * instead — e.g. `useSortableTable(data, accessors, "invoiceDate", "desc")` for newest
 * first.
 *
 * The column key type is inferred as `keyof typeof accessors` (via the `A extends
 * SortAccessors<T>` generic) rather than a directly-declared `K extends string` type
 * parameter. `Record<K, ...>` isn't a homomorphic mapped type, so TypeScript can't infer
 * `K` from the accessors object literal's keys — it would instead grab `K` from
 * `initialKey` alone and reject every other key in the object as excess.
 */
export function useSortableTable<T, A extends SortAccessors<T>>(
  data: T[] | undefined,
  accessors: A,
  initialKey?: keyof A & string,
  initialDirection: SortDirection = "asc",
) {
  type K = keyof A & string;

  const [sort, setSort] = useState<{ key: K; direction: SortDirection } | null>(
    initialKey ? { key: initialKey, direction: initialDirection } : null,
  );

  const toggle = (key: K) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const sorted =
    data && sort
      ? [...data].sort((a, b) => {
          const accessor = accessors[sort.key];
          const result = compareValues(accessor(a), accessor(b));
          return sort.direction === "asc" ? result : -result;
        })
      : data;

  /** Spread onto a <Th> to wire up a column: `<Th {...th("accountNo")}>Account</Th>` */
  const th = (key: K) => ({
    onSort: () => toggle(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  return { sorted, sort, toggle, th };
}
