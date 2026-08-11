"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CustomerPicker } from "@/components/CustomerPicker";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { invoices, orders } from "@/lib/endpoints";
import { date, text, trackingStatusLabel } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import type { ArchiveHeader, Customer } from "@/types/api";

/** Columns the API's GET /api/invoices/history accepts as `sortBy`. */
type SortKey = "invoiceNo" | "custTitle" | "invoiceDate" | "orderId" | "runNo";
type SortDirection = "asc" | "desc";

/**
 * Invoice history.
 *
 * Replaces InvoiceHistory.frm, InvoiceHistoryList.frm and Reprint.Frm. Searching and
 * reprinting were three separate screens in the legacy application; here the search
 * result links straight to the document, which is where reprint and email now live.
 */
export default function InvoiceHistoryPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");

  // Sorting is server-side: starts unsorted (the API's own default — newest first, per
  // the page description) until a header is clicked.
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const query = useQuery({
    queryKey: ["invoices", "history", { custId: customer?.uniqueId, invoiceNo }, sort],
    queryFn: () =>
      invoices.history({
        custId: customer?.uniqueId,
        invoiceNo: invoiceNo.trim() || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
      }),
  });

  const th = (key: SortKey) => ({
    onSort: () => toggleSort(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  // Client-side, over whatever page the API returned (capped at 200 — see the notice
  // below), same as customers/orders. Invoice and order numbers are unfiltered since
  // they're unique per row. "Tracking" mirrors exactly what the cell displays (a captured
  // number, a status badge, or "Not required") so the filter's option list matches what's
  // on screen.
  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(query.data, {
    invoiceNo: (i: ArchiveHeader) => i.invoiceNo?.trim() ?? "",
    custTitle: (i: ArchiveHeader) => i.custTitle?.trim() ?? "",
    invoiceDate: (i: ArchiveHeader) => date(i.invoiceDate) ?? "",
    orderId: (i: ArchiveHeader) => i.orderId.toString() ?? "",
    runNo: (i: ArchiveHeader) => i.runNo?.trim() ?? "",
    tracking: (i: ArchiveHeader) =>
      i.trackingNo?.trim()
        ? "Tracking captured"
        : i.trackingRequired
          ? (trackingStatusLabel[i.trackingStatus] ?? i.trackingStatus)
          : "Not required",
  });

  return (
    <>
      <PageHeader
        title="Invoice history"
        description="Issued invoices and credits, newest first."
      />

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
          <Field label="Customer">
            <CustomerPicker value={customer} onChange={setCustomer} />
          </Field>

          <Field label="Invoice number">
            <Input
              value={invoiceNo}
              placeholder="Exact match"
              onChange={(event) => setInvoiceNo(event.target.value)}
            />
          </Field>

          <Button
            onClick={() => {
              setCustomer(null);
              setInvoiceNo("");
            }}
          >
            Clear
          </Button>
        </CardBody>
      </Card>

      <Card>
        {isFiltered && (
          <div className="mb-4">
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
          <EmptyState
            title="No invoices found"
            description="Adjust the customer or invoice number and try again."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("invoiceNo")} filter={colFilter("invoiceNo")}>Invoice</Th>
                <Th {...th("custTitle")} filter={colFilter("custTitle")}>Customer</Th>
                <Th {...th("invoiceDate")} filter={colFilter("invoiceDate")}>Invoice date</Th>
                <Th {...th("orderId")} filter={colFilter("orderId")}>Order</Th>
                <Th {...th("runNo")} filter={colFilter("runNo")}>
                  Run
                </Th>
                <Th filter={colFilter("tracking")}>Tracking</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <EmptyState
                      title="No invoices match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered?.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-medium text-slate-900">
                        {text(invoice.invoiceNo)}
                      </span>
                      {invoice.credit && (
                        <Badge tone="violet" className="ml-2">
                          Credit
                        </Badge>
                      )}
                    </Td>
                    <Td>{text(invoice.custTitle)}</Td>
                    <Td>{date(invoice.invoiceDate)}</Td>
                    <Td>{invoice.orderId}</Td>
                    <Td>{text(invoice.runNo)}</Td>
                    <Td>
                      {invoice.trackingNo?.trim() ? (
                        <span className="text-xs text-slate-600">
                          {invoice.trackingNo}
                        </span>
                      ) : invoice.trackingRequired ? (
                        <Badge tone="amber">
                          {trackingStatusLabel[invoice.trackingStatus] ??
                            invoice.trackingStatus}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Not required</span>
                      )}
                    </Td>
                    <Td align="right">
                      {invoice.invoiceNo && (
                        <Link
                          href={`/invoices/${encodeURIComponent(invoice.invoiceNo)}`}
                          className="text-xs font-medium text-sky-700 hover:text-sky-900"
                        >
                          Open
                        </Link>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 200 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the most recent 200 invoices
            {isFiltered ? ", before column filters are applied" : ""}. Filter to narrow the
            list.
          </p>
        )}
      </Card>
    </>
  );
}
