"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ResultCapNotice } from "@/components/ui";
import { customers } from "@/lib/endpoints";
import { text } from "@/lib/format";
import type { Customer } from "@/types/api";

/**
 * Replaces GetCust.Frm, which was a modal grid opened with F2 or the "..." button.
 *
 * The same job is done inline here: type, see matches, pick one. The API caps results at
 * 100, so the count is shown when the list is full to signal that refining the search
 * will help.
 */
export function CustomerPicker({
  value,
  onChange,
  placeholder = "Search account number or name…",
  autoFocus,
  disableF2,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * Suppresses the window-level F2 shortcut. Set this where more than one picker is on
   * screen at once, so a single F2 handler on the page can decide which field to jump to
   * rather than every picker reacting to the same keystroke.
   */
  disableF2?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focusPending, setFocusPending] = useState(false);

  const debounced = useDebounced(query, 250);

  const { data, isFetching } = useQuery({
    queryKey: ["customers", "search", debounced],
    queryFn: () => customers.search({ search: debounced || undefined }),
    enabled: open,
  });

  const results = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => setHighlight(0), [debounced]);

  // Once a selected customer is cleared (via F2), the search input mounts fresh on the
  // next render — focus it then, rather than racing the DOM update.
  useEffect(() => {
    if (focusPending && !value) {
      inputRef.current?.focus();
      setFocusPending(false);
    }
  }, [focusPending, value]);

  const select = (customer: Customer) => {
    onChange(customer);
    setQuery("");
    setOpen(false);
  };

  /**
   * F2 replicates the VB6 shortcut that opened GetCust.Frm from the customer field.
   * Bound at the window level (like Modal's Escape handler) rather than to a specific
   * element, so it works regardless of what currently has focus on the page — invoice.Frm
   * wired the same shortcut onto ~11 different controls, so treating it as page-wide here
   * mirrors the original intent rather than a narrower one-control binding.
   */
  useEffect(() => {
    if (disableF2) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "F2") return;
      event.preventDefault();
      if (value) {
        onChange(null);
        setFocusPending(true);
      } else {
        inputRef.current?.focus();
      }
      setOpen(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [value, onChange, disableF2]);

  if (value) {
    return (
      <div
        title="Press F2 to search for a different customer"
        className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-sm ring-1 ring-inset ring-slate-300"
      >
        <span className="min-w-0 truncate">
          <span className="font-medium text-slate-900">{text(value.accountNo)}</span>
          <span className="text-slate-500"> — {text(value.title)}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-xs font-medium text-sky-700 hover:text-sky-900"
        >
          Change
        </button>
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
          className="block w-full rounded-md border-0 bg-white py-1.5 pl-8 pr-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600"
        />
      </div>

      {open && (
        <div
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>
          )}

          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">No matching customers.</p>
          )}

          {results.map((customer, index) => (
            <button
              key={customer.uniqueId}
              type="button"
              onMouseEnter={() => setHighlight(index)}
              // Touch: select on pointerup so a tap works even where iOS Safari
              // suppresses the click after the panel's mousedown preventDefault
              // (which is what keeps the search input focused — no blur, no reflow).
              onPointerUp={(event) => {
                if (event.pointerType !== "mouse") select(customer);
              }}
              onClick={() => select(customer)}
              className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                index === highlight ? "bg-sky-50" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-900">
                  {text(customer.accountNo)}
                </span>
                <span className="ml-2 text-slate-600">{text(customer.title)}</span>
              </span>
              {customer.creditStatus?.trim() && (
                <span className="shrink-0 text-xs text-amber-700">
                  {customer.creditStatus}
                </span>
              )}
            </button>
          ))}

          {results.length === 100 && (
            <ResultCapNotice cap={100} noun="matches" dense />
          )}
        </div>
      )}
    </div>
  );
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
