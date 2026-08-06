"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Badge,
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
import { text } from "@/lib/format";

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

  const query = useQuery({
    queryKey: ["customers", "search", debounced],
    queryFn: () => customers.search(debounced || undefined),
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Search by account number or name."
      />

      <div className="mb-4 max-w-md">
        <div className="relative">
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
      </div>

      <Card>
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Account</Th>
                <Th>Name</Th>
                <Th>Suburb</Th>
                <Th>Phone</Th>
                <Th align="right">Price code</Th>
                <Th align="right">Discount</Th>
                <Th>Flags</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data?.map((customer) => (
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
            Showing the first 100 matches. Refine the search to narrow them.
          </p>
        )}
      </Card>
    </>
  );
}
