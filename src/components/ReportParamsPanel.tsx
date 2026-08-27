"use client";

import { PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from "lucide-react";

import { CustomerPicker } from "@/components/CustomerPicker";
import { DateRangeField, type DateRange } from "@/components/DateRangeField";
import { Button, Checkbox, Field, Input, Select } from "@/components/ui";
import type { ReportFilters, ReportSortOption, ReportView } from "@/lib/reports";
import type { Customer } from "@/types/api";

/**
 * Report parameter panel — the from/to/customer/invoice filters that most data-bound reports
 * accept, shown as a static column to the left of the report preview rather than a popover.
 *
 * A popover (the earlier `ReportParamsPopup`) hid the current filters between edits and had to
 * fight the report iframe for stacking/positioning. A permanent panel keeps the options visible
 * on every report screen, at the cost of a column of width — offset by making it collapsible, so
 * a report that's already dialled in can get the full width back.
 */

export interface ReportParamsValue {
  from: string;
  to: string;
  customer: Customer | null;
  invoiceNo: string;
  /** Empty string means "report's default order" — only meaningful when sortOptions is set. */
  sortBy: string;
  /** Only meaningful when detailToggleLabel is set. */
  detail: boolean;
}

export const EMPTY_REPORT_PARAMS: ReportParamsValue = {
  from: "",
  to: "",
  customer: null,
  invoiceNo: "",
  sortBy: "",
  detail: false,
};

function activeCount(value: ReportParamsValue): number {
  let n = 0;
  if (value.from || value.to) n += 1;
  if (value.customer) n += 1;
  if (value.invoiceNo.trim()) n += 1;
  return n;
}

export function ReportParamsPanel({
  filters,
  value,
  onChange,
  bound,
  onGenerate,
  open,
  onOpenChange,
  sortOptions,
  detailToggleLabel,
}: {
  filters: ReportFilters;
  value: ReportParamsValue;
  onChange: (value: ReportParamsValue) => void;
  bound: boolean;
  onGenerate: (view: ReportView) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Offers a "Sort by" dropdown when set — see ReportMeta.sortOptions for why this is opt-in. */
  sortOptions?: ReportSortOption[];
  /** Offers a "Show detail" checkbox when set — see ReportMeta.detailToggleLabel. */
  detailToggleLabel?: string;
}) {
  const hasAnyFilter = Boolean(
    filters.dates ||
      filters.custId ||
      filters.invoiceNo ||
      (sortOptions && sortOptions.length > 0) ||
      detailToggleLabel,
  );
  const active = activeCount(value);

  const clearAll = () => onChange(EMPTY_REPORT_PARAMS);

  // A report with no filters at all (rare — most bound reports take at least a date range)
  // has nothing for this panel to offer, so it doesn't render itself in that case.
  if (!hasAnyFilter) return null;

  if (!open) {
    return (
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Show report options"
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
            active > 0
              ? "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100"
              : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
          }`}
        >
          <PanelLeftOpen className="size-3.5" />
          {active > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-semibold text-oncolor">
              {active}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="size-3.5" />
          Report options
          {active > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-semibold text-oncolor">
              {active}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Hide report options"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {filters.dates && (
        <Field label="Date range">
          <DateRangeField
            value={{ from: value.from, to: value.to }}
            onChange={(range: DateRange) => onChange({ ...value, ...range })}
          />
        </Field>
      )}

      {filters.custId && (
        <Field label="Customer" hint="Leave blank for all customers.">
          <CustomerPicker
            value={value.customer}
            onChange={(customer) => onChange({ ...value, customer })}
          />
        </Field>
      )}

      {filters.invoiceNo && (
        <Field label="Invoice no." hint="Optional — exact match.">
          <Input
            value={value.invoiceNo}
            onChange={(e) => onChange({ ...value, invoiceNo: e.target.value })}
            placeholder="e.g. 100482"
          />
        </Field>
      )}

      {sortOptions && sortOptions.length > 0 && (
        <Field label="Sort by">
          <Select
            value={value.sortBy || sortOptions[0].value}
            onChange={(e) => onChange({ ...value, sortBy: e.target.value })}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {detailToggleLabel && (
        <Checkbox
          label={detailToggleLabel}
          checked={value.detail}
          onChange={(e) => onChange({ ...value, detail: e.target.checked })}
        />
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="flex flex-col gap-2">
          {bound && (
            <Button size="sm" onClick={() => onGenerate("layout")}>
              Layout only
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => onGenerate(bound ? "html" : "layout")}>
            {bound ? "Generate" : "Generate preview"}
          </Button>
        </div>
        <Button size="sm" onClick={clearAll} disabled={active === 0} className="w-full">
          Clear
        </Button>
      </div>
    </div>
  );
}
