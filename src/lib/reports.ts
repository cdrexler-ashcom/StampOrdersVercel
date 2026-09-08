/**
 * Report catalog and helpers.
 *
 * The API exposes every extracted Crystal report under /api/reports/{name}. Three views exist
 * per report:
 *   * /definition — the parsed report definition as JSON.
 *   * /layout     — HTML layout preview with field placeholders. Works for ALL reports.
 *   * /html        — HTML with live data where a binding exists, else the layout preview.
 *
 * This module carries the UI-side metadata (friendly title, description, category and whether a
 * live-data binding exists yet) so the Reports screen can present the implemented reports and the
 * debug screen can track progress across all of them. The `bound` flags mirror the API's
 * BoundReports sets; keep them in step when a new report is bound on the API.
 */

import { api } from "./api";
import { proofs } from "./endpoints";
import type { ReportDefinitionInfo } from "@/types/api";

export type ReportCategory =
  | "Invoice register"
  | "Sales analysis"
  | "Invoice detail"
  | "Debtors"
  | "Documents"
  | "Operational";

/** Which of the API's ReportQuery filters are meaningful for a report. */
export interface ReportFilters {
  dates?: boolean; // from / to
  custId?: boolean;
  invoiceNo?: boolean;
  /**
   * A single "as at" date instead of a from/to range. Sent as the `to` param (the `from` is left
   * blank). Used by the customer statement (`stcuststat`), which is always "everything outstanding
   * as at a date" with no lower bound — the API ages the statement to this date and selects the
   * rows by it. Mutually exclusive with `dates`.
   */
  asAtDate?: boolean;
  /**
   * A Soset job number, and nothing else. Required — the report can't generate without it. Used by
   * `Proof`, which isn't an `IReportDataProvider` on the API: the live view is built by the proof
   * pipeline (`GET /api/proofs/{jobNo}` for the defaults, then `POST /api/proofs/preview`), so
   * `fetchReportHtml` routes `Proof` there instead of the generic `/api/reports/{name}/html`.
   */
  jobNo?: boolean;
}

/** One choice in a report's "Sort by" dropdown — `value` is sent to the API as `sortBy`. */
export interface ReportSortOption {
  value: string;
  label: string;
}

export interface ReportMeta {
  /** The API key — the XML file name without extension. May contain spaces. */
  name: string;
  title: string;
  description: string;
  category: ReportCategory;
  /** True when the API renders this report with live data (not just a layout preview). */
  bound: boolean;
  /** For bound reports, the filters worth showing. */
  filters?: ReportFilters;
  /**
   * Runtime sort order, offered as a "Sort by" dropdown in the params panel. Opt-in per report:
   * `invreg` is the only one the API currently accepts a `sortBy` override for (see
   * ReportEndpoints.cs) — it replaces the now-retired invregdate/invreginvc, which differed from
   * invreg only in a fixed sort order baked into their own XML.
   */
  sortOptions?: ReportSortOption[];
  /**
   * Label for a "Show detail" checkbox in the params panel, sent as `detail`. Opt-in per report:
   * `rechist` is the only one the API currently accepts it for — it reproduces rechist.Frm's
   * "Invoice Details:" checkbox (which toggled one report's label, not a separate report) as a
   * request-time flag instead of a second report existing.
   */
  detailToggleLabel?: string;
  /**
   * Marks this catalog entry as a UI shortcut into another entry's report — same `name` (and so
   * the same underlying API report), just a different link/initial params. `href` overrides the
   * Reports-index card's link; the dynamic route still resolves purely against `name`. Kept out of
   * the debug screen's per-report table and bound/total counts (see `PHYSICAL_REPORTS`), since
   * it isn't a distinct report as far as the API's catalog is concerned.
   */
  variantOf?: string;
  href?: string;
  /** For unbound reports, a short note on what is blocking the binding. */
  blockedBy?: string;
}

/**
 * Every extracted report. Order here drives the debug list. `bound` reflects what the API can
 * render with live data as of the reporting work to date (all 18 — invregdate and invreginvc
 * were retired as duplicates of invreg, which now covers both via its Sort by option).
 */
export const REPORTS: ReportMeta[] = [
  // --- Invoice register (ArchHeader / ArchLine) ---
  {
    name: "invreg",
    title: "Invoice Register",
    description:
      "Issued invoices with net, GST and inc-GST totals, grouped by invoice, with a grand total. " +
      "Sortable by date or invoice number — replaces the retired invregdate/invreginvc reports, " +
      "which differed from this one only in fixed sort order.",
    category: "Invoice register",
    bound: true,
    filters: { dates: true, custId: true, invoiceNo: true },
    sortOptions: [
      { value: "date", label: "Date" },
      { value: "invoiceNo", label: "Invoice no." },
    ],
  },

  // --- Sales analysis (ArchHeader / ArchLine) ---
  {
    name: "CustSales",
    title: "Customer Sales",
    description: "Sales grouped by invoice for the selected period.",
    category: "Sales analysis",
    bound: true,
    filters: { dates: true, custId: true },
  },
  {
    name: "ProdSales",
    title: "Product Sales",
    description: "Quantity sold per product for the selected period, with a grand total.",
    category: "Sales analysis",
    bound: true,
    filters: { dates: true },
  },

  // --- Invoice detail listings (InvHeader / InvLine — invoice staging tables) ---
  {
    name: "history",
    title: "Invoice History (line detail)",
    description:
      "Full line detail per invoice — job, description, quantity, line total and GST. Reads the current invoice staging batch.",
    category: "Invoice detail",
    bound: true,
    filters: { custId: true, invoiceNo: true },
  },
  {
    name: "ositems",
    title: "Order/Invoice Items",
    description: "Line detail per invoice from the current staging batch.",
    category: "Invoice detail",
    bound: true,
    filters: { custId: true, invoiceNo: true },
  },
  {
    name: "dephist",
    title: "Despatch History (line detail)",
    description: "Line detail per invoice from the current staging batch.",
    category: "Invoice detail",
    bound: true,
    filters: { custId: true, invoiceNo: true },
  },

  // --- Debtors (OpenItem / Customer) ---
  {
    name: "ageopen_excel",
    title: "Open Items (export)",
    description:
      "One row per open item: date, account, outstanding amount and document number. The flat, spreadsheet-style export.",
    category: "Debtors",
    bound: true,
    filters: { dates: true, custId: true },
  },
  {
    name: "stcuststat",
    title: "Customer Statement",
    description:
      "Printed statement per customer — every open item still outstanding as at the statement " +
      "date, with the aged summary (current, 30, 60+) and the remittance advice.",
    category: "Debtors",
    bound: true,
    filters: { asAtDate: true, custId: true },
  },
  {
    name: "ageopen",
    title: "Aged Debtors",
    description:
      "Aged-balance buckets (current month, then prior months) per customer as at a chosen " +
      "date, with a per-customer balance and a grand total.",
    category: "Debtors",
    bound: true,
    filters: { asAtDate: true, custId: true },
    // Summary view by default (per-customer bucket totals). Ticking this reveals the per-item
    // lines under each customer — the API un-suppresses ageopen's DetailSection1 / account
    // GroupHeader, reproducing openrpt.Frm's "Summary Only:" checkbox.
    detailToggleLabel: "Show item detail",
  },

  // --- Receipts history (Receipts_History / Customer) ---
  {
    name: "bankdep",
    title: "Bank Deposit",
    description: "Banking slip summarising receipts by payment type (cash / card / cheque), with a deposit total.",
    category: "Operational",
    bound: true,
    filters: { dates: true, custId: true },
  },
  {
    name: "rechist",
    title: "Receipt History",
    description: "Receipts grouped by customer, with per-customer and grand totals.",
    category: "Operational",
    bound: true,
    filters: { dates: true, custId: true },
    // Only flips the report's own "Summary"/"Detail" header label for now — the underlying
    // per-receipt invoice breakdown is a suppressed Crystal subreport the rendering engine
    // doesn't bind yet, so toggling this doesn't add rows until that's built.
    detailToggleLabel: "Show invoice detail",
  },
  {
    // Same report as above (rechist.Frm's single "Invoice Details:" checkbox, not a second
    // report — see the entry above and ReportEndpoints.cs) — this is a shortcut card that opens
    // it with the checkbox pre-ticked, for the common case of wanting that view directly rather
    // than opening the plain report and ticking it by hand.
    name: "rechist",
    variantOf: "rechist",
    href: "/reports/rechist?detail=true",
    title: "Receipt History (with invoice detail)",
    description: "As Receipt History, opened with \"Show invoice detail\" pre-selected.",
    category: "Operational",
    bound: true,
    filters: { dates: true, custId: true },
    detailToggleLabel: "Show invoice detail",
  },

  // --- Documents (InvHeader / InvLine — invoice staging tables) ---
  {
    name: "STINVOICE",
    title: "Tax Invoice",
    description:
      "The full printed tax invoice per invoice in the current staging batch — invoice and " +
      "delivery address, the lines billed (order no, job no, details, qty, price, line total) and " +
      "the GST-inclusive total, with the invoicing entity's letterhead, bank details and the " +
      "invoice barcode.",
    category: "Documents",
    bound: true,
    filters: { custId: true, invoiceNo: true },
  },
  {
    name: "STINVOICE - Save",
    title: "Tax Invoice (save copy)",
    description:
      "The office save copy of the tax invoice — same per-invoice layout as the Tax Invoice, with " +
      "the letterhead and the per-line price/total columns suppressed.",
    category: "Documents",
    bound: true,
    filters: { custId: true, invoiceNo: true },
  },
  {
    name: "DelDocket",
    title: "Delivery Docket",
    description:
      "The printed delivery docket per invoice in the current staging batch — delivery address, " +
      "bin no. and the lines to pack (order no, job no, details, qty), with the invoice barcode.",
    category: "Documents",
    bound: true,
    filters: { custId: true, invoiceNo: true },
  },
  // --- Status change log / daily sales / job card (StatChangeLog / Daily_Sales_Report / JobCard) ---
  {
    name: "ChangeLog",
    title: "Status Change Log",
    description: "Audit of stamp status changes — job no, date, order no, product and old/new status.",
    category: "Operational",
    bound: true,
    filters: { dates: true, invoiceNo: true },
  },
  {
    name: "DailySales",
    title: "Daily Sales",
    description: "Daily sales summary grouped by order, with sell/cost/margin, freight and grand totals.",
    category: "Operational",
    bound: true,
    filters: { dates: true },
  },
  {
    name: "jobcard",
    title: "Job Card",
    description:
      "Printable production job card — product, size, quantity, colour, bin and special instructions.",
    category: "Operational",
    bound: true,
    filters: { dates: true },
  },
  {
    name: "Proof",
    title: "Proof",
    description:
      "Customer proof for a single job — stamp design, product, price and the letterhead. " +
      "Enter a job number to generate; the full edit-and-email workflow is on the Proofs page.",
    category: "Operational",
    bound: true,
    filters: { jobNo: true },
  },
];

/** Reports the API renders with live data, in catalog order. Includes shortcut variants (see
 * ReportMeta.variantOf) — the Reports index wants every card, unlike the debug screen. */
export const BOUND_REPORTS = REPORTS.filter((r) => r.bound);

/** One row per report the API's catalog actually knows about — excludes shortcut variants (see
 * ReportMeta.variantOf), which reuse another entry's `name` and so would double-count binding
 * progress or duplicate a row on the debug screen. */
export const PHYSICAL_REPORTS = REPORTS.filter((r) => !r.variantOf);

/** Look up a report's metadata by API name (case-insensitive). */
export function findReport(name: string): ReportMeta | undefined {
  return REPORTS.find((r) => r.name.toLowerCase() === name.toLowerCase());
}

/** Categories in display order, with their reports. */
export const REPORT_CATEGORIES: ReportCategory[] = [
  "Invoice register",
  "Sales analysis",
  "Invoice detail",
  "Debtors",
  "Documents",
  "Operational",
];

// ---------------------------------------------------------------------------------------
// URLs and data
// ---------------------------------------------------------------------------------------

export type ReportView = "html" | "layout";

export interface ReportQueryParams {
  from?: string;
  to?: string;
  custId?: string | number;
  invoiceNo?: string;
  /** Runtime sort override — currently only honoured by the API for `invreg`. */
  sortBy?: string;
  /** Runtime detail toggle — currently only honoured by the API for `rechist`. */
  detail?: boolean;
  /** Soset job number — required for `Proof`, ignored by every other report. */
  jobNo?: string;
}

/**
 * Builds the URL for a report view (same-origin; next.config.ts proxies /api/* to the API).
 *
 * NOTE: since auth (H1/H2) this URL must NOT be used as an iframe src / link / window target — a
 * browser navigation doesn't carry the bearer token, so the API returns 401. Fetch the HTML with
 * fetchReportHtml() instead and render it locally. This builder is retained only for building the
 * path that fetchReportHtml() requests (and for the query-string encoding).
 */
export function reportUrl(
  name: string,
  view: ReportView,
  params: ReportQueryParams = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return `/api/reports/${encodeURIComponent(name)}/${view}${qs ? `?${qs}` : ""}`;
}

/**
 * Fetches a report's rendered HTML through the AUTHENTICATED api client, so the bearer token is
 * sent (unlike a raw iframe/window navigation, which 401s). The returned string is a
 * self-contained HTML document the caller renders via an iframe `srcDoc` or a blob URL.
 */
export function fetchReportHtml(
  name: string,
  view: ReportView,
  params: ReportQueryParams = {},
  signal?: AbortSignal,
): Promise<string> {
  // Proof isn't a data provider on the API — its live view comes from the proof pipeline, keyed
  // by a job number. The layout preview still goes through the generic path below.
  if (name.toLowerCase() === "proof" && view === "html") {
    return fetchProofHtml(params.jobNo, signal);
  }

  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    query[key] = String(value);
  }
  return api.getText(`/api/reports/${encodeURIComponent(name)}/${view}`, query, signal);
}

/**
 * Builds the live Proof for one job: reads the proof screen's defaults for the job
 * (`GET /api/proofs/{jobNo}`), then renders them unchanged (`POST /api/proofs/preview`) — the
 * same two calls the Proofs page makes, minus the operator edits. Any tweaking (price, delivery,
 * message, emailing) belongs on the Proofs page / order-line Proof button, not the Reports screen.
 */
async function fetchProofHtml(jobNo: string | undefined, signal?: AbortSignal): Promise<string> {
  const job = (jobNo ?? "").trim();
  if (!job) throw new Error("Enter a job number to generate the proof.");

  const defaults = await proofs.job(job, signal);
  return proofs.preview({
    jobNo: defaults.jobNo,
    accountNo: defaults.accountNo,
    custTitle: defaults.custTitle,
    prodId: defaults.prodId,
    prodName: defaults.prodName,
    colour: defaults.colour,
    qty: defaults.qty,
    priceCode: defaults.priceCode,
    price: defaults.price,
    discPct: defaults.discPct,
    email: defaults.email,
    invoiceComp: defaults.invoiceComp,
    extraText: null,
    noProofHeader: defaults.noProofHeader,
    priceIncGst: defaults.priceIncGst,
    deliveryIncluded: false,
    deliveryAmt: defaults.deliveryAmt,
    proofHeader: null,
  });
}

/** GET /api/reports — the report names the API can render. */
export function listReportNames(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/api/reports", undefined, signal);
}

/** GET /api/reports/{name}/definition — the parsed definition, for the debug inspector. */
export function getReportDefinition(name: string): Promise<ReportDefinitionInfo> {
  return api.get<ReportDefinitionInfo>(
    `/api/reports/${encodeURIComponent(name)}/definition`,
  );
}
