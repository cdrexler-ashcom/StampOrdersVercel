"use client";

import { useQuery } from "@tanstack/react-query";

import { CustomerPicker } from "@/components/CustomerPicker";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  GridToolbar,
  Input,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { invoices } from "@/lib/endpoints";
import { date, text, trackingStatusLabel } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useGridState } from "@/lib/useGridState";
import type { ArchiveHeader, Customer } from "@/types/api";

/** Columns the API's GET /api/invoices/history accepts as `sortBy` (matched case-insensitively). */
type SortKey =
  | "invoiceNo"
  | "custTitle"
  | "custCode"
  | "invoiceDate"
  | "orderId"
  | "runNo"
  | "email"
  | "phoneNo";
type SortDirection = "asc" | "desc";

/**
 * Invoice history.
 *
 * Replaces InvoiceHistory.frm, InvoiceHistoryList.frm and Reprint.Frm. Searching and
 * reprinting were three separate screens in the legacy application; here the search
 * result links straight to the document, which is where reprint and email now live.
 */
import { useRowLink } from "@/lib/useRowLink";

export default function InvoiceHistoryPage() {
  const rowLink = useRowLink();
  // Customer/invoice-number filters, sort, and column filters are all remembered in
  // sessionStorage (see useGridState) so they survive following a row link to
  // /invoices/{invoiceNo} and hitting Back — otherwise the list page remounts from scratch
  // and reverts to its defaults.
  const [customer, setCustomer] = useGridState<Customer | null>("invoices:customer", null);
  const [invoiceNo, setInvoiceNo] = useGridState("invoices:invoiceNo", "");

  // Sorting is server-side: starts unsorted (the API's own default — newest first, per
  // the page description) until a header is clicked.
  const [sort, setSort] = useGridState<{ key: SortKey; direction: SortDirection } | null>(
    "invoices:sort",
    null,
  );

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  // Column filter selections, covering all nine filterable columns even though only
  // custTitle/custCode/runNo/invoiceNo(→invoiceNos)/orderId/email/phoneNo get forwarded to
  // the API below — see the note on the useFilterableTable call for why invoiceDate/tracking
  // stay client-side. Every one of these needs to either be forwarded or documented as not
  // being forwarded: a filter that's silently client-side-only will look correct until a
  // sort or another filter changes which page of rows is loaded, at which point it can go
  // from "one matching row" to "zero rows", with nothing about the filter itself having changed.
  const [filterSelected, setFilterSelected] = useGridState<
    Partial<
      Record<
        | "invoiceNo"
        | "custTitle"
        | "custCode"
        | "invoiceDate"
        | "orderId"
        | "runNo"
        | "email"
        | "phoneNo"
        | "tracking",
        string[]
      >
    >
  >("invoices:filters", {});

  const query = useQuery({
    queryKey: [
      "invoices",
      "history",
      { custId: customer?.uniqueId, invoiceNo },
      sort,
      filterSelected.custTitle,
      filterSelected.custCode,
      filterSelected.runNo,
      filterSelected.invoiceNo,
      filterSelected.orderId,
      filterSelected.email,
      filterSelected.phoneNo,
    ],
    queryFn: () =>
      invoices.history({
        custId: customer?.uniqueId,
        invoiceNo: invoiceNo.trim() || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
        custTitle: filterSelected.custTitle,
        custCode: filterSelected.custCode,
        runNo: filterSelected.runNo,
        invoiceNos: filterSelected.invoiceNo,
        orderId: filterSelected.orderId,
        email: filterSelected.email,
        phoneNo: filterSelected.phoneNo,
      }),
  });

  const th = (key: SortKey) => ({
    onSort: () => toggleSort(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  // custTitle/custCode/runNo/invoiceNo/orderId/email/phoneNo all filter server-side now (see
  // InvoiceEndpoints.cs), applied before Take(200) — a filter narrows the full matching set
  // correctly, not just the loaded page. custCode is Customer.AccountNo joined on by CustId.
  // Two stay client-side, both for the same reason: their filter popup
  // doesn't show a raw column value, it shows something derived —
  //   - tracking: a label built from three columns (TrackingNo/TrackingRequired/
  //     TrackingStatus)
  //   - invoiceDate: a display-formatted string (date()), not the underlying DateTime
  // Matching either server-side would mean re-implementing that formatting/derivation in
  // C#. Known caveat: because the page these two filter over is still capped at 200 and
  // ordered by whatever sort is active, changing sort (or another filter) can change which
  // 200 rows are loaded and make a previously-matching row disappear from an
  // invoiceDate/tracking filter with nothing about that filter having changed — narrow by
  // customer or run first if that happens.
  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(
    query.data,
    {
      invoiceNo: (i: ArchiveHeader) => i.invoiceNo?.trim() ?? "",
      custTitle: (i: ArchiveHeader) => i.custTitle?.trim() ?? "",
      custCode: (i: ArchiveHeader) => i.custAccountNo?.trim() ?? "",
      invoiceDate: (i: ArchiveHeader) => (i.invoiceDate ? date(i.invoiceDate) : ""),
      orderId: (i: ArchiveHeader) => i.orderId.toString(),
      runNo: (i: ArchiveHeader) => i.runNo?.trim() ?? "",
      email: (i: ArchiveHeader) => i.email?.trim() ?? "",
      phoneNo: (i: ArchiveHeader) => i.phoneNo?.trim() ?? "",
      tracking: (i: ArchiveHeader) =>
        i.trackingNo?.trim()
          ? "Tracking captured"
          : i.trackingRequired
            ? (trackingStatusLabel[i.trackingStatus] ?? i.trackingStatus)
            : "Not required",
    },
    { selected: filterSelected, onChange: setFilterSelected },
  );

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

      <GridToolbar
        onClearSort={sort ? () => setSort(null) : undefined}
        onClearFilters={isFiltered ? clearAll : undefined}
      />

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
                <Th {...th("custCode")} filter={colFilter("custCode")}>Customer No.</Th>
                <Th {...th("custTitle")} filter={colFilter("custTitle")}>Customer</Th>
                <Th {...th("invoiceDate")} filter={colFilter("invoiceDate")}>Date</Th>
                <Th {...th("invoiceNo")} filter={colFilter("invoiceNo")}>Invoice</Th>
                <Th {...th("orderId")} filter={colFilter("orderId")}>Order</Th>
                <Th {...th("runNo")} filter={colFilter("runNo")}>
                  Run
                </Th>
                <Th {...th("email")} filter={colFilter("email")}>Email</Th>
                <Th {...th("phoneNo")} filter={colFilter("phoneNo")}>Phone</Th>
                <Th filter={colFilter("tracking")}>Tracking</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8">
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
                  <tr key={invoice.id} {...(invoice.invoiceNo ? rowLink(`/invoices/${encodeURIComponent(invoice.invoiceNo)}`) : {})}>
                    <Td>{text(invoice.custAccountNo)}</Td>
                    <Td>{text(invoice.custTitle)}</Td>
                    <Td>{date(invoice.invoiceDate)}</Td>
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
                    <Td>{invoice.orderId}</Td>
                    <Td>{text(invoice.runNo)}</Td>
                    <Td>{text(invoice.email)}</Td>
                    <Td>{text(invoice.phoneNo)}</Td>
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
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 200 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the most recent 200 invoices
            {(filterSelected.invoiceDate?.length ?? 0) > 0 ||
            (filterSelected.tracking?.length ?? 0) > 0
              ? ", before the invoice date and tracking filters are applied"
              : ""}
            . Filter or search to narrow the list.
          </p>
        )}
      </Card>
    </>
  );
}
