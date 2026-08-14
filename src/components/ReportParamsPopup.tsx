"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CustomerPicker } from "@/components/CustomerPicker";
import { DateRangeField, type DateRange } from "@/components/DateRangeField";
import { Button, Field, Input } from "@/components/ui";
import type { ReportFilters, ReportView } from "@/lib/reports";
import type { Customer } from "@/types/api";

/**
 * Report parameter popup — one reusable control for the from/to/customer/invoice filters
 * that most data-bound reports accept, replacing what used to be raw text boxes wired up
 * per report page.
 *
 * Built as a popover rather than a fixed sidebar (which is what `[name]/page.tsx` had
 * before) for two reasons: it gives every report's preview the full width of the page
 * instead of losing a permanent 18rem strip to a panel most of the time sits on its
 * defaults, and it means adding a picker with its own dropdown — CustomerPicker, or the
 * date range presets — doesn't fight for space in a cramped column.
 *
 * Follows the same portal + outside-click + Escape pattern as `ColumnFilterMenu`, which
 * solves the same "popover clipped by an ancestor's overflow" problem this would otherwise
 * hit sitting next to `ReportFrame`'s iframe.
 */

export interface ReportParamsValue {
  from: string;
  to: string;
  customer: Customer | null;
  invoiceNo: string;
}

export const EMPTY_REPORT_PARAMS: ReportParamsValue = {
  from: "",
  to: "",
  customer: null,
  invoiceNo: "",
};

function activeCount(value: ReportParamsValue): number {
  let n = 0;
  if (value.from || value.to) n += 1;
  if (value.customer) n += 1;
  if (value.invoiceNo.trim()) n += 1;
  return n;
}

export function ReportParamsPopup({
  filters,
  value,
  onChange,
  bound,
  onGenerate,
}: {
  filters: ReportFilters;
  value: ReportParamsValue;
  onChange: (value: ReportParamsValue) => void;
  bound: boolean;
  onGenerate: (view: ReportView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasAnyFilter = Boolean(filters.dates || filters.custId || filters.invoiceNo);
  const active = activeCount(value);

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 6, left: rect.left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const generate = (view: ReportView) => {
    onGenerate(view);
    setOpen(false);
  };

  const clearAll = () => onChange(EMPTY_REPORT_PARAMS);

  // A report with no filters at all (rare — most bound reports take at least a date range)
  // has nothing for this popup to offer beyond the buttons already on the page, so it
  // doesn't render itself in that case rather than show an empty panel.
  if (!hasAnyFilter) return null;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
          active > 0
            ? "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100"
            : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
        }`}
      >
        <SlidersHorizontal className="size-3.5" />
        Report options
        {active > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-semibold text-white">
            {active}
          </span>
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 w-80 space-y-4 rounded-lg bg-white p-4 shadow-lg ring-1 ring-slate-200"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Report options</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="size-4" />
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

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" onClick={clearAll} disabled={active === 0}>
                Clear
              </Button>
              <div className="flex gap-2">
                {bound && (
                  <Button size="sm" onClick={() => generate("layout")}>
                    Layout only
                  </Button>
                )}
                <Button size="sm" variant="primary" onClick={() => generate(bound ? "html" : "layout")}>
                  {bound ? "Generate" : "Generate preview"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
