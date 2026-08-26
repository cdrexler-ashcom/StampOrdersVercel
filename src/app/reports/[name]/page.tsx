"use client";

import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { thisMonthRange } from "@/components/DateRangeField";
import { ReportFrame } from "@/components/ReportFrame";
import {
  EMPTY_REPORT_PARAMS,
  ReportParamsPanel,
  type ReportParamsValue,
} from "@/components/ReportParamsPanel";
import { Button, Notice, PageHeader, Spinner } from "@/components/ui";
import {
  findReport,
  type ReportQueryParams,
  type ReportView,
} from "@/lib/reports";

function ReportViewer() {
  const params = useParams<{ name: string }>();
  const search = useSearchParams();
  const name = decodeURIComponent(params.name);
  const meta = findReport(name);

  const bound = meta?.bound ?? false;
  // Which filters to show. Unknown reports (not in the catalog) get the full set.
  const filters = meta?.filters ?? { dates: true, custId: true, invoiceNo: true };

  const initialView: ReportView =
    search.get("view") === "layout" ? "layout" : bound ? "html" : "layout";

  const [view, setView] = useState<ReportView>(initialView);

  // Defaults to open so the options are visible the first time a report is opened; the
  // operator's preference to collapse it isn't persisted across reports on purpose — each
  // report screen starts from the same default.
  const [panelOpen, setPanelOpen] = useState(true);

  // Reports that take a date range default to the current month rather than opening blank —
  // "this month" is what's asked for far more often than "all time", and it matches the
  // range DateRangeField's own "This month" preset would select.
  const defaultParams: ReportParamsValue = filters.dates
    ? { ...EMPTY_REPORT_PARAMS, ...thisMonthRange() }
    : EMPTY_REPORT_PARAMS;

  // Draft: what the panel is currently showing, edited freely without touching the report.
  const [draft, setDraft] = useState<ReportParamsValue>(defaultParams);

  // Applied: what the report was actually generated with. Kept as the rich
  // ReportParamsValue (not just the query-string values) so the filter chips below can
  // still show the customer's name, not just the id that went into the URL.
  const [applied, setApplied] = useState<{ view: ReportView; params: ReportParamsValue }>({
    view: initialView,
    params: defaultParams,
  });

  const queryParams: ReportQueryParams = useMemo(
    () => ({
      from: applied.params.from || undefined,
      to: applied.params.to || undefined,
      custId: applied.params.customer?.uniqueId ?? undefined,
      invoiceNo: applied.params.invoiceNo || undefined,
      sortBy: applied.params.sortBy || undefined,
    }),
    [applied.params],
  );

  /** Applies a full parameter set immediately — used by both Generate and chip removal. */
  function apply(nextParams: ReportParamsValue, nextView: ReportView = view) {
    setDraft(nextParams);
    setView(nextView);
    setApplied({ view: nextView, params: nextParams });
  }

  const chips = buildChips(applied.params, (next) => apply(next));

  return (
    <div>
      <PageHeader
        title={meta?.title ?? name}
        description={meta?.description ?? "Report preview."}
        actions={
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" />
              All reports
            </Button>
          </Link>
        }
      />

      {!bound && (
        <div className="mb-4">
          <Notice tone="amber" title="Layout preview only">
            This report isn&apos;t bound to live data yet
            {meta?.blockedBy ? ` — ${meta.blockedBy}` : "."} The preview below shows the report
            layout with field placeholders.
          </Notice>
        </div>
      )}

      <div className="flex items-start gap-4">
        <ReportParamsPanel
          filters={filters}
          value={draft}
          onChange={setDraft}
          bound={bound}
          onGenerate={(nextView) => apply(draft, nextView)}
          open={panelOpen}
          onOpenChange={setPanelOpen}
          sortOptions={meta?.sortOptions}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
              ))}
            </div>
          )}

          <ReportFrame
            name={name}
            view={applied.view}
            params={queryParams}
            title={meta?.title ?? name}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/**
 * Turns the applied parameters into removable chips. Each chip's remove handler re-applies
 * immediately from the applied set (not the popup's draft), so clearing a chip can't
 * accidentally discard an unrelated edit sitting unsaved in the popup.
 */
function buildChips(
  applied: ReportParamsValue,
  onApply: (next: ReportParamsValue) => void,
): { key: string; label: string; onRemove: () => void }[] {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (applied.from || applied.to) {
    const label =
      applied.from && applied.to
        ? `${applied.from} → ${applied.to}`
        : applied.from
          ? `From ${applied.from}`
          : `To ${applied.to}`;
    chips.push({
      key: "dates",
      label,
      onRemove: () => onApply({ ...applied, from: "", to: "" }),
    });
  }

  if (applied.customer) {
    const customerLabel = [applied.customer.accountNo, applied.customer.title]
      .filter(Boolean)
      .join(" — ");
    chips.push({
      key: "customer",
      label: customerLabel || `Customer ${applied.customer.uniqueId}`,
      onRemove: () => onApply({ ...applied, customer: null }),
    });
  }

  if (applied.invoiceNo.trim()) {
    chips.push({
      key: "invoiceNo",
      label: `Invoice ${applied.invoiceNo.trim()}`,
      onRemove: () => onApply({ ...applied, invoiceNo: "" }),
    });
  }

  return chips;
}

/**
 * Report viewer. useSearchParams requires a Suspense boundary in the App Router, so the viewer is
 * wrapped here.
 */
export default function ReportViewerPage() {
  return (
    <Suspense fallback={<Spinner label="Loading report…" />}>
      <ReportViewer />
    </Suspense>
  );
}
