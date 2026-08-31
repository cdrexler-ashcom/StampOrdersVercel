"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { invoiceStates } from "@/lib/endpoints";
import { text } from "@/lib/format";
import type { StateInvoice } from "@/types/api";

/**
 * Picks the invoicing entity a customer or order is billed under — the Companies list
 * maintained at /settings/invoice-states (previously "Invoice states").
 *
 * The field was free text in VB6 and still is in the API: customers point at an entity by
 * its `state` key with nothing enforcing the link. This narrows entry to the keys that
 * actually exist, while still rendering a legacy value that no longer matches any entity so
 * an old record stays readable.
 *
 * The list is one row per trading entity, so it is fetched whole and filtered here rather
 * than hitting a search endpoint. No F2 shortcut — selection is mouse/keyboard inline only.
 */
export function InvoiceEntityPicker({
  value,
  onChange,
  placeholder = "Search company code or name…",
  autoFocus,
  disabled,
}: {
  /** The selected entity's `state` key, or null/"" when unset. */
  value: string | null;
  onChange: (state: string | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shares the cache key with the settings screen so editing one refreshes the other.
  const { data, isFetching } = useQuery({
    queryKey: ["invoice-states"],
    queryFn: () => invoiceStates.list(),
  });

  const all = useMemo(() => data ?? [], [data]);

  const selected = value?.trim()
    ? (all.find((e) => e.state.trim().toLowerCase() === value.trim().toLowerCase()) ?? null)
    : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) =>
      [e.state, e.name, e.suburb, e.stateCode]
        .some((field) => field?.toLowerCase().includes(q)),
    );
  }, [all, query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => setHighlight(0), [query]);

  const select = (entity: StateInvoice) => {
    onChange(entity.state);
    setQuery("");
    setOpen(false);
  };

  if (value?.trim()) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-sm ring-1 ring-inset ring-slate-300">
        <span className="min-w-0 truncate">
          <span className="font-medium text-slate-900">{value.trim()}</span>
          {selected?.name && <span className="text-slate-500"> — {selected.name}</span>}
          {!selected && !isFetching && (
            <span className="text-amber-700"> — not a known company</span>
          )}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-xs font-medium text-sky-700 hover:text-sky-900"
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (event.key === "Enter" && results[highlight]) {
              event.preventDefault();
              select(results[highlight]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="block w-full rounded-md border-0 bg-white py-1.5 pl-8 pr-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      {open && (
        <div
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {isFetching && all.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">Loading…</p>
          )}

          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">No matching companies.</p>
          )}

          {results.map((entity, index) => (
            <button
              key={entity.state}
              type="button"
              onMouseEnter={() => setHighlight(index)}
              // Touch: select on pointerup so a tap works even where iOS Safari
              // suppresses the click after the panel's mousedown preventDefault.
              onPointerUp={(event) => {
                if (event.pointerType !== "mouse") select(entity);
              }}
              onClick={() => select(entity)}
              className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                index === highlight ? "bg-sky-50" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-900">{entity.state}</span>
                <span className="ml-2 text-slate-600">{text(entity.name)}</span>
              </span>
              {entity.suburb?.trim() && (
                <span className="shrink-0 text-xs text-slate-500">{entity.suburb}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
