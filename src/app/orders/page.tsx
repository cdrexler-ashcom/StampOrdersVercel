"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { CustomerPicker } from "@/components/CustomerPicker";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  GridToolbar,
  Input,
  PageHeader,
  ResultCapNotice,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { orders } from "@/lib/endpoints";
import { date, money, text } from "@/lib/format";
import { setOrderListContext } from "@/lib/orderListContext";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useGridState } from "@/lib/useGridState";
import { useRowLink } from "@/lib/useRowLink";
import type { Customer, OrderListItem } from "@/types/api";

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
  // Customer/run-number filters and sort are all remembered in sessionStorage (see
  // useGridState) so they survive following a row link to /orders/{id} and hitting Back —
  // otherwise the list page remounts from scratch and reverts to its defaults.
  const [customer, setCustomer] = useGridState<Customer | null>("orders:customer", null);
  const [runNo, setRunNo] = useGridState("orders:runNo", "");

  // Sorting is server-side (matching customers/products): starts unsorted until a header
  // is clicked, then the active column/direction is sent as sortBy/sortDir so the API can
  // sort the full matching set before applying whatever cap it returns.
  const [sort, setSort] = useGridState<{ key: SortKey; direction: SortDirection } | null>(
    "orders:sort",
    null,
  );

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  // Column filter selections, remembered alongside sort (see useGridState). custTitle,
  // runNo, binNo and orderId all filter server-side (see OrderEndpoints.cs), applied
  // before Take(200) — a filter narrows the full matching set correctly, not just the
  // loaded page. Date stays client-side: its filter popup shows a display-formatted
  // string (date()), not the raw column, and matching that server-side would mean
  // re-implementing the formatting in C# — same trade-off as invoice date on the
  // Invoices page.
  const [filterSelected, setFilterSelected] = useGridState<
    Partial<Record<"custTitle" | "date" | "runNo" | "binNo" | "orderId", string[]>>
  >("orders:filters", {});

  const query = useQuery({
    queryKey: [
      "orders",
      { custId: customer?.uniqueId, runNo },
      sort,
      filterSelected.custTitle,
      filterSelected.runNo,
      filterSelected.binNo,
      filterSelected.orderId,
    ],
    queryFn: () =>
      orders.list({
        custId: customer?.uniqueId,
        runNo: runNo.trim() || undefined,
        sortBy: sort?.key,
        sortDir: sort?.direction,
        custTitle: filterSelected.custTitle,
        runNos: filterSelected.runNo,
        binNo: filterSelected.binNo,
        orderId: filterSelected.orderId,
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

  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(
    query.data,
    {
      custTitle: (o: OrderListItem) => o.custTitle?.trim() ?? "",
      date: (o: OrderListItem) => (o.date ? date(o.date) : ""),
      runNo: (o: OrderListItem) => o.runNo?.trim() ?? "",
      binNo: (o: OrderListItem) => (o.binNo != null ? String(o.binNo) : ""),
      orderId: (o: OrderListItem) => o.orderId.toString(),
    },
    { selected: filterSelected, onChange: setFilterSelected },
  );

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

      <GridToolbar
        onClearSort={sort ? () => setSort(null) : undefined}
        onClearFilters={isFiltered ? clearAll : undefined}
      />

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
                <Th {...th("orderId")} filter={colFilter("orderId")}>
                  Order
                </Th>
                <Th {...th("custTitle")} filter={colFilter("custTitle")}>
                  Customer
                </Th>
                <Th {...th("date")} filter={colFilter("date")}>
                  Date
                </Th>
                <Th {...th("runNo")} filter={colFilter("runNo")}>
                  Run
                </Th>
                <Th {...th("binNo")} filter={colFilter("binNo")}>
                  Bin
                </Th>
                <Th align="right">Lines</Th>
                <Th align="right">Value</Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8">
                    <EmptyState
                      title="No orders match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered?.map((order) => (
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
                ))
              )}
            </tbody>
          </Table>
        )}

        {(query.data?.length ?? 0) === 200 && (
          <ResultCapNotice
            cap={200}
            noun="orders"
            qualifier={
              (filterSelected.date?.length ?? 0) > 0
                ? ", before the date filter is applied"
                : undefined
            }
          >
            Filter by customer or run number to narrow the list.
          </ResultCapNotice>
        )}
      </Card>
    </>
  );
}
