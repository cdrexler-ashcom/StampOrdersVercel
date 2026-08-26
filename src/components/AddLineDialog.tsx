"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { orders, reference } from "@/lib/endpoints";
import {
  DEFAULT_GST_RATE,
  calculateLine,
  money,
  priceSourceLabel,
} from "@/lib/format";
import type { AddOrderLineRequest, Customer, SosetProduct } from "@/types/api";

import { ProductPicker } from "./ProductPicker";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Notice,
  Select,
} from "./ui";

/**
 * Replaces addLine.frm and UpdLine.Frm, which carried identical field sets.
 *
 * Three behaviours from the original are preserved deliberately:
 *  - Price defaults from the pricing rules once a product is chosen (Product_Change ->
 *    CalcPrice), and the resolved rule is named so the operator can see why.
 *  - Discount defaults from the order, as Form_Activate did (Me.DiscPct = Form2.DiscPct).
 *  - The Inc GST flag defaults from the customer.
 *
 * Totals update as you type instead of on lost focus. The figures shown come from the
 * same calculation the API performs; the saved line replaces them regardless.
 */
export function AddLineDialog({
  open,
  onClose,
  orderId,
  customer,
  defaultDiscountPct,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  customer: Customer | null;
  defaultDiscountPct: number;
}) {
  const queryClient = useQueryClient();

  const [jobNo, setJobNo] = useState("");
  const [product, setProduct] = useState<SosetProduct | null>(null);
  const [details, setDetails] = useState("");
  const [custOrderNo, setCustOrderNo] = useState("");
  const [colour, setColour] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [discPct, setDiscPct] = useState(String(defaultDiscountPct));
  const [priceIncGst, setPriceIncGst] = useState(customer?.priceIncGst ?? false);
  const [stampLabel, setStampLabel] = useState(false);
  const [stampLabelCode, setStampLabelCode] = useState("");
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(true);

  const { data: colours } = useQuery({
    queryKey: ["colours"],
    queryFn: () => reference.colours(),
    staleTime: 10 * 60_000,
  });

  const reset = () => {
    // Mirrors the legacy End_Process block: job number, colour, quantity and price
    // clear for the next line; product and customer order number persist.
    setJobNo("");
    setColour("");
    setQty("1");
    setPrice("");
    setDiscPct(String(defaultDiscountPct));
    setPriceNote(null);
  };

  useEffect(() => {
    if (open) {
      setPriceIncGst(customer?.priceIncGst ?? false);
      setDiscPct(String(defaultDiscountPct));
    }
  }, [open, customer, defaultDiscountPct]);

  // Price resolution, as Product_Change did on the legacy form.
  useEffect(() => {
    if (!product || !customer) return;

    let cancelled = false;

    reference
      .price(product.prodId, customer.uniqueId)
      .then((result) => {
        if (cancelled) return;
        setPrice(result.price.toFixed(2));
        setPriceNote(priceSourceLabel[result.source] ?? result.source);
        if (!details.trim()) setDetails(product.prodName?.trim() ?? "");
      })
      .catch(() => {
        if (!cancelled) setPriceNote("Price could not be resolved automatically.");
      });

    return () => {
      cancelled = true;
    };
    // details is intentionally excluded: it should only be seeded, not re-seeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, customer]);

  const preview = useMemo(() => {
    const q = Number(qty);
    const p = Number(price);
    const d = Number(discPct);

    if (!Number.isFinite(q) || !Number.isFinite(p)) return null;

    return calculateLine(
      q,
      p,
      Number.isFinite(d) ? d : 0,
      customer?.gstExempt ? 0 : DEFAULT_GST_RATE,
      priceIncGst,
    );
  }, [qty, price, discPct, priceIncGst, customer]);

  const mutation = useMutation({
    mutationFn: (body: AddOrderLineRequest) => orders.addLine(orderId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-totals", orderId] });
      if (keepOpen) {
        reset();
      } else {
        onClose();
      }
    },
  });

  const selectedColour = colours?.find((c) => c.colourId === colour);

  // Validation mirrors Next_Click in addLine.frm.
  const problems: string[] = [];
  if (!jobNo.trim()) problems.push("Job number is required.");
  if (jobNo.trim().length > 6) problems.push("Job number is limited to six characters.");
  if (!product) problems.push("Product is required.");
  if (!details.trim()) problems.push("Details are required.");
  if (!colour) problems.push("Colour is required.");
  if (!Number.isFinite(Number(qty)) || Number(qty) <= 0)
    problems.push("Quantity must be a positive number.");
  if (price === "" || !Number.isFinite(Number(price)))
    problems.push("Price must be a number.");

  const canSubmit = problems.length === 0 && !mutation.isPending;

  const submit = () => {
    if (problems.length > 0 || !product) return;

    mutation.mutate({
      jobNo: jobNo.trim(),
      product: product.prodId,
      qty: Number(qty),
      price: Number(price),
      discPct: Number(discPct) || 0,
      priceIncGst,
      custOrderNo: custOrderNo.trim() || null,
      details: details.trim(),
      colour,
      colourDesc: selectedColour?.name?.trim() ?? null,
      stampLabel,
      stampLabelCode: stampLabel ? stampLabelCode.trim() || null : null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add order line"
      description="Price and discount default from the customer's pricing; override either as needed."
      width="lg"
      footer={
        <>
          <Checkbox
            label="Keep open for the next line"
            checked={keepOpen}
            onChange={(e) => setKeepOpen(e.target.checked)}
            className="mr-auto text-xs"
          />
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={mutation.isPending}
            disabled={!canSubmit}
          >
            Add line
          </Button>
        </>
      }
    >
      <div
        className="space-y-4"
        onKeyDown={(event) => {
          // Enter acts as the Add line button: same enablement check, and it defers to
          // any field that already gave Enter a meaning of its own (e.g. ProductPicker
          // selecting a highlighted result), which calls preventDefault when it does.
          if (event.key !== "Enter" || event.defaultPrevented) return;
          if (event.target instanceof HTMLTextAreaElement) return;
          event.preventDefault();
          if (canSubmit) submit();
        }}
      >
        {mutation.isError && (
          <Notice tone="red" title="Line was not added">
            {(mutation.error as Error).message}
          </Notice>
        )}

        {product?.suppressesStampJob && (
          <Notice tone="amber" title="No stamp job will be created">
            This product carries ScreenInfo = NOSTAMP in Soset, so the line saves without
            a corresponding stamp record.
          </Notice>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Job number" required hint="Six characters, matching Soset SEARCHKEY1.">
            <Input
              value={jobNo}
              maxLength={6}
              autoFocus
              onChange={(e) => setJobNo(e.target.value)}
            />
          </Field>

          <Field label="Customer order number">
            <Input
              value={custOrderNo}
              maxLength={20}
              onChange={(e) => setCustOrderNo(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Product" required>
          <ProductPicker value={product} onChange={setProduct} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Details" required>
            <Input
              value={details}
              maxLength={30}
              onChange={(e) => setDetails(e.target.value)}
            />
          </Field>

          <Field label="Colour" required>
            <Select value={colour} onChange={(e) => setColour(e.target.value)}>
              <option value="">Select a colour…</option>
              {colours?.map((c) => (
                <option key={c.colourId} value={c.colourId}>
                  {c.name?.trim() || c.colourId}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>

          <Field label="Unit price" required hint={priceNote ?? undefined}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceNote(null);
              }}
            />
          </Field>

          <Field label="Discount %">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discPct}
              onChange={(e) => setDiscPct(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label="Price includes GST"
            checked={priceIncGst}
            onChange={(e) => setPriceIncGst(e.target.checked)}
          />
          <Checkbox
            label="Stamp label"
            checked={stampLabel}
            onChange={(e) => setStampLabel(e.target.checked)}
          />
          {stampLabel && (
            <Input
              value={stampLabelCode}
              placeholder="Label code"
              onChange={(e) => setStampLabelCode(e.target.value)}
              className="max-w-40"
            />
          )}
        </div>

        {preview && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <Amount label="Gross" value={preview.gross} />
              <Amount label="Discount" value={-preview.discount} />
              <Amount label="GST" value={preview.gst} />
              <Amount label="Line total" value={preview.total} strong />
            </div>
            {customer?.gstExempt && (
              <p className="mt-1.5 text-xs text-slate-500">
                Customer is GST exempt, so no GST is shown.
              </p>
            )}
          </div>
        )}

        {problems.length > 0 && (
          <Notice tone="amber" title="Before this line can be added">
            <ul className="list-disc space-y-0.5 pl-4">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </Notice>
        )}
      </div>
    </Modal>
  );
}

function Amount({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`tabular-nums ${
          strong ? "font-semibold text-slate-900" : "text-slate-700"
        }`}
      >
        {money(value)}
      </p>
    </div>
  );
}
