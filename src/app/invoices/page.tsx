"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

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
  ResultCapNotice,
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
  | "recipient"
  | "invoiceDate"
  | "orderId"
  | "email"
  | "phoneNo";
type SortDirection = "asc" | "desc";

/**
 * What a search was run with. The boxes on the page are only a draft until Search is pressed
 * (customer feedback, Nov 2026: History is for finding an old invoice from whatever you know, so it
 * should not load anything, or re-query on every keystroke, until asked). Text is trimmed and the
 * customer is held as its id, so two searches that mean the same thing compare equal.
 */
interface SearchCriteria {
  custId?: number;
  invoiceNo: string;
  recipientName: string;
  emailSearch: string;
  phoneSearch: string;
  dateFrom: string;
  dateTo: string;
  jobNo: string;
  custOrderNo: string;
}

/** True when at least one box is filled in: an empty search would just list the newest 200. */
function hasCriteria(c: SearchCriteria): boolean {
  return (
    c.custId !== undefined ||
    [
      c.invoiceNo,
      c.recipientName,
      c.emailSearch,
      c.phoneSearch,
      c.dateFrom,
      c.dateTo,
      c.jobNo,
      c.custOrderNo,
    ].some((value) => value !== "")
  );
}

/**
 * The job numbers or customer order numbers on one invoice. An invoice has a line per stamp
 * job, so this can be long: the first few are shown, the rest behind "+N more", and the full
 * list is on hover.
 */
function NumberList({ values, max = 3 }: { values?: string[] | null; max?: number }) {
  if (!values || values.length === 0) return <span className="text-slate-400">—</span>;
  const shown = values.slice(0, max);
  const extra = values.length - shown.length;
  return (
    <span title={values.join(", ")}>
      {shown.join(", ")}
      {extra > 0 && <span className="ml-1 text-xs text-slate-500">+{extra} more</span>}
    </span>
  );
}

/**
 * History (the invoice history list).
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
  // Part of the recipient's name; the Recipient column filter below picks exact names instead.
  const [recipientName, setRecipientName] = useGridState("invoices:recipientName", "");
  // Part of the invoice email address or phone number, and an invoice-date range for when only an
  // approximate date is known (customer feedback, Nov 2026: find an old job from whatever the
  // customer can tell you). Dates are yyyy-MM-dd, as a date input gives them.
  const [emailSearch, setEmailSearch] = useGridState("invoices:emailSearch", "");
  const [phoneSearch, setPhoneSearch] = useGridState("invoices:phoneSearch", "");
  const [dateFrom, setDateFrom] = useGridState("invoices:dateFrom", "");
  const [dateTo, setDateTo] = useGridState("invoices:dateTo", "");
  // Job and customer order numbers are on the invoice lines, so they are searched with their own
  // exact-match boxes (like the invoice number) rather than column filters.
  const [jobNo, setJobNo] = useGridState("invoices:jobNo", "");
  const [custOrderNo, setCustOrderNo] = useGridState("invoices:custOrderNo", "");

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
  // custTitle/custCode/recipient/invoiceNo(→invoiceNos)/orderId/email/phoneNo get forwarded to
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
        | "recipient"
        | "invoiceDate"
        | "orderId"
        | "email"
        | "phoneNo"
        | "tracking",
        string[]
      >
    >
  >("invoices:filters", {});

  // The boxes above are a draft; the search that is actually showing is `applied`, set by the
  // Search button (or Enter in a box) and remembered like the rest so Back from an invoice brings
  // the same results back. Null until the first search: nothing loads before that.
  const draft: SearchCriteria = {
    custId: customer?.uniqueId,
    invoiceNo: invoiceNo.trim(),
    recipientName: recipientName.trim(),
    emailSearch: emailSearch.trim(),
    phoneSearch: phoneSearch.trim(),
    dateFrom,
    dateTo,
    jobNo: jobNo.trim(),
    custOrderNo: custOrderNo.trim(),
  };
  const [applied, setApplied] = useGridState<SearchCriteria | null>("invoices:applied", null);
  const canSearch = hasCriteria(draft);
  const resultsAreStale = applied !== null && JSON.stringify(applied) !== JSON.stringify(draft);

  const search = () => {
    if (canSearch) setApplied(draft);
  };

  const clearSearch = () => {
    setCustomer(null);
    setRecipientName("");
    setInvoiceNo("");
    setJobNo("");
    setCustOrderNo("");
    setEmailSearch("");
    setPhoneSearch("");
    setDateFrom("");
    setDateTo("");
    setApplied(null);
  };

  const query = useQuery({
    queryKey: [
      "invoices",
      "history",
      applied,
      sort,
      filterSelected.custTitle,
      filterSelected.custCode,
      filterSelected.recipient,
      filterSelected.invoiceNo,
      filterSelected.orderId,
      filterSelected.email,
      filterSelected.phoneNo,
    ],
    // Nothing is requested until a search has been run.
    enabled: applied !== null,
    queryFn: () =>
      invoices.history({
        custId: applied!.custId,
        invoiceNo: applied!.invoiceNo || undefined,
        recipientName: applied!.recipientName || undefined,
        emailSearch: applied!.emailSearch || undefined,
        phoneSearch: applied!.phoneSearch || undefined,
        dateFrom: applied!.dateFrom || undefined,
        dateTo: applied!.dateTo || undefined,
        jobNo: applied!.jobNo || undefined,
        custOrderNo: applied!.custOrderNo || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
        custTitle: filterSelected.custTitle,
        custCode: filterSelected.custCode,
        recipient: filterSelected.recipient,
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

  // custTitle/custCode/recipient/invoiceNo/orderId/email/phoneNo all filter server-side now (see
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
      recipient: (i: ArchiveHeader) => i.delName?.trim() ?? "",
      invoiceDate: (i: ArchiveHeader) => (i.invoiceDate ? date(i.invoiceDate) : ""),
      orderId: (i: ArchiveHeader) => i.orderId.toString(),
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
        title="History"
        description="Find an issued invoice or credit: enter what you know, then press Search."
      />

      <Card className="mb-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}
        >
          <CardBody className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_10rem_10rem_auto] sm:items-end">
            <Field label="Customer">
              <CustomerPicker value={customer} onChange={setCustomer} />
            </Field>

            <Field label="Recipient">
              <Input
                value={recipientName}
                placeholder="Search for Recipient"
                // Start a fresh visit in the first box people usually have something for. Not when
                // coming back to a search that is already showing.
                autoFocus={applied === null}
                onChange={(event) => setRecipientName(event.target.value)}
              />
            </Field>

            <Field label="Invoice number">
              <Input
                value={invoiceNo}
                placeholder="Exact match"
                onChange={(event) => setInvoiceNo(event.target.value)}
              />
            </Field>

            <Field label="Job number">
              <Input
                value={jobNo}
                placeholder="Exact match"
                onChange={(event) => setJobNo(event.target.value)}
              />
            </Field>

            <Field label="Customer order no.">
              <Input
                value={custOrderNo}
                placeholder="Exact match"
                onChange={(event) => setCustOrderNo(event.target.value)}
              />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={!canSearch} loading={query.isFetching}>
                <Search className="size-3.5" />
                Search
              </Button>
              <Button type="button" onClick={clearSearch}>
                Clear
              </Button>
            </div>
          </CardBody>

          <CardBody className="grid gap-3 border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Email (invoice)">
              <Input
                type="search"
                value={emailSearch}
                placeholder="Part of the address"
                onChange={(event) => setEmailSearch(event.target.value)}
              />
            </Field>

            <Field label="Phone (invoice)" hint="Spaces and punctuation are ignored.">
              <Input
                type="search"
                value={phoneSearch}
                placeholder="Part of the number"
                onChange={(event) => setPhoneSearch(event.target.value)}
              />
            </Field>

            <Field label="Invoice date from">
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Field>

            <Field label="Invoice date to">
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Field>
          </CardBody>

          {(resultsAreStale || (applied === null && !canSearch)) && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              {resultsAreStale
                ? "The results below are for the previous search. Press Search to update them."
                : "Fill in at least one box, then press Search or Enter."}
            </p>
          )}
        </form>
      </Card>

      <GridToolbar
        onClearSort={sort ? () => setSort(null) : undefined}
        onClearFilters={isFiltered ? clearAll : undefined}
      />

      <Card>
        {applied === null ? (
          <EmptyState
            title="Search for an invoice"
            description="Enter whatever you know about the customer, recipient, email, phone, date, invoice, job or order number, then press Search."
          />
        ) : query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No invoices found"
            description="Adjust the customer, recipient, email, phone, date, invoice, job or order number and try again."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("custCode")} filter={colFilter("custCode")}>Customer No.</Th>
                <Th {...th("custTitle")} filter={colFilter("custTitle")}>Customer name</Th>
                <Th {...th("recipient")} filter={colFilter("recipient")}>Recipient</Th>
                <Th {...th("invoiceDate")} filter={colFilter("invoiceDate")}>Date</Th>
                <Th {...th("invoiceNo")} filter={colFilter("invoiceNo")}>Invoice no.</Th>
                <Th>Job no.</Th>
                <Th>Cust order no.</Th>
                <Th {...th("orderId")} filter={colFilter("orderId")}>Order</Th>
                <Th {...th("email")} filter={colFilter("email")}>Email (invoice)</Th>
                <Th {...th("phoneNo")} filter={colFilter("phoneNo")}>Phone (invoice)</Th>
                <Th filter={colFilter("tracking")}>Tracking</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8">
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
                    <Td>{text(invoice.delName)}</Td>
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
                    <Td>
                      <NumberList values={invoice.jobNos} />
                    </Td>
                    <Td>
                      <NumberList values={invoice.custOrderNos} />
                    </Td>
                    <Td>{invoice.orderId}</Td>
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
          <ResultCapNotice
            cap={200}
            noun="invoices"
            qualifier={
              (filterSelected.invoiceDate?.length ?? 0) > 0 ||
              (filterSelected.tracking?.length ?? 0) > 0
                ? ", before the invoice date and tracking filters are applied"
                : undefined
            }
          >
            Filter or search to narrow the list.
          </ResultCapNotice>
        )}
      </Card>
    </>
  );
}
