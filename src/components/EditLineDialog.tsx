"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { orders, reference } from "@/lib/endpoints";
import {
  DEFAULT_GST_RATE,
  calculateLine,
  money,
  priceSourceLabel,
} from "@/lib/format";
import type {
  Customer,
  OrderLine,
  SosetProduct,
  UpdateOrderLineRequest,
} from "@/types/api";

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

const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

/**
 * Edit a single order line — the amend half of UpdLine.Frm (the add half is AddLineDialog).
 *
 * The two forms carried identical field sets in the legacy application, but they are separate
 * dialogs here on purpose: the shared calculation lives in one place (calculateLine, itself a
 * transcription of CalcValue) and both dialogs call it, but their surrounding state differs —
 * add clears and can stay open for the next line, edit pre-fills from an existing line and
 * closes on save.
 *
 * The job number is immutable (it is the Soset join key), so it is shown read-only; changing
 * it would be delete + add. The API re-prices on save and reconciles the Soset stamp; the
 * saved line replaces whatever preview was shown.
 *
 * Keyboard behaviour matches AddLineDialog (customer feedback, Nov 2026): the first editable field
 * takes focus, numbers and the customer order number are selected on focus, Colour comes straight
 * after Product, Details and the GST tick are skipped by Tab, and Save changes is the last tab stop,
 * looping back to the top. Unlike the add dialog, F2 keeps its usual meaning here (search for a
 * different product): the product is always already chosen on an edit, and F2 is the only
 * keyboard way to change it. Colour is the next Tab stop anyway.
 */
export function EditLineDialog({
  open,
  onClose,
  orderId,
  line,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  line: OrderLine | null;
  customer: Customer | null;
}) {
  const queryClient = useQueryClient();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const colourRef = useRef<HTMLSelectElement>(null);

  const [product, setProduct] = useState<SosetProduct | null>(null);
  const [details, setDetails] = useState("");
  const [custOrderNo, setCustOrderNo] = useState("");
  const [colour, setColour] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [discPct, setDiscPct] = useState("0");
  const [priceIncGst, setPriceIncGst] = useState(false);
  const [stampLabel, setStampLabel] = useState(false);
  const [stampLabelCode, setStampLabelCode] = useState("");
  const [priceNote, setPriceNote] = useState<string | null>(null);

  const { data: colours } = useQuery({
    queryKey: ["colours"],
    queryFn: () => reference.colours(),
    staleTime: 10 * 60_000,
  });

  // Seed the form from the line whenever the dialog opens for a (possibly different) line.
  // Keyed on jobNo so reopening on another row re-seeds rather than keeping stale values.
  useEffect(() => {
    if (!open || !line) return;

    setDetails(line.details ?? "");
    setCustOrderNo(line.custOrderNo ?? "");
    setColour(line.colour ?? "");
    setQty(line.qty != null ? String(line.qty) : "1");
    setPrice(line.price != null ? line.price.toFixed(2) : "");
    setDiscPct(line.discPct != null ? String(line.discPct) : "0");
    setPriceIncGst(line.priceIncGst);
    setStampLabel(line.stampLabel);
    setStampLabelCode(line.stampLabelCode ?? "");
    setPriceNote(null);

    // The first field takes focus when the dialog opens, before these values arrive, so its
    // selection-on-focus finds it empty. Select the loaded text once it is in place.
    const selectFirst = window.setTimeout(() => {
      const first = firstFieldRef.current;
      if (first && document.activeElement === first) first.select();
    }, 0);

    // The line stores a product code; the picker wants a product object. Look it up so the
    // picker shows the current product and a product change can re-resolve price.
    reference
      .product(line.product)
      .then((p) => setProduct(p))
      .catch(() => setProduct(null));

    return () => window.clearTimeout(selectFirst);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, line?.jobNo]);

  // Re-resolve price only when the operator picks a DIFFERENT product, mirroring
  // Product_Change. Editing other fields must not silently overwrite a hand-entered price.
  const originalProductCode = line?.product ?? null;
  useEffect(() => {
    if (!open || !product || !customer) return;
    if (product.prodId === originalProductCode) return;

    let cancelled = false;
    reference
      .price(product.prodId, customer.uniqueId)
      .then((result) => {
        if (cancelled) return;
        setPrice(result.price.toFixed(2));
        setPriceNote(priceSourceLabel[result.source] ?? result.source);
        setDetails(product.prodName?.trim() ?? "");
      })
      .catch(() => {
        if (!cancelled) setPriceNote("Price could not be resolved automatically.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, customer, open]);

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
    mutationFn: (body: UpdateOrderLineRequest) =>
      orders.updateLine(orderId, line!.jobNo, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-totals", orderId] });
      // The Soset column reflects amend/void; refresh this line's stamp lookup.
      if (line) {
        queryClient.invalidateQueries({ queryKey: ["soset", "stamp", line.jobNo] });
      }
      onClose();
    },
  });

  const selectedColour = colours?.find((c) => c.colourId === colour);

  const problems: string[] = [];
  if (!product) problems.push("Product is required.");
  if (!details.trim()) problems.push("Details are required.");
  if (!colour) problems.push("Colour is required.");
  if (!Number.isFinite(Number(qty)) || Number(qty) <= 0)
    problems.push("Quantity must be a positive number.");
  if (price === "" || !Number.isFinite(Number(price)))
    problems.push("Price must be a number.");

  const canSubmit = problems.length === 0 && !mutation.isPending;

  const submit = () => {
    if (problems.length > 0 || !product || !line) return;

    mutation.mutate({
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
      title={line ? `Edit line ${line.jobNo}` : "Edit line"}
      description="Re-prices on save. The job number cannot be changed."
      width="lg"
      footer={
        <>
          {/* Escape cancels, so the button is only for the mouse and stays out of the tab order. */}
          <Button tabIndex={-1} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            onKeyDown={(e) => {
              // Save changes is the last tab stop; Tab loops back to the first field.
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                firstFieldRef.current?.focus();
              }
            }}
            loading={mutation.isPending}
            // Not `disabled`: a disabled button cannot take focus, which would drop it from the
            // tab order whenever the form is incomplete. submit() re-validates.
            aria-disabled={!canSubmit}
            className={canSubmit ? undefined : "cursor-not-allowed opacity-60"}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div
        className="space-y-4"
        onKeyDown={(event) => {
          // Enter acts as the Save changes button: same enablement check, and it defers
          // to any field that already gave Enter a meaning of its own (e.g. ProductPicker
          // selecting a highlighted result), which calls preventDefault when it does.
          if (event.key !== "Enter" || event.defaultPrevented) return;
          if (event.target instanceof HTMLTextAreaElement) return;
          event.preventDefault();
          if (canSubmit) submit();
        }}
      >
        {mutation.isError && (
          <Notice tone="red" title="Line was not saved">
            {(mutation.error as Error).message}
          </Notice>
        )}

        {product?.suppressesStampJob && (
          <Notice tone="amber" title="No stamp job for this product">
            This product carries ScreenInfo = NOSTAMP in Soset. If the line previously had a
            stamp job, saving will void it.
          </Notice>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Job number" hint="Immutable — the Soset join key.">
            <Input value={line?.jobNo ?? ""} disabled readOnly />
          </Field>

          <Field label="Customer order number">
            <Input
              value={custOrderNo}
              maxLength={20}
              autoFocus
              ref={firstFieldRef}
              onFocus={selectAll}
              onChange={(e) => setCustOrderNo(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Product" required>
          <ProductPicker
            value={product}
            onChange={setProduct}
            onSelected={() => colourRef.current?.focus()}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Colour" required>
            <Select ref={colourRef} value={colour} onChange={(e) => setColour(e.target.value)}>
              <option value="">Select a colour…</option>
              {colours?.map((c) => (
                <option key={c.colourId} value={c.colourId}>
                  {c.name?.trim() || c.colourId}
                </option>
              ))}
            </Select>
          </Field>

          {/* Details is skipped in the tab order (legacy TabStop = False), as on the add dialog. */}
          <Field label="Details" required>
            <Input
              value={details}
              maxLength={30}
              tabIndex={-1}
              onChange={(e) => setDetails(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="1"
              value={qty}
              onFocus={selectAll}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>

          <Field label="Unit price" required hint={priceNote ?? undefined}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onFocus={selectAll}
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
              onFocus={selectAll}
              onChange={(e) => setDiscPct(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label="Price includes GST"
            checked={priceIncGst}
            tabIndex={-1}
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
          <Notice tone="amber" title="Before these changes can be saved">
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
