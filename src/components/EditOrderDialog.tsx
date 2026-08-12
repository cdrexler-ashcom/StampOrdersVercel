"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orders } from "@/lib/endpoints";
import type { OrderHeader, UpdateOrderRequest } from "@/types/api";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Notice,
  Textarea,
} from "./ui";

/**
 * Edit an order header — the header fields of Form2 (invoice.Frm) that were previously
 * fixed once the order was created.
 *
 * Deliberately not editable (and so not shown), matching the API:
 *  - Customer: changing it would re-default the whole order; that is a new order.
 *  - Bin: auto-allocated at creation, released at delete/invoice.
 *  - Credit flag: a credit order suppresses stamp jobs, so flipping it mid-life would
 *    desynchronise Soset.
 *
 * PUT-replace: the form submits the whole editable set. A cleared field clears the column.
 */
export function EditOrderDialog({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: OrderHeader;
}) {
  const queryClient = useQueryClient();

  // Date input wants yyyy-MM-dd; the API returns an ISO datetime.
  const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  const [orderDate, setOrderDate] = useState(toDateInput(order.date));
  const [runNo, setRunNo] = useState(order.runNo ?? "");
  const [delCode, setDelCode] = useState(order.delCode ?? "");
  const [email, setEmail] = useState(order.email ?? "");
  const [phoneNo, setPhoneNo] = useState(order.phoneNo ?? "");
  const [note, setNote] = useState(order.note ?? "");

  const [delName, setDelName] = useState(order.delName ?? "");
  const [delAdr0, setDelAdr0] = useState(order.delAdr0 ?? "");
  const [delAdr1, setDelAdr1] = useState(order.delAdr1 ?? "");
  const [delAdr2, setDelAdr2] = useState(order.delAdr2 ?? "");
  const [delAdr3, setDelAdr3] = useState(order.delAdr3 ?? "");

  const [invAdr1, setInvAdr1] = useState(order.invAdr1 ?? "");
  const [invAdr2, setInvAdr2] = useState(order.invAdr2 ?? "");
  const [invAdr3, setInvAdr3] = useState(order.invAdr3 ?? "");
  const [invPostCode, setInvPostCode] = useState(order.invPostCode ?? "");

  const [direct, setDirect] = useState(order.direct);
  const [freightApplies, setFreightApplies] = useState(order.freightApplies);
  const [freight, setFreight] = useState(
    order.freight != null ? String(order.freight) : "",
  );
  const [priceCode, setPriceCode] = useState(
    order.priceCode != null ? String(order.priceCode) : "",
  );
  const [invoiceComp, setInvoiceComp] = useState(order.invoiceComp ?? "");
  const [invoiceApplied, setInvoiceApplied] = useState(order.invoiceApplied ?? "");
  const [paid, setPaid] = useState(order.paid);

  // Re-seed when opened for a different order (the dialog is mounted once on the page).
  useEffect(() => {
    if (!open) return;
    setOrderDate(toDateInput(order.date));
    setRunNo(order.runNo ?? "");
    setDelCode(order.delCode ?? "");
    setEmail(order.email ?? "");
    setPhoneNo(order.phoneNo ?? "");
    setNote(order.note ?? "");
    setDelName(order.delName ?? "");
    setDelAdr0(order.delAdr0 ?? "");
    setDelAdr1(order.delAdr1 ?? "");
    setDelAdr2(order.delAdr2 ?? "");
    setDelAdr3(order.delAdr3 ?? "");
    setInvAdr1(order.invAdr1 ?? "");
    setInvAdr2(order.invAdr2 ?? "");
    setInvAdr3(order.invAdr3 ?? "");
    setInvPostCode(order.invPostCode ?? "");
    setDirect(order.direct);
    setFreightApplies(order.freightApplies);
    setFreight(order.freight != null ? String(order.freight) : "");
    setPriceCode(order.priceCode != null ? String(order.priceCode) : "");
    setInvoiceComp(order.invoiceComp ?? "");
    setInvoiceApplied(order.invoiceApplied ?? "");
    setPaid(order.paid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.orderId]);

  const mutation = useMutation({
    mutationFn: (body: UpdateOrderRequest) => orders.update(order.orderId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-totals", order.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
  });

  const problems: string[] = [];
  if (runNo.trim().length > 2)
    problems.push("Run number is limited to two characters.");
  if (freight !== "" && !Number.isFinite(Number(freight)))
    problems.push("Freight must be a number.");
  if (priceCode !== "" && !Number.isInteger(Number(priceCode)))
    problems.push("Price code must be a whole number.");

  const orNull = (s: string) => {
    const t = s.trim();
    return t === "" ? null : t;
  };

  const submit = () => {
    if (problems.length > 0) return;

    mutation.mutate({
      orderDate: orderDate ? new Date(orderDate).toISOString() : null,
      runNo: orNull(runNo),
      delCode: orNull(delCode),
      email: orNull(email),
      phoneNo: orNull(phoneNo),
      note: orNull(note),
      delName: orNull(delName),
      delAdr0: orNull(delAdr0),
      delAdr1: orNull(delAdr1),
      delAdr2: orNull(delAdr2),
      delAdr3: orNull(delAdr3),
      invAdr1: orNull(invAdr1),
      invAdr2: orNull(invAdr2),
      invAdr3: orNull(invAdr3),
      invPostCode: orNull(invPostCode),
      direct,
      freightApplies,
      freight: freight === "" ? null : Number(freight),
      priceCode: priceCode === "" ? null : Number(priceCode),
      invoiceComp: orNull(invoiceComp),
      invoiceApplied: order.credit ? orNull(invoiceApplied) : order.invoiceApplied,
      paid,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit order ${order.orderId}`}
      description="Customer, bin and the credit flag are fixed once an order is created."
      width="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={mutation.isPending}
            disabled={problems.length > 0}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError && (
          <Notice tone="red" title="Order was not saved">
            {(mutation.error as Error).message}
          </Notice>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Order date">
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </Field>
          <Field label="Run number" hint="Two characters.">
            <Input
              value={runNo}
              maxLength={2}
              onChange={(e) => setRunNo(e.target.value)}
            />
          </Field>
          <Field label="Price code">
            <Input
              type="number"
              step="1"
              value={priceCode}
              onChange={(e) => setPriceCode(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Delivery code">
            <Input
              value={delCode}
              maxLength={12}
              onChange={(e) => setDelCode(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              value={email}
              maxLength={60}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={phoneNo}
              maxLength={15}
              onChange={(e) => setPhoneNo(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-500">
              Delivery address
            </legend>
            <Input
              value={delName}
              placeholder="Name"
              maxLength={60}
              onChange={(e) => setDelName(e.target.value)}
            />
            <Input
              value={delAdr0}
              placeholder="Address line 1"
              maxLength={60}
              onChange={(e) => setDelAdr0(e.target.value)}
            />
            <Input
              value={delAdr1}
              placeholder="Address line 2"
              maxLength={60}
              onChange={(e) => setDelAdr1(e.target.value)}
            />
            <Input
              value={delAdr2}
              placeholder="Suburb"
              maxLength={60}
              onChange={(e) => setDelAdr2(e.target.value)}
            />
            <Input
              value={delAdr3}
              placeholder="State"
              maxLength={60}
              onChange={(e) => setDelAdr3(e.target.value)}
            />
          </fieldset>

          <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-500">
              Invoice address
            </legend>
            <Input
              value={invAdr1}
              placeholder="Address line 1"
              maxLength={40}
              onChange={(e) => setInvAdr1(e.target.value)}
            />
            <Input
              value={invAdr2}
              placeholder="Address line 2"
              maxLength={40}
              onChange={(e) => setInvAdr2(e.target.value)}
            />
            <Input
              value={invAdr3}
              placeholder="Address line 3"
              maxLength={40}
              onChange={(e) => setInvAdr3(e.target.value)}
            />
            <Input
              value={invPostCode}
              placeholder="Postcode"
              maxLength={4}
              onChange={(e) => setInvPostCode(e.target.value)}
            />
          </fieldset>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Freight amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
            />
          </Field>
          <Field label="Invoice entity" hint="State invoicing code.">
            <Input
              value={invoiceComp}
              maxLength={20}
              onChange={(e) => setInvoiceComp(e.target.value)}
            />
          </Field>
          {order.credit && (
            <Field label="Applied to invoice" hint='Invoice number, or "Open".'>
              <Input
                value={invoiceApplied}
                maxLength={20}
                onChange={(e) => setInvoiceApplied(e.target.value)}
              />
            </Field>
          )}
        </div>

        <Field label="Invoice note" hint="Up to 60 characters.">
          <Textarea
            value={note}
            maxLength={60}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label="Freight applies"
            checked={freightApplies}
            onChange={(e) => setFreightApplies(e.target.checked)}
          />
          <Checkbox
            label="Delivery docket (direct)"
            checked={direct}
            onChange={(e) => setDirect(e.target.checked)}
          />
          <Checkbox
            label="Marked paid"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
        </div>

        {problems.length > 0 && (
          <ul className="space-y-0.5 text-xs text-slate-500">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
