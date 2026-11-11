"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Button, Field, Input, Modal, Notice } from "@/components/ui";
import { tracking } from "@/lib/endpoints";
import type { DespatchLabels } from "@/types/api";

/**
 * Scan Tracking — a port of TrackAdd.frm, field for field and key for key.
 *
 *  1. Invoice No   Enter -> Barcode.  Tab is blocked.  Esc closes the dialog.
 *                  Leaving the field looks the invoice up and fills the customer, the RETURN
 *                  ADDRESS block and the DELIVER TO block (the return address follows the order's
 *                  Dealer Return Address flag).
 *  2. Barcode      Enter -> Tracking number.  Leaving the field (only if an invoice number has been
 *                  entered) turns the barcode into the consignment number and puts it in the
 *                  Tracking number box:  01993... = 22 chars from position 19;  T... = 10 chars
 *                  from position 8;  anything else as scanned.
 *  3. Tracking no. Editable.  Esc here records the number WITHOUT printing labels (the legacy
 *                  lblTrackingNo_KeyDown calls Run_Accept only).
 *  4. Accept       Prints the return label then the delivery label, then records the tracking
 *                  number against the invoice (appended with ", " if it already has one), clears
 *                  the form and goes back to Invoice No ready for the next parcel.
 *
 * Like the legacy dialog, it stays open for the next parcel until you Exit (or Esc in Invoice No).
 * The label printer settings menu is not ported: a browser can't choose a printer, so the print
 * dialog's destination does that.
 */
export function ScanTrackingDialog({
  open,
  onClose,
  onPrint,
}: {
  open: boolean;
  onClose: () => void;
  /** Hands the labels to the page's print area (see DespatchLabelPrint). */
  onPrint: (labels: DespatchLabels) => void;
}) {
  const queryClient = useQueryClient();

  const [invoiceNo, setInvoiceNo] = useState("");
  const [barcode, setBarcode] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [labels, setLabels] = useState<DespatchLabels | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const invoiceRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const trackingRef = useRef<HTMLInputElement>(null);

  // The lookups are async but the legacy form's were synchronous, so Accept waits on them.
  const lookupToken = useRef(0);
  const lookupPromise = useRef<Promise<DespatchLabels | null> | null>(null);
  const lookedUpFor = useRef("");
  const parsePromise = useRef<Promise<string> | null>(null);
  const parsedFor = useRef("");

  const reset = () => {
    setInvoiceNo("");
    setBarcode("");
    setTrackingNo("");
    setLabels(null);
    setNotFound(null);
    setError(null);
    lookupToken.current++;
    lookupPromise.current = null;
    lookedUpFor.current = "";
    parsePromise.current = null;
    parsedFor.current = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  /** txtInvoiceNo_LostFocus: load the invoice's labels (customer, return and delivery blocks). */
  const lookup = (): Promise<DespatchLabels | null> => {
    const no = invoiceNo.trim();
    if (!no) {
      setLabels(null);
      setNotFound(null);
      return Promise.resolve(null);
    }
    const token = ++lookupToken.current;
    lookedUpFor.current = no;
    const promise = tracking
      .labels(no)
      .then((result) => {
        if (token === lookupToken.current) {
          setLabels(result);
          setNotFound(null);
        }
        return result;
      })
      .catch(() => {
        if (token === lookupToken.current) {
          setLabels(null);
          setNotFound(`Invoice ${no} was not found.`);
        }
        return null;
      });
    lookupPromise.current = promise;
    return promise;
  };

  /** txtBarcode_LostFocus: barcode -> consignment number, only once an invoice number is entered. */
  const parse = (): Promise<string> => {
    const code = barcode.trim();
    if (!code || !invoiceNo.trim()) return Promise.resolve(trackingNo);
    parsedFor.current = barcode;
    const promise = tracking
      .parseBarcode(code)
      .then((result) => {
        setTrackingNo(result.trackingNo);
        return result.trackingNo;
      })
      .catch(() => trackingNo);
    parsePromise.current = promise;
    return promise;
  };

  /**
   * Print_Labels (optional) then Run_Accept. Both need a tracking number and an invoice number,
   * and quietly do nothing without them, as the legacy procedures did.
   */
  const finish = async (print: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const invoice = invoiceNo.trim();

      const looked =
        invoice && lookedUpFor.current !== invoice
          ? await lookup()
          : await (lookupPromise.current ?? Promise.resolve(labels));

      // The tracking number box is what gets recorded, so a hand edit wins. Only when it is
      // still empty do we wait for the barcode to be parsed (it may have been scanned a moment
      // ago, or never blurred at all).
      let consignment = trackingNo.trim();
      if (!consignment) {
        if (barcode.trim() && invoice && parsedFor.current !== barcode) {
          consignment = (await parse()).trim();
        } else if (parsePromise.current) {
          consignment = (await parsePromise.current).trim();
        }
      }
      if (!consignment || !invoice) return;

      if (print && looked) onPrint(looked);

      await tracking.add({ invoiceNo: invoice, trackingNo: consignment });
      queryClient.invalidateQueries({ queryKey: ["tracking"] });

      reset();
      invoiceRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The tracking number was not saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Scan Tracking"
      width="lg"
      footer={
        <>
          <Button onClick={close}>Exit</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!barcode.trim()}
            onClick={() => finish(true)}
          >
            Accept
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Invoice No">
            <Input
              ref={invoiceRef}
              value={invoiceNo}
              autoFocus
              onChange={(event) => setInvoiceNo(event.target.value)}
              onBlur={() => void lookup()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  barcodeRef.current?.focus();
                } else if (event.key === "Tab" && !event.shiftKey) {
                  // Tab is deliberately blocked in the legacy invoice field.
                  event.preventDefault();
                }
              }}
            />
          </Field>

          <Field label="Barcode">
            <Input
              ref={barcodeRef}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onBlur={() => void parse()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  trackingRef.current?.focus();
                } else if (event.key === "Escape") {
                  // The legacy barcode field has no Esc action, so don't let it close the dialog.
                  event.stopPropagation();
                }
              }}
            />
          </Field>
        </div>

        <Field label="Tracking number">
          <Input
            ref={trackingRef}
            value={trackingNo}
            onChange={(event) => setTrackingNo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                // Esc here is "accept without printing", not "close".
                event.preventDefault();
                event.stopPropagation();
                void finish(false);
              }
            }}
          />
        </Field>

        <div className="text-sm">
          <span className="text-xs font-medium text-slate-500">Customer: </span>
          <span className="font-medium text-slate-900">{labels?.custTitle ?? ""}</span>
          {labels?.invoiceComp ? (
            <span className="ml-3 text-xs text-slate-500">{labels.invoiceComp}</span>
          ) : null}
        </div>

        {notFound && <p className="text-xs text-slate-500">{notFound}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <AddressBlock heading="RETURN ADDRESS" lines={labels?.returnLabel.lines} />
          <AddressBlock heading="DELIVER TO" lines={labels?.deliveryLabel.lines} />
        </div>

        {error && (
          <Notice tone="red" title="Not recorded">
            {error}
          </Notice>
        )}
      </div>
    </Modal>
  );
}

function AddressBlock({ heading, lines }: { heading: string; lines?: string[] }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500">{heading}</p>
      <div className="min-h-16 space-y-0.5 text-sm text-slate-800">
        {(lines ?? []).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
