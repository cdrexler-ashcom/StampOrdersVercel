"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { customers } from "@/lib/endpoints";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useGridState } from "@/lib/useGridState";
import { text } from "@/lib/format";
import type { Customer } from "@/types/api";

/** Columns the API's GET /api/customers accepts as `sortBy`. */
type SortKey = "accountNo" | "title" | "address3" | "phoneNo" | "priceCode" | "discPct";
type SortDirection = "asc" | "desc";

/**
 * Customer list.
 *
 * The legacy CustEdit.frm was a 1,050-line maintenance form. This is the search and view
 * surface; creation and editing (task C2) live on /customers/new and /customers/[custId].
 */
import { useRowLink } from "@/lib/useRowLink";

export default function CustomersPage() {
  const rowLink = useRowLink();
  // Search text, sort, and column filters are all remembered in sessionStorage (see
  // useGridState) so they survive following a row link to /customers/{id} and hitting
  // Back — otherwise the list page remounts from scratch and reverts to its defaults.
  const [search, setSearch] = useGridState("customers:search", "");
  const [debounced, setDebounced] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Sorting is server-side: the API orders the full matching set before applying its
  // 100-row cap, so this can't be a plain client-side re-sort of the page that came back
  // (see ReferenceEndpoints.cs). No default sort — starts unsorted (the API's own default,
  // AccountNo asc) until a header is clicked.
  const [sort, setSort] = useGridState<{ key: SortKey; direction: SortDirection } | null>(
    "customers:sort",
    null,
  );

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  // Column filter selections. Lifted up here (rather than left inside useFilterableTable)
  // because the query below needs to read it to build the request — see the `controlled`
  // param on useFilterableTable.
  const [filterSelected, setFilterSelected] = useGridState<
    Partial<Record<"title" | "address3" | "priceCode" | "discPct", string[]>>
  >("customers:filters", {});

  const query = useQuery({
    queryKey: ["customers", "search", debounced, sort, filterSelected],
    queryFn: () =>
      customers.search({
        search: debounced || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
        title: filterSelected.title,
        address3: filterSelected.address3,
        priceCode: filterSelected.priceCode,
        discPct: filterSelected.discPct,
      }),
  });

  const th = (key: SortKey) => ({
    onSort: () => toggleSort(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  // Filtering itself now happens server-side (see ReferenceEndpoints.cs), applied before
  // Take(100) — so unlike before, a filter narrows the full matching set correctly rather
  // than just the loaded page. What's still client-side is each column's *option list*:
  // it's built from whatever page comes back, so once a filter on one column is active,
  // other columns' popups only offer values that survive it — the same progressive
  // narrowing a spreadsheet AutoFilter shows, and a step further than before, when every
  // column's options stayed independent of the others no matter what was selected.
  // Account number and phone still aren't offered as filters — they're effectively unique
  // per row, so a value list wouldn't be useful there.
  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(
    query.data,
    {
      title: (c: Customer) => c.title?.trim() ?? "",
      address3: (c: Customer) => c.address3?.trim() ?? "",
      priceCode: (c: Customer) => (c.priceCode != null ? String(c.priceCode) : ""),
      discPct: (c: Customer) => (c.discPct != null ? `${c.discPct}%` : ""),
    },
    { selected: filterSelected, onChange: setFilterSelected },
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description="Search by account number or name."
        actions={
          <Link href="/customers/new">
            <Button variant="primary">
              <Plus className="size-3.5" />
              New customer
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            autoFocus
            placeholder="Account number or name…"
            onChange={(event) => setSearch(event.target.value)}
            className="block w-full rounded-md border-0 bg-white py-2 pl-8 pr-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600"
          />
        </div>

        {sort && (
          <Button size="sm" variant="ghost" onClick={() => setSort(null)}>
            Clear sorting
          </Button>
        )}

        {isFiltered && (
          <Button size="sm" variant="ghost" onClick={clearAll}>
            Clear column filters
          </Button>
        )}
      </div>

      <Card>
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          // The header (and its filter dropdowns) stays mounted even when `filtered` is
          // empty. Each column's option list comes from the full loaded page regardless
          // of `selected`, but the dropdown itself still has to stay on screen for that
          // to matter — swapping the whole <Table> out for an EmptyState previously took
          // the filter triggers with it, so there was no way back once a combination of
          // filters matched zero rows.
          <Table>
            <thead>
              <tr>
                <Th {...th("accountNo")}>Account</Th>
                <Th {...th("title")} filter={colFilter("title")}>
                  Name
                </Th>
                <Th {...th("address3")} filter={colFilter("address3")}>
                  Suburb
                </Th>
                <Th {...th("phoneNo")}>Phone</Th>
                <Th align="right" {...th("priceCode")} filter={colFilter("priceCode")}>
                  Price code
                </Th>
                <Th align="right" {...th("discPct")} filter={colFilter("discPct")}>
                  Discount
                </Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8">
                    <EmptyState
                      title="No customers match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered?.map((customer) => (
                  <tr key={customer.uniqueId} {...rowLink(`/customers/${customer.uniqueId}`)}>
                    <Td>
                      <span className="font-medium text-slate-900">
                        {text(customer.accountNo)}
                      </span>
                    </Td>
                    <Td>
                      <span className="block max-w-64 truncate">
                        {text(customer.title)}
                      </span>
                    </Td>
                    <Td>{text(customer.address3)}</Td>
                    <Td>{text(customer.phoneNo)}</Td>
                    <Td align="right">{customer.priceCode ?? "—"}</Td>
                    <Td align="right">
                      {customer.discPct ? `${customer.discPct}%` : "—"}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {customer.creditStatus?.trim() && (
                          <Badge tone="amber">{customer.creditStatus}</Badge>
                        )}
                        {customer.gstExempt && <Badge tone="slate">GST exempt</Badge>}
                        {customer.emailInvoice && <Badge tone="sky">Email</Badge>}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 100 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the first 100 matches. Refine the search to narrow them.
          </p>
        )}
      </Card>
    </>
  );
}
