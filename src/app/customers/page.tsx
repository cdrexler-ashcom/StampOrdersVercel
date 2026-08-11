"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
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
import { text } from "@/lib/format";
import type { Customer } from "@/types/api";

/** Columns the API's GET /api/customers accepts as `sortBy`. */
type SortKey = "accountNo" | "title" | "address3" | "phoneNo" | "priceCode" | "discPct";
type SortDirection = "asc" | "desc";

/**
 * Customer list.
 *
 * The legacy CustEdit.frm was a 1,050-line maintenance form. The API exposes customers
 * read-only (GET /api/customers, GET /api/customers/{custId}), so this is a search and
 * view surface. Maintenance is recorded as an API gap in DESIGN-NOTES.md.
 */
export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Sorting is server-side: the API orders the full matching set before applying its
  // 100-row cap, so this can't be a plain client-side re-sort of the page that came back
  // (see ReferenceEndpoints.cs). No default sort — starts unsorted (the API's own default,
  // AccountNo asc) until a header is clicked.
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const query = useQuery({
    queryKey: ["customers", "search", debounced, sort],
    queryFn: () =>
      customers.search({
        search: debounced || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
      }),
  });

  const th = (key: SortKey) => ({
    onSort: () => toggleSort(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  // Column filtering runs client-side over whatever page of rows the search returned —
  // like sorting before it was moved server-side, this only sees the currently loaded
  // matches (capped at 100). Account number and phone aren't offered as filters since
  // they're effectively unique per row, so a value list wouldn't be useful there.
  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(query.data, {
    accountNo: (c: Customer) => c.accountNo?.trim() ?? "",
    title: (c: Customer) => c.title?.trim() ?? "",
    address3: (c: Customer) => c.address3?.trim() ?? "",
    priceCode: (c: Customer) => (c.priceCode != null ? String(c.priceCode) : ""),
    discPct: (c: Customer) => (c.discPct != null ? `${c.discPct}%` : ""),
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Search by account number or name."
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
        ) : (filtered?.length ?? 0) === 0 ? (
          <EmptyState
            title="No customers match the selected filters"
            action={
              <Button size="sm" variant="secondary" onClick={clearAll}>
                Clear column filters
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("accountNo")} filter={colFilter("title")}>Account</Th>
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
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered?.map((customer) => (
                <tr key={customer.uniqueId} className="hover:bg-slate-50">
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
                  <Td align="right">
                    <Link
                      href={`/customers/${customer.uniqueId}`}
                      className="text-xs font-medium text-sky-700 hover:text-sky-900"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 100 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the first 100 matches
            {isFiltered ? ", before column filters are applied" : ""}. Refine the search to
            narrow them.
          </p>
        )}
      </Card>
    </>
  );
}
