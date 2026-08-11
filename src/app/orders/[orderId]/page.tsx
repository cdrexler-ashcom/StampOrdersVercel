"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AddLineDialog } from "@/components/AddLineDialog";
import { CreditCheckPanel } from "@/components/CreditCheckPanel";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailRow,
  EmptyState,
  ErrorState,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { customers, orders, soset } from "@/lib/endpoints";
import {
  addressLines,
  date,
  freightSuggestionLabel,
  money,
  qty as formatQty,
  text,
} from "@/lib/format";
import { getOrderListContext } from "@/lib/orderListContext";

/**
 * Order workspace — the web replacement for Form2 (invoice.Frm), the largest form in the
 * legacy application at roughly 2,500 lines and 80 controls.
 *
 * Consolidated in from elsewhere:
 *  - addLine.frm / UpdLine.Frm    -> AddLineDialog
 *  - GetCust.Frm / GetProd.frm    -> inline pickers
 *  - frmOdueMsg1 / frmOdueMsg2    -> CreditCheckPanel, shown rather than interrupting
 *  - StampStatus.frm (per job)    -> the Soset column in the lines table
 *  - "Go To Soset" button         -> the same column, without leaving the browser
 *
 * Freight is presented as the API reports it. OrderTotalsResult.FreightSuggestion carries
 * the recommendation the legacy form raised as a message box on unload.
 */
export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [addLineOpen, setAddLineOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The order sequence from wherever the Orders list last stood — read once on mount
  // rather than per-orderId, so Previous/Next keep stepping through the same set you
  // opened this record from rather than silently re-adopting whatever the list shows now.
  const [listContext, setListContext] = useState<number[] | null>(null);
  useEffect(() => {
    setListContext(getOrderListContext());
  }, []);

  const contextIndex = listContext ? listContext.indexOf(orderId) : -1;
  const prevOrderId =
    listContext && contextIndex > 0 ? listContext[contextIndex - 1] : null;
  const nextOrderId =
    listContext && contextIndex >= 0 && contextIndex < listContext.length - 1
      ? listContext[contextIndex + 1]
      : null;
  const positionLabel =
    listContext && contextIndex >= 0
      ? `${contextIndex + 1} of ${listContext.length}`
      : null;

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orders.get(orderId),
    enabled: Number.isFinite(orderId),
  });

  const totalsQuery = useQuery({
    queryKey: ["order-totals", orderId],
    queryFn: () => orders.totals(orderId),
    enabled: Number.isFinite(orderId),
  });

  const order = orderQuery.data;

  const customerQuery = useQuery({
    queryKey: ["customer", order?.custId],
    queryFn: () => customers.get(order!.custId!),
    enabled: Boolean(order?.custId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orders.remove(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push("/orders");
    },
  });

  if (orderQuery.isLoading) return <Spinner label="Loading order…" />;
  if (orderQuery.isError) return <ErrorState error={orderQuery.error} />;
  if (!order) return <EmptyState title="Order not found" />;

  const totals = totalsQuery.data;
  const customer = customerQuery.data ?? null;

  const lines = order.lines ?? [];

  const deliveryAddress = addressLines(
    order.delName,
    order.delAdr0,
    order.delAdr1,
    order.delAdr2,
    order.delAdr3,
  );

  return (
    <>
      <PageHeader
        title={`Order ${order.orderId}`}
        description={text(order.custTitle, "Customer not set")}
        actions={
          <>
            {contextIndex >= 0 && (
              <div className="mr-1 flex items-center gap-1 border-r border-slate-200 pr-3">
                {prevOrderId ? (
                  <Link href={`/orders/${prevOrderId}`}>
                    <Button variant="ghost" size="sm" title="Previous order in this list">
                      <ChevronLeft className="size-3.5" />
                      Previous
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    title="No previous order in this list"
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                )}

                {positionLabel && (
                  <span className="px-1 text-xs text-slate-500">{positionLabel}</span>
                )}

                {nextOrderId ? (
                  <Link href={`/orders/${nextOrderId}`}>
                    <Button variant="ghost" size="sm" title="Next order in this list">
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" size="sm" disabled title="No next order in this list">
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Link href="/invoicing">
              <Button>Invoice run</Button>
            </Link>
            <Button variant="primary" onClick={() => setAddLineOpen(true)}>
              <Plus className="size-3.5" />
              Add line
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {order.credit && <Badge tone="violet">Credit note</Badge>}
        {order.paid && <Badge tone="green">Marked paid</Badge>}
        {order.freightApplies && <Badge tone="slate">Freight applies</Badge>}
        {order.direct && <Badge tone="sky">Delivery docket</Badge>}
        {order.binNo != null && <Badge tone="slate">Bin {order.binNo}</Badge>}
        {order.runNo?.trim() && <Badge tone="slate">Run {order.runNo}</Badge>}
      </div>

      {totals?.freightSuggestion && totals.freightSuggestion !== "NoChange" && (
        <div className="mb-4">
          <Notice tone="amber" title={freightSuggestionLabel[totals.freightSuggestion]}>
            The order total is {money(totals.grossAmount)} against a delivery threshold of{" "}
            {money(totals.deliveryThreshold)}.
          </Notice>
        </div>
      )}

      {order.note?.trim() && (
        <div className="mb-4">
          <Notice tone="sky" title="Invoice note">
            {order.note}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Lines"
              description={`${lines.length} line${
                lines.length === 1 ? "" : "s"
              }`}
              actions={
                <Button size="sm" onClick={() => setAddLineOpen(true)}>
                  <Plus className="size-3" />
                  Add
                </Button>
              }
            />

            {lines.length === 0 ? (
              <EmptyState
                title="No lines yet"
                description="Add the first line to price this order."
                action={
                  <Button variant="primary" onClick={() => setAddLineOpen(true)}>
                    Add line
                  </Button>
                }
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Job</Th>
                    <Th>Product</Th>
                    <Th>Details</Th>
                    <Th>Colour</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Price</Th>
                    <Th align="right">Disc</Th>
                    <Th align="right">GST</Th>
                    <Th align="right">Total</Th>
                    <Th>Soset</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => (
                    <tr key={`${line.orderId}-${line.jobNo}`} className="hover:bg-slate-50">
                      <Td>
                        <span className="font-medium text-slate-900">{line.jobNo}</span>
                        {line.custOrderNo?.trim() && (
                          <span className="block text-xs text-slate-500">
                            {line.custOrderNo}
                          </span>
                        )}
                      </Td>
                      <Td>{line.product}</Td>
                      <Td>
                        <span className="block max-w-48 truncate">
                          {text(line.details)}
                        </span>
                        {line.stampLabel && (
                          <Badge tone="slate" className="mt-0.5">
                            Label {line.stampLabelCode?.trim() || "—"}
                          </Badge>
                        )}
                      </Td>
                      <Td>{text(line.colourDesc ?? line.colour)}</Td>
                      <Td align="right">{formatQty(line.qty)}</Td>
                      <Td align="right">{money(line.price)}</Td>
                      <Td align="right">
                        {line.discPct ? `${line.discPct}%` : "—"}
                      </Td>
                      <Td align="right">{money(line.gst)}</Td>
                      <Td align="right" className="font-medium">
                        {money(line.totalPrice)}
                      </Td>
                      <Td>
                        <StampCell jobNo={line.jobNo} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Totals" />
            <CardBody>
              {totalsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Calculating…</p>
              ) : totals ? (
                <dl className="divide-y divide-slate-100">
                  <DetailRow label="Net">{money(totals.netAmount)}</DetailRow>
                  <DetailRow label="GST">{money(totals.gstAmount)}</DetailRow>
                  <DetailRow label="Total">
                    <span className="text-base">{money(totals.grossAmount)}</span>
                  </DetailRow>
                  <DetailRow label="Delivery threshold">
                    {money(totals.deliveryThreshold)}
                  </DetailRow>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Totals unavailable.</p>
              )}
            </CardBody>
          </Card>

          {order.custId != null && (
            <CreditCheckPanel custId={order.custId} />
          )}

          <Card>
            <CardHeader title="Order" />
            <CardBody>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Order date">{date(order.date)}</DetailRow>
                <DetailRow label="Run number">{text(order.runNo)}</DetailRow>
                <DetailRow label="Bin">{order.binNo ?? "—"}</DetailRow>
                <DetailRow label="Price code">{order.priceCode ?? "—"}</DetailRow>
                <DetailRow label="Delivery code">{text(order.delCode)}</DetailRow>
                <DetailRow label="Phone">{text(order.phoneNo)}</DetailRow>
                <DetailRow label="Email">{text(order.email)}</DetailRow>
                {order.credit && (
                  <DetailRow label="Applied to">
                    {text(order.invoiceApplied)}
                  </DetailRow>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Addresses" />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Invoice</p>
                {addressLines(
                  order.custTitle,
                  order.invAdr1,
                  order.invAdr2,
                  order.invAdr3,
                  order.invPostCode,
                ).map((line, index) => (
                  <p key={index} className="text-slate-700">
                    {line}
                  </p>
                ))}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Delivery</p>
                {deliveryAddress.length > 0 ? (
                  deliveryAddress.map((line, index) => (
                    <p key={index} className="text-slate-700">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500">Same as invoice</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <AddLineDialog
        open={addLineOpen}
        onClose={() => setAddLineOpen(false)}
        orderId={orderId}
        customer={customer}
        defaultDiscountPct={customer?.discPct ?? 0}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete order ${order.orderId}?`}
        description="The order is removed and its bin released. This cannot be undone."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete order
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Notice tone="red" title="Order was not deleted">
            {(deleteMutation.error as Error).message}
          </Notice>
        ) : (
          <p className="text-sm text-slate-600">
            {lines.length} line
            {lines.length === 1 ? "" : "s"} will be removed with it.
          </p>
        )}
      </Modal>
    </>
  );
}

/**
 * Whether Soset holds a stamp job for this line.
 *
 * The legacy answer to "did this reach Soset?" was to press "Go To Soset" and look. The
 * lookup is per line and cheap, so it is shown in place. A 409 means writes are disabled
 * in configuration, which is a different answer from "not found".
 */
function StampCell({ jobNo }: { jobNo: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["soset", "stamp", jobNo],
    queryFn: () => soset.stamp(jobNo),
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) return <span className="text-xs text-slate-400">…</span>;

  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return <Badge tone="slate">Not in Soset</Badge>;
    if (status === 502) return <Badge tone="red">Unreachable</Badge>;
    return <Badge tone="slate">—</Badge>;
  }

  return (
    <Badge tone="green" className="whitespace-nowrap">
      {text(data?.orderNo, "Present")}
    </Badge>
  );
}
