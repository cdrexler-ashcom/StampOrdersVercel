"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { reference } from "@/lib/endpoints";
import { money, text } from "@/lib/format";

/**
 * Product reference.
 *
 * Replaces GetProd.frm, PriceList.frm and prcLookup.frm as a browsable list. Products
 * live in Soset, so this is read-only; the five unit price columns are shown together
 * rather than one at a time, which is what the price-code lookup form did.
 */
export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["products", "search", debounced],
    queryFn: () => reference.products(debounced || undefined),
  });

  const rows = (query.data ?? []).slice(0, 200);

  return (
    <>
      <PageHeader
        title="Products"
        description="Read from Soset. Unit prices 1 to 5 correspond to customer price codes."
      />

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            autoFocus
            placeholder="Product code or name…"
            onChange={(event) => setSearch(event.target.value)}
            className="block w-full rounded-md border-0 bg-white py-2 pl-8 pr-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600"
          />
        </div>
      </div>

      {query.isError && (
        <div className="mb-4">
          <Notice tone="red" title="Soset could not be read">
            {(query.error as Error).message}
          </Notice>
        </div>
      )}

      <Card>
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th align="right">Price 1</Th>
                <Th align="right">Price 2</Th>
                <Th align="right">Price 3</Th>
                <Th align="right">Price 4</Th>
                <Th align="right">Price 5</Th>
                <Th>Cut (W×H)</Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((product) => (
                <tr key={product.prodId} className="hover:bg-slate-50">
                  <Td>
                    <span className="font-medium text-slate-900">
                      {product.prodId}
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-64 truncate">
                      {text(product.prodName)}
                    </span>
                  </Td>
                  <Td align="right">{money(product.unitPrice1)}</Td>
                  <Td align="right">{money(product.unitPrice2)}</Td>
                  <Td align="right">{money(product.unitPrice3)}</Td>
                  <Td align="right">{money(product.unitPrice4)}</Td>
                  <Td align="right">{money(product.unitPrice5)}</Td>
                  <Td>
                    {product.cutWidth != null && product.cutHeight != null
                      ? `${product.cutWidth} × ${product.cutHeight}`
                      : "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {product.suppressesStampJob && (
                        <Badge tone="amber">NOSTAMP</Badge>
                      )}
                      {product.typeset?.trim() && (
                        <Badge tone="sky">Typeset</Badge>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) > 200 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing 200 of {query.data?.length} products. Refine the search to narrow
            them.
          </p>
        )}
      </Card>
    </>
  );
}
