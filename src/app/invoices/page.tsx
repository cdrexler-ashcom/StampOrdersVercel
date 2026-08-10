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
import { invoices } from "@/lib/endpoints";
import { date, text, trackingStatusLabel } from "@/lib/format";
import type { Customer } from "@/types/api";

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
                <Th {...th("invoiceNo")}>Invoice</Th>
                <Th {...th("custTitle")}>Customer</Th>
                <Th {...th("invoiceDate")}>Invoice date</Th>
                <Th {...th("orderId")}>Order</Th>
                <Th {...th("runNo")}>Run</Th>
                <Th>Tracking</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data?.map((invoice) => (
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
              ))}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 200 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the most recent 200 invoices. Filter to narrow the list.
          </p>
        )}
      </Card>
    </>
  );
}
