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
  /** For unbound reports, a short note on what is blocking the binding. */
  blockedBy?: string;
}

/**
 * Every extracted report. Order here drives the debug list. `bound` reflects what the API can
 * render with live data as of the reporting work to date (9 of 20).
 */
export const REPORTS: ReportMeta[] = [
  // --- Invoice register (ArchHeader / ArchLine) ---
  {
    name: "invreg",
    title: "Invoice Register (by date)",
    description:
      "Issued invoices with net, GST and inc-GST totals, grouped by invoice and ordered by date, with a grand total.",
    category: "Invoice register",
    bound: true,
    filters: { dates: true, custId: true, invoiceNo: true },
  },
  {
    name: "invregdate",
    title: "Invoice Register (by invoice date)",
    description: "As the invoice register, ordered by invoice date.",
    category: "Invoice register",
    bound: true,
    filters: { dates: true, custId: true, invoiceNo: true },
  },
  {
    name: "invreginvc",
    title: "Invoice Register (by invoice no.)",
    description: "As the invoice register, ordered by invoice number.",
    category: "Invoice register",
    bound: true,
    filters: { dates: true, custId: true, invoiceNo: true },
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

  // --- Not yet bound ---
  {
    name: "ageopen",
    title: "Aged Debtors",
    description: "Aged-balance buckets (current, 30/60/90+) per customer.",
    category: "Debtors",
    bound: false,
    blockedBy: "Aged buckets use Crystal NumberVar formulas the evaluator doesn't support yet.",
  },
  {
    name: "stcuststat",
    title: "Customer Statement",
    description: "Printed statement per customer with aged balances.",
    category: "Debtors",
    bound: false,
    blockedBy: "Needs the Statements table (no EF entity) plus NumberVar ageing.",
  },
  {
    name: "STINVOICE",
    title: "Tax Invoice",
    description: "The full printed tax invoice document.",
    category: "Documents",
    bound: false,
    blockedBy: "Full document: bank-detail params, per-invoice layout and running tax summary.",
  },
  {
    name: "STINVOICE - Save",
    title: "Tax Invoice (save copy)",
    description: "Save-copy variant of the tax invoice document.",
    category: "Documents",
    bound: false,
    blockedBy: "Full document: bank-detail params, per-invoice layout and running tax summary.",
  },
  {
    name: "DelDocket",
    title: "Delivery Docket",
    description: "The printed delivery docket document.",
    category: "Documents",
    bound: false,
    blockedBy: "Full document: per-invoice layout and bank-detail parameters.",
  },
  {
    name: "bankdep",
    title: "Bank Deposit",
    description: "Banking slip summarising receipts by payment type.",
    category: "Operational",
    bound: false,
    blockedBy: "Needs a receipts-history provider (Receipts_History).",
  },
  {
    name: "rechist",
    title: "Receipt History",
    description: "Receipts with their invoice allocations.",
    category: "Operational",
    bound: false,
    blockedBy: "Needs a receipts-history provider (Receipts_History / RecInvoice_History).",
  },
  {
    name: "ChangeLog",
    title: "Status Change Log",
    description: "Audit of stamp status changes.",
    category: "Operational",
    bound: false,
    blockedBy: "Backs onto StatChangeLog, which has no EF entity.",
  },
  {
    name: "DailySales",
    title: "Daily Sales",
    description: "Daily sales summary.",
    category: "Operational",
    bound: false,
    blockedBy: "Backs onto the Daily_Sales_Report view, which has no EF entity.",
  },
  {
    name: "jobcard",
    title: "Job Card",
    description: "Production job card.",
    category: "Operational",
    bound: false,
    blockedBy: "Backs onto the JobCard table, which has no EF entity.",
  },
  {
    name: "Proof",
    title: "Proof",
    description: "Proof sheet.",
    category: "Operational",
    bound: false,
    blockedBy: "Backs onto a Crystal SQL command, not a mapped table.",
  },
];

/** Reports the API renders with live data, in catalog order. */
export const BOUND_REPORTS = REPORTS.filter((r) => r.bound);

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
}

/**
 * Builds the URL for a report view. The path is same-origin — next.config.ts proxies /api/* to
 * the C# API — so it can be used as an iframe src, a link, or the source for a print/PDF frame.
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
