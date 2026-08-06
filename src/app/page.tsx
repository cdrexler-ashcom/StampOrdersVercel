"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  FileText,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { deposits, invoices, orders, tracking } from "@/lib/endpoints";
import { date, money, text } from "@/lib/format";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";

/**
 * Replaces Form1 — the button wall the legacy application opened with.
 *
 * The buttons themselves carried no information: you had to open a screen to find out
 * whether there was anything in it. Each tile here answers that question first, then
 * offers the same navigation.
 */
export default function DashboardPage() {
  const liveOrders = useQuery({ queryKey: ["orders", {}], queryFn: () => orders.list() });
  const staged = useQuery({ queryKey: ["invoices", "staged"], queryFn: () => invoices.staged() });
  const pendingTracking = useQuery({
    queryKey: ["tracking", "pending"],
    queryFn: () => tracking.pending(),
  });
  const awaitingNotification = useQuery({
    queryKey: ["tracking", "awaiting-notification"],
    queryFn: () => tracking.awaitingNotification(),
  });
  const bankable = useQuery({
    queryKey: ["deposits", "bankable"],
    queryFn: () => deposits.bankable(),
  });

  const bankableTotal = (bankable.data ?? []).reduce(
    (sum, receipt) => sum + (receipt.amount ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where work is sitting right now."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          href="/orders"
          icon={ClipboardList}
          label="Live orders"
          value={liveOrders.data?.length}
          loading={liveOrders.isLoading}
          hint="Entered but not yet invoiced"
        />
        <Tile
          href="/invoicing"
          icon={FileText}
          label="Staged for invoicing"
          value={staged.data?.length}
          loading={staged.isLoading}
          hint={
            (staged.data?.length ?? 0) > 0
              ? "Awaiting posting"
              : "Nothing staged"
          }
          tone={(staged.data?.length ?? 0) > 0 ? "amber" : undefined}
        />
        <Tile
          href="/despatch"
          icon={Truck}
          label="Awaiting tracking"
          value={pendingTracking.data?.length}
          loading={pendingTracking.isLoading}
          hint={`${awaitingNotification.data?.length ?? 0} ready to notify`}
        />
        <Tile
          href="/deposits"
          icon={Banknote}
          label="Receipts to bank"
          value={bankable.data?.length}
          loading={bankable.isLoading}
          hint={bankable.data ? money(bankableTotal) : undefined}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent orders"
            description="The most recent live orders, newest first."
            actions={
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                All orders <ArrowRight className="size-3" />
              </Link>
            }
          />

          {liveOrders.isLoading ? (
            <Spinner />
          ) : (liveOrders.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No live orders"
              description="Orders appear here between entry and invoicing."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th>Run</Th>
                  <Th>Bin</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveOrders.data?.slice(0, 8).map((order) => (
                  <tr key={order.orderId} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-medium text-slate-900">
                        {order.orderId}
                      </span>
                      {order.credit && (
                        <Badge tone="violet" className="ml-2">
                          Credit
                        </Badge>
                      )}
                    </Td>
                    <Td>{text(order.custTitle)}</Td>
                    <Td>{date(order.date)}</Td>
                    <Td>{text(order.runNo)}</Td>
                    <Td>{order.binNo ?? "—"}</Td>
                    <Td align="right">
                      <Link
                        href={`/orders/${order.orderId}`}
                        className="text-xs font-medium text-sky-700 hover:text-sky-900"
                      >
                        Open
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Despatch queue"
            description="Invoices still without a consignment number."
            actions={
              <Link
                href="/despatch"
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                Open <ArrowRight className="size-3" />
              </Link>
            }
          />

          {pendingTracking.isLoading ? (
            <Spinner />
          ) : (pendingTracking.data?.length ?? 0) === 0 ? (
            <EmptyState title="Nothing awaiting tracking" />
          ) : (
            <CardBody className="space-y-2 p-3">
              {pendingTracking.data?.slice(0, 6).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-baseline justify-between gap-3 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-slate-900">
                      {text(invoice.invoiceNo)}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      — {text(invoice.custTitle)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {date(invoice.invoiceDate)}
                  </span>
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
  value,
  loading,
  hint,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  loading?: boolean;
  hint?: string;
  tone?: "amber";
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-300"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className="size-4 text-slate-400 group-hover:text-sky-600" />
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          tone === "amber" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {loading ? "—" : (value ?? 0)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Link>
  );
}
