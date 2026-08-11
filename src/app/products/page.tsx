"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { reference } from "@/lib/endpoints";
import { money, text } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import type { SosetProduct } from "@/types/api";

/** Columns the API's GET /api/reference/products accepts as `sortBy`. */
type SortKey =
  | "prodId"
  | "prodName"
  | "unitPrice1"
  | "unitPrice2"
  | "unitPrice3"
  | "unitPrice4"
  | "unitPrice5"
  | "cut";
type SortDirection = "asc" | "desc";

/**
 * Product reference.
 *
 * Replaces GetProd.frm, PriceList.frm and prcLookup.frm as a browsable list. Products
 * live in Soset, so this is read-only; the five unit price columns are shown together
 * rather than one at a time, which is what the price-code lookup form did.
 */
export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Sorting is server-side (see ReferenceEndpoints.cs): the API sorts the full matching
  // set, then this page slices to the first 200 for display below. No default sort —
  // starts unsorted (the API's own default, ProdId asc) until a header is clicked.
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  // Column filter selections, lifted up here so the query below can read them — same
  // pattern as customers/invoices.
  const [filterSelected, setFilterSelected] = useState<
    Partial<Record<"prodName" | "cut", string[]>>
  >({});

  const query = useQuery({
    queryKey: ["products", "search", debounced, sort, filterSelected],
    queryFn: () =>
      reference.products({
        search: debounced || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
        prodName: filterSelected.prodName,
        cut: filterSelected.cut,
      }),
  });

  const th = (key: SortKey) => ({
    onSort: () => toggleSort(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  // GetProductsAsync (the Soset gateway) returns every matching product with no cap, so
  // filtering server-side here is a payload-size win, not a correctness fix — there's no
  // Take() for a filtered-out row to get lost behind the way there was for
  // customers/invoices. Code is left unfiltered since it's unique per row; the five price
  // columns are continuous values rather than a small set of repeated ones, so a
  // value-list filter wouldn't narrow much there either. Cut mirrors exactly what the
  // cell displays (the "W × H" pairing, or "—").
  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(
    query.data,
    {
      prodName: (p: SosetProduct) => p.prodName?.trim() ?? "",
      cut: (p: SosetProduct) =>
        p.cutWidth != null && p.cutHeight != null ? `${p.cutWidth} × ${p.cutHeight}` : "",
    },
    { selected: filterSelected, onChange: setFilterSelected },
  );

  // Slicing now happens after filtering (both server-side above, and the client-side
  // no-op re-filter inside the hook) rather than before — previously this sliced to 200
  // first and filtered what was left, which meant a product outside the first 200 could
  // never be found by a filter at all, no matter how narrow.
  const rows = (filtered ?? []).slice(0, 200);

  return (
    <>
      <PageHeader
        title="Products"
        description="Read from Soset. Unit prices 1 to 5 correspond to customer price codes."
      />

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            autoFocus
            placeholder="Product code or name…"
            onChange={(event) => setSearch(event.target.value)}
            className="block w-full rounded-md border-0 bg-white py-2 pl-8 pr-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600"
          />
        </div>
      </div>

      {query.isError && (
        <div className="mb-4">
          <Notice tone="red" title="Soset could not be read">
            {(query.error as Error).message}
          </Notice>
        </div>
      )}

      <Card>
        {isFiltered && (
          <div className="flex justify-end border-b border-slate-100 px-4 py-2">
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Clear column filters
            </Button>
          </div>
        )}

        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("prodId")}>Code</Th>
                <Th {...th("prodName")} filter={colFilter("prodName")}>
                  Name
                </Th>
                <Th align="right" {...th("unitPrice1")}>
                  Price 1
                </Th>
                <Th align="right" {...th("unitPrice2")}>
                  Price 2
                </Th>
                <Th align="right" {...th("unitPrice3")}>
                  Price 3
                </Th>
                <Th align="right" {...th("unitPrice4")}>
                  Price 4
                </Th>
                <Th align="right" {...th("unitPrice5")}>
                  Price 5
                </Th>
                <Th {...th("cut")} filter={colFilter("cut")}>
                  Cut (W×H)
                </Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8">
                    <EmptyState
                      title="No products match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map((product) => (
                  <tr key={product.prodId} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-medium text-slate-900">
                        {product.prodId}
                      </span>
                    </Td>
                    <Td>
                      <span className="block max-w-64 truncate">
                        {text(product.prodName)}
                      </span>
                    </Td>
                    <Td align="right">{money(product.unitPrice1)}</Td>
                    <Td align="right">{money(product.unitPrice2)}</Td>
                    <Td align="right">{money(product.unitPrice3)}</Td>
                    <Td align="right">{money(product.unitPrice4)}</Td>
                    <Td align="right">{money(product.unitPrice5)}</Td>
                    <Td>
                      {product.cutWidth != null && product.cutHeight != null
                        ? `${product.cutWidth} × ${product.cutHeight}`
                        : "—"}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {product.suppressesStampJob && (
                          <Badge tone="amber">NOSTAMP</Badge>
                        )}
                        {product.typeset?.trim() && (
                          <Badge tone="sky">Typeset</Badge>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        {(filtered?.length ?? 0) > 200 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing 200 of {filtered?.length} products. Refine the search or filters to
            narrow them.
          </p>
        )}
      </Card>
    </>
  );
}
