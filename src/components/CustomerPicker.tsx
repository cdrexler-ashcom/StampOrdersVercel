"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => setHighlight(0), [debounced]);

  const select = (customer: Customer) => {
    onChange(customer);
    setQuery("");
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-sm ring-1 ring-inset ring-slate-300">
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
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200">
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
            <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">
              Showing the first 100 matches. Refine the search to narrow them.
            </p>
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
