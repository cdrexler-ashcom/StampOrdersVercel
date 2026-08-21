"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CustomerPicker } from "@/components/CustomerPicker";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { orders } from "@/lib/endpoints";
import { date, money, text } from "@/lib/format";
import { setOrderListContext } from "@/lib/orderListContext";
import { useRowLink } from "@/lib/useRowLink";
import type { Customer } from "@/types/api";

/** Columns the API's GET /api/orders accepts as `sortBy`. */
type SortKey = "orderId" | "custTitle" | "date" | "runNo" | "binNo";
type SortDirection = "asc" | "desc";

/**
 * Order list.
 *
 * The legacy application had no list: Form2 opened on a record and you moved through
 * orders with Previous (F5) and Next (F6). Filtering by customer or run number replaces
 * that navigation, and matches the only two filters the API exposes.
 */
export default function OrdersPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [runNo, setRunNo] = useState("");

  // Sorting is server-side (matching customers/products): starts unsorted until a header
  // is clicked, then the active column/direction is sent as sortBy/sortDir so the API can
  // sort the full matching set before applying whatever cap it returns.
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const query = useQuery({
    queryKey: ["orders", { custId: customer?.uniqueId, runNo }, sort],
    queryFn: () =>
      orders.list({
        custId: customer?.uniqueId,
        runNo: runNo.trim() || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
      }),
  });

  // Snapshot the visible order sequence whenever it changes, so the detail page can offer
  // Previous/Next through this same filtered, sorted set.
  useEffect(() => {
    if (query.data) {
      setOrderListContext(query.data.map((order) => order.orderId));
    }
  }, [query.data]);

  const rowLink = useRowLink();

  const th = (key: SortKey) => ({
    onSort: () => toggleSort(key),
    sortDirection: sort?.key === key ? sort.direction : null,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders entered but not yet invoiced."
        actions={
          <Link href="/orders/new">
            <Button variant="primary">
              <Plus className="size-3.5" />
              New order
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
          <Field label="Customer">
            <CustomerPicker value={customer} onChange={setCustomer} />
          </Field>

          <Field label="Run number" hint="Exact match, two characters.">
            <Input
              value={runNo}
              maxLength={2}
              placeholder="e.g. 01"
              onChange={(event) => setRunNo(event.target.value)}
            />
          </Field>

          <Button
            onClick={() => {
              setCustomer(null);
              setRunNo("");
            }}
          >
            Clear
          </Button>
        </CardBody>
      </Card>

      <Card>
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No orders found"
            description="Adjust the filters, or create a new order."
            action={
              <Link href="/orders/new">
                <Button variant="primary">New order</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("orderId")}>Order</Th>
                <Th {...th("custTitle")}>Customer</Th>
                <Th {...th("date")}>Date</Th>
                <Th {...th("runNo")}>Run</Th>
                <Th {...th("binNo")}>Bin</Th>
                <Th align="right">Lines</Th>
                <Th align="right">Value</Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data?.map((order) => (
                <tr key={order.orderId} {...rowLink(`/orders/${order.orderId}`)}>
                  <Td>
                    <span className="font-medium text-slate-900">
                      {order.orderId}
                    </span>
                  </Td>
                  <Td>
                    <span className="block truncate">{text(order.custTitle)}</span>
                  </Td>
                  <Td>{date(order.date)}</Td>
                  <Td>{text(order.runNo)}</Td>
                  <Td>{order.binNo ?? "—"}</Td>
                  <Td align="right" className="tabular-nums">
                    {order.lineCount}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {order.lineCount > 0 ? money(order.grossAmount) : "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {order.credit && <Badge tone="violet">Credit</Badge>}
                      {order.freightApplies && <Badge tone="slate">Freight</Badge>}
                      {order.direct && <Badge tone="sky">Docket</Badge>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 200 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the first 200 orders. Filter by customer or run number to narrow the
            list.
          </p>
        )}
      </Card>
    </>
  );
}
