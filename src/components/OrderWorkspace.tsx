"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AddLineDialog } from "@/components/AddLineDialog";
import { CreditCheckPanel } from "@/components/CreditCheckPanel";
import { CustomerPicker } from "@/components/CustomerPicker";
import { EditLineDialog } from "@/components/EditLineDialog";
import { EditOrderDialog } from "@/components/EditOrderDialog";
import { ExistingOpenOrderDialog } from "@/components/ExistingOpenOrderDialog";
import { JobCardIndicator, JobCardPanel } from "@/components/JobCardPanel";
import { ProofDialog } from "@/components/ProofDialog";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";
import { customers, orders, proofs, soset } from "@/lib/endpoints";
import {
  addressLines,
  freightSuggestionLabel,
  money,
  qty as formatQty,
  text,
  todayInput,
} from "@/lib/format";
import { getOrderListContext } from "@/lib/orderListContext";
import type {
  CreateOrderRequest,
  Customer,
  OrderHeader,
  OrderLine,
  UpdateOrderRequest,
} from "@/types/api";

/**
 * OrderWorkspace — the single-surface replacement for the legacy Form2 (invoice.Frm).
 *
 * There is ONE layout, rendered identically whether the order exists yet or not. Nothing
 * moves when an order is created: the same PageHeader, the same Order / Addresses /
 * Totals cards, and the same Lines card are always in the same place. Only the individual
 * controls change state — a create-mode input becomes an auto-saving inline field — so the
 * screen simply "comes to life" in place, the way the VB6 form did once you had an order
 * number.
 *
 *  - No `initialOrderId`  -> create mode. Pick a customer, adjust the header, press
 *    "Start order". On success we seed the cache and swap the URL to /orders/{id} with
 *    history.replaceState (no route navigation), so the tree stays mounted.
 *  - With an order        -> header fields edit in place and auto-save on blur; lines are
 *    added / edited through the same in-place dialogs the legacy pop-ups became.
 */
export function OrderWorkspace({ initialOrderId }: { initialOrderId?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [orderId, setOrderId] = useState<number | null>(initialOrderId ?? null);
  const isCreate = orderId === null;

  // ----- create-mode form state -------------------------------------------------------
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newOrderDate, setNewOrderDate] = useState("");
  const [newRunNo, setNewRunNo] = useState("");
  const [newDelCode, setNewDelCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newIsCredit, setNewIsCredit] = useState(false);
  const [newInvoiceApplied, setNewInvoiceApplied] = useState("Open");
  const [newDelName, setNewDelName] = useState("");
  const [newDelAdr0, setNewDelAdr0] = useState("");
  const [newDelAdr1, setNewDelAdr1] = useState("");
  const [newDelAdr2, setNewDelAdr2] = useState("");
  const [newDelAdr3, setNewDelAdr3] = useState("");

  useEffect(() => {
    if (isCreate) setNewOrderDate(todayInput());
  }, [isCreate]);

  const pickCustomer = (next: Customer | null) => {
    setCustomer(next);
    setNewRunNo(next?.runNo?.trim() ?? "");
    setNewDelCode(next?.defDelCode?.trim() ?? "");
    setNewEmail(next?.accountsEmail?.trim() ?? "");
  };

  // ----- dialog / interaction state ---------------------------------------------------
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [jobCardOpen, setJobCardOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editLine, setEditLine] = useState<OrderLine | null>(null);
  const [deleteLine, setDeleteLine] = useState<OrderLine | null>(null);
  const [proofJobNo, setProofJobNo] = useState<string | null>(null);

  // Transient "just created" banner. It fades out on its own — the operator doesn't need a
  // permanent notice once they're working the order.
  const [justCreated, setJustCreated] = useState(false);
  const [bannerLeaving, setBannerLeaving] = useState(false);
  useEffect(() => {
    if (!justCreated) return;
    const fade = setTimeout(() => setBannerLeaving(true), 4000);
    const clear = setTimeout(() => {
      setJustCreated(false);
      setBannerLeaving(false);
    }, 4600);
    return () => {
      clearTimeout(fade);
      clearTimeout(clear);
    };
  }, [justCreated]);

  // Orders-list sequence, for Previous/Next.
  const [listContext, setListContext] = useState<number[] | null>(null);
  useEffect(() => {
    setListContext(getOrderListContext());
  }, []);

  const contextIndex =
    listContext && orderId != null ? listContext.indexOf(orderId) : -1;
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

  // ----- data -------------------------------------------------------------------------
  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orders.get(orderId!),
    enabled: orderId != null,
  });

  const totalsQuery = useQuery({
    queryKey: ["order-totals", orderId],
    queryFn: () => orders.totals(orderId!),
    enabled: orderId != null,
  });

  const order = orderQuery.data;

  const customerQuery = useQuery({
    queryKey: ["customer", order?.custId],
    queryFn: () => customers.get(order!.custId!),
    enabled: Boolean(order?.custId),
  });

  // ----- create -----------------------------------------------------------------------
  const createMutation = useMutation({
    mutationFn: (body: CreateOrderRequest) => orders.create(body),
    onSuccess: (created) => {
      // Seed the cache, swap the URL without navigating, and flip into the working order in
      // place. Add line is NOT opened — the operator adds lines when they're ready.
      queryClient.setQueryData(["order", created.orderId], created);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      window.history.replaceState(null, "", `/orders/${created.orderId}`);
      setOrderId(created.orderId);
      setJustCreated(true);
      setBannerLeaving(false);
    },
  });

  const startOrder = () => {
    if (!customer) return;
    createMutation.mutate({
      custId: customer.uniqueId,
      orderDate: newOrderDate ? new Date(newOrderDate).toISOString() : null,
      runNo: newRunNo.trim() || null,
      delCode: newDelCode.trim() || null,
      email: newEmail.trim() || null,
      isCredit: newIsCredit,
      invoiceApplied: newIsCredit ? newInvoiceApplied.trim() || "Open" : null,
      delName: newDelName.trim() || null,
      delAdr0: newDelAdr0.trim() || null,
      delAdr1: newDelAdr1.trim() || null,
      delAdr2: newDelAdr2.trim() || null,
      delAdr3: newDelAdr3.trim() || null,
    });
  };

  // ----- header auto-save (view = edit) -----------------------------------------------
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveMutation = useMutation({
    mutationFn: (body: UpdateOrderRequest) => orders.update(orderId!, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", orderId], updated);
      queryClient.invalidateQueries({ queryKey: ["order-totals", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSavedAt(Date.now());
    },
  });

  const savePatch = (patch: Partial<UpdateOrderRequest>) => {
    if (!order) return;
    saveMutation.mutate({ ...fullUpdate(order), ...patch });
  };

  // ----- destructive actions ----------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: () => orders.remove(orderId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push("/orders");
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (jobNo: string) => orders.removeLine(orderId!, jobNo),
    onSuccess: (_data, jobNo) => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-totals", orderId] });
      queryClient.invalidateQueries({ queryKey: ["soset", "stamp", jobNo] });
      setDeleteLine(null);
    },
  });

  // Existing-mode load guards. Skipped entirely in create mode so the same layout renders.
  if (!isCreate) {
    if (orderQuery.isLoading) return <Spinner label="Loading order…" />;
    if (orderQuery.isError) return <ErrorState error={orderQuery.error} />;
    if (!order) return <EmptyState title="Order not found" />;
  }

  const totals = totalsQuery.data;
  const activeCustomer = isCreate ? customer : customerQuery.data ?? null;
  const lines = order?.lines ?? [];
  const creditCustId = isCreate ? customer?.uniqueId ?? null : order?.custId ?? null;

  const deliveryAddress = addressLines(
    order?.delName,
    order?.delAdr0,
    order?.delAdr1,
    order?.delAdr2,
    order?.delAdr3,
  );

  // Shared save indicator for the header cards. Nothing until the first save happens.
  const saveState: ReactNode = isCreate ? null : saveMutation.isPending ? (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Loader2 className="size-3 animate-spin" />
      Saving…
    </span>
  ) : saveMutation.isError ? (
    <span className="text-xs text-red-600">Not saved</span>
  ) : savedAt ? (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <Check className="size-3" />
      Saved
    </span>
  ) : null;

  return (
    <>
      <PageHeader
        title={isCreate ? "New order" : `Order ${order!.orderId}`}
        description={
          isCreate
            ? "Choose a customer; the rest defaults from their account."
            : text(order!.custTitle, "Customer not set")
        }
        actions={
          isCreate ? (
            <>
              <Button type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={createMutation.isPending}
                disabled={!customer}
                onClick={startOrder}
              >
                Start order
              </Button>
            </>
          ) : (
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
                    <Button variant="ghost" size="sm" disabled title="No previous order in this list">
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
              <Button
                onClick={() => setEditOrderOpen(true)}
                title="Freight, price code, invoice entity and flags"
              >
                <Pencil className="size-3.5" />
                More fields
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5" />
                Delete
              </Button>
              <Link href="/invoicing">
                <Button>Invoice run</Button>
              </Link>
              <Button onClick={() => setJobCardOpen(true)}>
                <FileText className="size-3.5" />
                Job card
                <JobCardIndicator orderId={order!.orderId} />
              </Button>
              <Button variant="primary" onClick={() => setAddLineOpen(true)}>
                <Plus className="size-3.5" />
                Add line
              </Button>
            </>
          )
        }
      />

      {/* Badges strip — present in both states so the layout below never shifts. */}
      <div className="mb-4 flex min-h-6 flex-wrap gap-2">
        {isCreate ? (
          <>
            {newIsCredit && <Badge tone="violet">Credit note</Badge>}
            {newRunNo.trim() && <Badge tone="slate">Run {newRunNo}</Badge>}
          </>
        ) : (
          <>
            {order!.credit && <Badge tone="violet">Credit note</Badge>}
            {order!.paid && <Badge tone="green">Marked paid</Badge>}
            {order!.freightApplies && <Badge tone="slate">Freight applies</Badge>}
            {order!.direct && <Badge tone="sky">Delivery docket</Badge>}
            {order!.binNo != null && <Badge tone="slate">Bin {order!.binNo}</Badge>}
            {order!.runNo?.trim() && <Badge tone="slate">Run {order!.runNo}</Badge>}
          </>
        )}
      </div>

      {/* Transient created banner: fades out after a few seconds. */}
      {justCreated && order && (
        <div
          className={clsx(
            "mb-4 transition-opacity duration-500",
            bannerLeaving ? "opacity-0" : "opacity-100",
          )}
        >
          <Notice tone="green" title={`Order ${order.orderId} created`}>
            You&rsquo;re working the order now — edit any field in place, and add lines when
            you&rsquo;re ready.
          </Notice>
        </div>
      )}

      {/* Create-only prompts, kept out of the cards so the card skeleton stays identical. */}
      {isCreate && customer && (
        <div className="mb-4 space-y-3">
          <ExistingOpenOrderDialog custId={customer.uniqueId} />
          {customer.orderNote?.trim() && (
            <Notice tone="amber" title="Order note on this account">
              {customer.orderNote}
            </Notice>
          )}
        </div>
      )}

      {!isCreate &&
        totals?.freightSuggestion &&
        totals.freightSuggestion !== "NoChange" && (
          <div className="mb-4">
            <Notice tone="amber" title={freightSuggestionLabel[totals.freightSuggestion]}>
              The order total is {money(totals.grossAmount)} against a delivery threshold of{" "}
              {money(totals.deliveryThreshold)}.
            </Notice>
          </div>
        )}

      {/* ================================================================================
          Constant header grid: Order · Addresses · Totals/Credit. Identical in both states.
          ============================================================================== */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {/* --- Order card --- */}
        <Card>
          <CardHeader title="Order" actions={saveState} />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Account" required={isCreate} className="sm:col-span-2">
              {isCreate ? (
                <CustomerPicker value={customer} onChange={pickCustomer} autoFocus />
              ) : (
                <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-800 ring-1 ring-inset ring-slate-200">
                  {text(order!.custTitle, "—")}
                </div>
              )}
            </Field>

            <Field label="Order date">
              {isCreate ? (
                <Input
                  type="date"
                  value={newOrderDate}
                  onChange={(e) => setNewOrderDate(e.target.value)}
                />
              ) : (
                <Input
                  type="date"
                  key={`date-${order!.date}`}
                  defaultValue={order!.date ? order!.date.slice(0, 10) : ""}
                  onBlur={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                    if (iso !== order!.date) savePatch({ orderDate: iso });
                  }}
                />
              )}
            </Field>

            <Field label="Run number" hint="Two characters.">
              {isCreate ? (
                <Input
                  value={newRunNo}
                  maxLength={2}
                  onChange={(e) => setNewRunNo(e.target.value)}
                />
              ) : (
                <InlineControl
                  value={order!.runNo}
                  maxLength={2}
                  onSave={(v) => savePatch({ runNo: v })}
                />
              )}
            </Field>

            <Field label="Delivery code">
              {isCreate ? (
                <Input value={newDelCode} onChange={(e) => setNewDelCode(e.target.value)} />
              ) : (
                <InlineControl
                  value={order!.delCode}
                  maxLength={12}
                  onSave={(v) => savePatch({ delCode: v })}
                />
              )}
            </Field>

            <Field
              label="Phone"
              hint={isCreate ? "Editable once the order is started." : undefined}
            >
              {isCreate ? (
                <Input value={customer?.phoneNo ?? ""} disabled />
              ) : (
                <InlineControl
                  value={order!.phoneNo}
                  maxLength={15}
                  onSave={(v) => savePatch({ phoneNo: v })}
                />
              )}
            </Field>

            <Field label="Email" className="sm:col-span-2">
              {isCreate ? (
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              ) : (
                <InlineControl
                  value={order!.email}
                  maxLength={60}
                  onSave={(v) => savePatch({ email: v })}
                />
              )}
            </Field>

            {((isCreate && newIsCredit) || (!isCreate && order!.credit)) && (
              <Field label="Applied to invoice" hint='Invoice number, or "Open".'>
                {isCreate ? (
                  <Input
                    value={newInvoiceApplied}
                    onChange={(e) => setNewInvoiceApplied(e.target.value)}
                  />
                ) : (
                  <InlineControl
                    value={order!.invoiceApplied}
                    maxLength={20}
                    onSave={(v) => savePatch({ invoiceApplied: v })}
                  />
                )}
              </Field>
            )}

            <Field
              label="Invoice note"
              className="sm:col-span-2"
              hint={isCreate ? "Editable once the order is started." : "Up to 60 characters."}
            >
              {isCreate ? (
                <Textarea rows={2} disabled placeholder="—" />
              ) : (
                <InlineControl
                  value={order!.note}
                  maxLength={60}
                  textarea
                  onSave={(v) => savePatch({ note: v })}
                />
              )}
            </Field>

            <div className="sm:col-span-2">
              <Checkbox
                label="This is a credit"
                checked={isCreate ? newIsCredit : order!.credit}
                disabled={!isCreate}
                onChange={(e) => isCreate && setNewIsCredit(e.target.checked)}
              />
            </div>

            <div className="text-xs text-slate-500 sm:col-span-2">
              Bin {isCreate ? "—" : order!.binNo ?? "—"} · Price code{" "}
              {isCreate ? customer?.priceCode ?? "—" : order!.priceCode ?? "—"}
            </div>
          </CardBody>
        </Card>

        {/* --- Addresses card --- */}
        <Card>
          <CardHeader title="Addresses" actions={saveState} />
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Invoice</p>
              <p className="text-sm font-medium text-slate-700">
                {isCreate ? text(customer?.title, "—") : text(order!.custTitle, "—")}
              </p>
              {isCreate ? (
                <>
                  <Input value={customer?.address1 ?? ""} placeholder="Address line 1" disabled />
                  <Input value={customer?.address2 ?? ""} placeholder="Address line 2" disabled />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={customer?.address3 ?? ""} placeholder="Suburb / town" disabled />
                    <Input value={customer?.postCode ?? ""} placeholder="Postcode" disabled />
                  </div>
                </>
              ) : (
                <>
                  <InlineControl
                    value={order!.invAdr1}
                    placeholder="Address line 1"
                    maxLength={40}
                    onSave={(v) => savePatch({ invAdr1: v })}
                  />
                  <InlineControl
                    value={order!.invAdr2}
                    placeholder="Address line 2"
                    maxLength={40}
                    onSave={(v) => savePatch({ invAdr2: v })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <InlineControl
                      value={order!.invAdr3}
                      placeholder="Suburb / town"
                      maxLength={40}
                      onSave={(v) => savePatch({ invAdr3: v })}
                    />
                    <InlineControl
                      value={order!.invPostCode}
                      placeholder="Postcode"
                      maxLength={4}
                      onSave={(v) => savePatch({ invPostCode: v })}
                    />
                  </div>
                </>
              )}
              {isCreate && (
                <p className="text-xs text-slate-400">
                  Invoice address defaults from the account; editable once started.
                </p>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500">Delivery</p>
              {isCreate ? (
                <>
                  <Input
                    value={newDelName}
                    placeholder={customer?.delivery1 ? "Name (blank = account default)" : "Name"}
                    maxLength={60}
                    onChange={(e) => setNewDelName(e.target.value)}
                  />
                  <Input
                    value={newDelAdr0}
                    placeholder="Address line 1"
                    maxLength={60}
                    onChange={(e) => setNewDelAdr0(e.target.value)}
                  />
                  <Input
                    value={newDelAdr1}
                    placeholder="Address line 2"
                    maxLength={60}
                    onChange={(e) => setNewDelAdr1(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newDelAdr2}
                      placeholder="Suburb"
                      maxLength={60}
                      onChange={(e) => setNewDelAdr2(e.target.value)}
                    />
                    <Input
                      value={newDelAdr3}
                      placeholder="State"
                      maxLength={60}
                      onChange={(e) => setNewDelAdr3(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <InlineControl
                    value={order!.delName}
                    placeholder="Name (blank = same as invoice)"
                    maxLength={60}
                    onSave={(v) => savePatch({ delName: v })}
                  />
                  <InlineControl
                    value={order!.delAdr0}
                    placeholder="Address line 1"
                    maxLength={60}
                    onSave={(v) => savePatch({ delAdr0: v })}
                  />
                  <InlineControl
                    value={order!.delAdr1}
                    placeholder="Address line 2"
                    maxLength={60}
                    onSave={(v) => savePatch({ delAdr1: v })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <InlineControl
                      value={order!.delAdr2}
                      placeholder="Suburb"
                      maxLength={60}
                      onSave={(v) => savePatch({ delAdr2: v })}
                    />
                    <InlineControl
                      value={order!.delAdr3}
                      placeholder="State"
                      maxLength={60}
                      onSave={(v) => savePatch({ delAdr3: v })}
                    />
                  </div>
                </>
              )}
              {!isCreate && deliveryAddress.length === 0 && (
                <p className="text-xs text-slate-400">
                  Left blank, this order delivers to the invoice address.
                </p>
              )}
              {isCreate && (
                <p className="text-xs text-slate-400">
                  Leave blank to use the account&rsquo;s delivery address.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* --- Totals + credit column --- */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Totals" />
            <CardBody>
              {isCreate ? (
                <p className="text-sm text-slate-500">
                  Totals appear once the order is started.
                </p>
              ) : totalsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Calculating…</p>
              ) : totals ? (
                <dl className="divide-y divide-slate-100">
                  <TotalRow label="Net">{money(totals.netAmount)}</TotalRow>
                  <TotalRow label="GST">{money(totals.gstAmount)}</TotalRow>
                  <TotalRow label="Total">
                    <span className="text-base">{money(totals.grossAmount)}</span>
                  </TotalRow>
                  <TotalRow label="Delivery threshold">
                    {money(totals.deliveryThreshold)}
                  </TotalRow>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Totals unavailable.</p>
              )}
            </CardBody>
          </Card>

          {creditCustId != null && <CreditCheckPanel custId={creditCustId} />}
        </div>
      </div>

      {/* Order lines — full width, stacked beneath the header details (both states). */}
      <Card>
        <CardHeader
          title="Lines"
          description={
            isCreate
              ? "Available once the order is started"
              : `${lines.length} line${lines.length === 1 ? "" : "s"}`
          }
          actions={
            <Button
              size="sm"
              disabled={isCreate}
              onClick={() => setAddLineOpen(true)}
            >
              <Plus className="size-3" />
              Add
            </Button>
          }
        />

        {isCreate ? (
          <EmptyState
            title="No order yet"
            description="Press Start order to create it, then add lines here."
          />
        ) : lines.length === 0 ? (
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
                <Th />
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
                    <span className="block max-w-48 truncate">{text(line.details)}</span>
                    {line.stampLabel && (
                      <Badge tone="slate" className="mt-0.5">
                        Label {line.stampLabelCode?.trim() || "—"}
                      </Badge>
                    )}
                  </Td>
                  <Td>{text(line.colourDesc ?? line.colour)}</Td>
                  <Td align="right">{formatQty(line.qty)}</Td>
                  <Td align="right">{money(line.price)}</Td>
                  <Td align="right">{line.discPct ? `${line.discPct}%` : "—"}</Td>
                  <Td align="right">{money(line.gst)}</Td>
                  <Td align="right" className="font-medium">
                    {money(line.totalPrice)}
                  </Td>
                  <Td>
                    <StampCell jobNo={line.jobNo} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <ProofButton
                        jobNo={line.jobNo}
                        onClick={() => setProofJobNo(line.jobNo)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Edit line"
                        onClick={() => setEditLine(line)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Delete line"
                        onClick={() => setDeleteLine(line)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Dialogs — only meaningful once an order exists. */}
      {!isCreate && order && (
        <>
          <JobCardPanel
            orderId={order.orderId}
            open={jobCardOpen}
            onClose={() => setJobCardOpen(false)}
          />

          <AddLineDialog
            open={addLineOpen}
            onClose={() => setAddLineOpen(false)}
            orderId={order.orderId}
            customer={activeCustomer}
            defaultDiscountPct={activeCustomer?.discPct ?? 0}
          />

          <EditOrderDialog
            open={editOrderOpen}
            onClose={() => setEditOrderOpen(false)}
            order={order}
          />

          <EditLineDialog
            open={editLine !== null}
            onClose={() => setEditLine(null)}
            orderId={order.orderId}
            line={editLine}
            customer={activeCustomer}
          />

          <ProofDialog jobNo={proofJobNo} onClose={() => setProofJobNo(null)} />

          <Modal
            open={deleteLine !== null}
            onClose={() => setDeleteLine(null)}
            title={deleteLine ? `Delete line ${deleteLine.jobNo}?` : "Delete line"}
            description="The line is removed and its Soset stamp job voided."
            footer={
              <>
                <Button onClick={() => setDeleteLine(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  loading={deleteLineMutation.isPending}
                  onClick={() => deleteLine && deleteLineMutation.mutate(deleteLine.jobNo)}
                >
                  Delete line
                </Button>
              </>
            }
          >
            {deleteLineMutation.isError ? (
              <Notice tone="red" title="Line was not deleted">
                {(deleteLineMutation.error as Error).message}
              </Notice>
            ) : (
              <p className="text-sm text-slate-600">
                Line {deleteLine?.jobNo} ({deleteLine?.product}) will be removed.
              </p>
            )}
          </Modal>

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
                {lines.length} line{lines.length === 1 ? "" : "s"} will be removed with it.
              </p>
            )}
          </Modal>
        </>
      )}
    </>
  );
}

/** Build the full PUT-replace body from the current order, for a single-field save. */
function fullUpdate(o: OrderHeader): UpdateOrderRequest {
  return {
    orderDate: o.date,
    runNo: o.runNo,
    delCode: o.delCode,
    email: o.email,
    phoneNo: o.phoneNo,
    note: o.note,
    delName: o.delName,
    delAdr0: o.delAdr0,
    delAdr1: o.delAdr1,
    delAdr2: o.delAdr2,
    delAdr3: o.delAdr3,
    invAdr1: o.invAdr1,
    invAdr2: o.invAdr2,
    invAdr3: o.invAdr3,
    invPostCode: o.invPostCode,
    direct: o.direct,
    freightApplies: o.freightApplies,
    freight: o.freight,
    priceCode: o.priceCode,
    invoiceComp: o.invoiceComp,
    invoiceApplied: o.invoiceApplied,
    paid: o.paid,
  };
}

/**
 * An in-place editable control that commits on blur (or Enter). No label of its own — it
 * sits inside a shared Field so the label position is identical to the create-mode input
 * in the same slot. Empty saves as null, matching the API's clear-the-column rule.
 */
function InlineControl({
  value,
  onSave,
  maxLength,
  placeholder,
  className,
  textarea,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  textarea?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setDirty(false);
  }, [value]);

  const commit = () => {
    if (!dirty) return;
    const t = draft.trim();
    onSave(t === "" ? null : t);
    setDirty(false);
  };

  if (textarea) {
    return (
      <Textarea
        className={className}
        value={draft}
        rows={2}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
      />
    );
  }

  return (
    <Input
      className={className}
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => {
        setDraft(e.target.value);
        setDirty(true);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function TotalRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

/**
 * Whether Soset holds a stamp job for this line. Shown in place rather than behind the old
 * "Go To Soset" button. A 404 is "not found"; a 502 is "unreachable" — different answers.
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

/**
 * The Proof button, shown only when there's a proof to view. Runs the same lookup the
 * dialog does, under the same query key, so a job whose proof won't load hides its button
 * instead of opening the dialog to an error.
 */
function ProofButton({ jobNo, onClick }: { jobNo: string; onClick: () => void }) {
  const { data, error } = useQuery({
    queryKey: ["proof", "job", jobNo],
    queryFn: () => proofs.job(jobNo),
    retry: false,
    staleTime: 60_000,
  });

  if (error || !data) return null;

  return (
    <Button variant="ghost" size="sm" title="Proof" onClick={onClick}>
      <FileText className="size-3.5" />
    </Button>
  );
}
