"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { reference } from "@/lib/endpoints";
import { text } from "@/lib/format";
import type { SosetProduct } from "@/types/api";

/**
 * Replaces GetProd.frm — the F2 product grid.
 *
 * Products come from Soset, so a product carrying ScreenInfo = "NOSTAMP" will not
 * generate a stamp job. That was invisible in the legacy form and is flagged here at the
 * point of selection, because it changes what happens downstream.
 */
export function ProductPicker({
  value,
  onChange,
  autoFocus,
}: {
  value: SosetProduct | null;
  onChange: (product: SosetProduct | null) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounced(query, 250);

  const { data, isFetching } = useQuery({
    queryKey: ["products", "search", debounced],
    queryFn: () => reference.products(debounced || undefined),
    enabled: open,
  });

  const results = useMemo(() => (data ?? []).slice(0, 100), [data]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => setHighlight(0), [debounced]);

  const select = (product: SosetProduct) => {
    onChange(product);
    setQuery("");
    setOpen(false);
  };

  if (value) {
    return (
      <div className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-inset ring-slate-300">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-medium text-slate-900">{value.prodId}</span>
            <span className="text-slate-500"> — {text(value.prodName)}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-xs font-medium text-sky-700 hover:text-sky-900"
          >
            Change
          </button>
        </div>
        {value.suppressesStampJob && (
          <p className="mt-1 text-xs text-amber-700">
            Marked NOSTAMP in Soset — no stamp job will be created for this line.
          </p>
        )}
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
          placeholder="Search product code or name…"
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
            <p className="px-3 py-2 text-xs text-slate-500">Searching Soset…</p>
          )}

          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">No matching products.</p>
          )}

          {results.map((product, index) => (
            <button
              key={product.prodId}
              type="button"
              onMouseEnter={() => setHighlight(index)}
              onClick={() => select(product)}
              className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                index === highlight ? "bg-sky-50" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-900">{product.prodId}</span>
                <span className="ml-2 text-slate-600">{text(product.prodName)}</span>
              </span>
              {product.suppressesStampJob && (
                <span className="shrink-0 text-xs text-amber-700">NOSTAMP</span>
              )}
            </button>
          ))}
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
