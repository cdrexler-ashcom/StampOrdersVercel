"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  Th,
} from "@/components/ui";
import { DespatchLabelPrint } from "@/components/DespatchLabelPrint";
import { tracking } from "@/lib/endpoints";
import { date, text, trackingStatusLabel } from "@/lib/format";
import { useSortableTable } from "@/lib/useSortableTable";
import type { AddTrackingRequest, DespatchLabels } from "@/types/api";

/**
 * Despatch.
 *
 * Replaces TrackingEntry.frm, TrackAdd.frm and TrackAddSettings.frm. TrackingEntry.frm
 * had a Scan button that put the grid into a capture mode; that mode is the default here,
 * because scanning is what the screen is for.
 *
 * The scan field stays focused and clears after each capture, so a barcode wedge can run
 * invoice-then-consignment without touching the keyboard.
 */
import { useRowLink } from "@/lib/useRowLink";

export default function DespatchPage() {
  const rowLink = useRowLink();
  const queryClient = useQueryClient();

  const [invoiceNo, setInvoiceNo] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);
  const [printLabels, setPrintLabels] = useState(true);
  const [confirmProcess, setConfirmProcess] = useState(false);
  const [labelsToPrint, setLabelsToPrint] = useState<DespatchLabels | null>(null);

  const invoiceRef = useRef<HTMLInputElement>(null);
  const trackingRef = useRef<HTMLInputElement>(null);

  const pending = useQuery({
    queryKey: ["tracking", "pending"],
    queryFn: () => tracking.pending(),
  });

  // Sorted client-side: /api/tracking/pending has no cap — it is already scoped to a specific
  // tracking-status queue, so it's an inherently bounded working set rather than an open-ended
  // archive. No full-dataset-vs-capped-page correctness issue to work around here.
  const pendingSort = useSortableTable(
    pending.data,
    {
      orderId: (i) => i.orderId,
      invoiceNo: (i) => i.invoiceNo,
      custTitle: (i) => i.custTitle,
      invoiceDate: (i) => (i.invoiceDate ? new Date(i.invoiceDate).getTime() : null),
      deliverTo: (i) => i.delName ?? i.delAdr2,
      trackingNo: (i) => i.trackingNo?.trim() || null,
      status: (i) => trackingStatusLabel[i.trackingStatus] ?? i.trackingStatus,
      required: (i) => i.trackingRequired,
    },
    undefined,
    "asc",
    "despatch:pending-sort",
  );

  const addMutation = useMutation({
    // Like the legacy Accept button: fetch the labels, record the consignment, then print.
    // A label lookup failure must not stop the capture itself.
    mutationFn: async (body: AddTrackingRequest) => {
      let labels: DespatchLabels | null = null;
      if (printLabels) {
        try {
          labels = await tracking.labels(body.invoiceNo);
        } catch {
          labels = null;
        }
      }
      await tracking.add(body);
      return labels;
    },
    onSuccess: (labels, variables) => {
      setLabelsToPrint(labels);
      setLastCaptured(variables.invoiceNo);
      setInvoiceNo("");
      setTrackingNo("");
      invoiceRef.current?.focus();
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
  });

  // The legacy grid's editable Tracking Number(s) column: free text, saved when you leave the cell.
  const trackingNoMutation = useMutation({
    mutationFn: (vars: { id: number; trackingNo: string }) =>
      tracking.setTrackingNo(vars.id, vars.trackingNo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  // The legacy grid's Required column: whether a pending invoice needs a consignment number.
  const requiredMutation = useMutation({
    mutationFn: (vars: { id: number; required: boolean }) =>
      tracking.setRequired(vars.id, vars.required),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  const advanceMutation = useMutation({
    mutationFn: () => tracking.advance(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  const capture = () => {
    if (!invoiceNo.trim() || !trackingNo.trim()) return;
    addMutation.mutate({
      invoiceNo: invoiceNo.trim(),
      trackingNo: trackingNo.trim(),
    });
  };

  return (
    <>
      <DespatchLabelPrint labels={labelsToPrint} onDone={() => setLabelsToPrint(null)} />
      <PageHeader
        title="Despatch"
        description="Capture consignment numbers and process tracking."
        actions={
          <Button
            loading={advanceMutation.isPending}
            onClick={() => setConfirmProcess(true)}
          >
            Process
          </Button>
        }
      />

      <Modal
        open={confirmProcess}
        onClose={() => setConfirmProcess(false)}
        title="Process Tracking"
        footer={
          <>
            <Button onClick={() => setConfirmProcess(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmProcess(false);
                advanceMutation.mutate();
              }}
            >
              OK
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          This will update all invoices with tracking details to tracked and ready for emailing. It
          will also update all invoices set as not requiring tracking to complete. Do you wish to
          continue?
        </p>
      </Modal>

      {trackingNoMutation.isError && (
        <div className="mb-4">
          <Notice tone="red" title="Tracking number not saved">
            {(trackingNoMutation.error as Error).message}
          </Notice>
        </div>
      )}

      {requiredMutation.isError && (
        <div className="mb-4">
          <Notice tone="red" title="Not changed">
            {(requiredMutation.error as Error).message}
          </Notice>
        </div>
      )}

      {advanceMutation.isSuccess && advanceMutation.data && (
        <div className="mb-4">
          <Notice tone="green" title="Tracking processed">
            {advanceMutation.data.updated} invoice(s) moved forward.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <Card>
            <CardHeader
              title="Capture"
              description="Scan the invoice number, then the consignment number."
            />
            <CardBody className="space-y-3">
              <Field label="Invoice number" required>
                <Input
                  ref={invoiceRef}
                  value={invoiceNo}
                  autoFocus
                  placeholder="Scan or type"
                  onChange={(event) => setInvoiceNo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      trackingRef.current?.focus();
                    }
                  }}
                />
              </Field>

              <Field label="Consignment number" required>
                <Input
                  ref={trackingRef}
                  value={trackingNo}
                  placeholder="Scan or type"
                  onChange={(event) => setTrackingNo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      capture();
                    }
                  }}
                />
              </Field>

              <Checkbox
                label="Print return and delivery labels"
                checked={printLabels}
                onChange={(event) => setPrintLabels(event.target.checked)}
              />

              {addMutation.isError && (
                <Notice tone="red" title="Not captured">
                  {(addMutation.error as Error).message}
                </Notice>
              )}

              {lastCaptured && !addMutation.isError && (
                <Notice tone="green" title={`Captured against ${lastCaptured}`}>
                  Ready for the next scan.
                </Notice>
              )}

              <Button
                variant="primary"
                className="w-full"
                loading={addMutation.isPending}
                disabled={!invoiceNo.trim() || !trackingNo.trim()}
                onClick={capture}
              >
                <ScanLine className="size-3.5" />
                Capture
              </Button>

              <p className="text-xs text-slate-500">
                If the invoice already carries a consignment number, the new one is
                appended rather than replacing it.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Awaiting a consignment number"
              description={`${pending.data?.length ?? 0} invoice(s)`}
              actions={
                pendingSort.isSorted && (
                  <Button size="sm" variant="ghost" onClick={pendingSort.clear}>
                    Clear sorting
                  </Button>
                )
              }
            />

            {pending.isLoading ? (
              <Spinner />
            ) : pending.isError ? (
              <ErrorState error={pending.error} />
            ) : (pending.data?.length ?? 0) === 0 ? (
              <EmptyState title="Nothing awaiting tracking" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th {...pendingSort.th("orderId")}>Order</Th>
                    <Th {...pendingSort.th("invoiceNo")}>Invoice</Th>
                    <Th {...pendingSort.th("custTitle")}>Customer</Th>
                    <Th {...pendingSort.th("invoiceDate")}>Invoice date</Th>
                    <Th {...pendingSort.th("deliverTo")}>Deliver to</Th>
                    <Th {...pendingSort.th("trackingNo")}>Tracking number(s)</Th>
                    <Th {...pendingSort.th("status")}>Status</Th>
                    <Th {...pendingSort.th("required")}>Tracking required</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingSort.sorted?.map((invoice) => (
                    <tr key={invoice.id} {...(invoice.invoiceNo ? rowLink(`/invoices/${encodeURIComponent(invoice.invoiceNo)}`) : {})}>
                      <Td>{invoice.orderId}</Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceNo(invoice.invoiceNo ?? "");
                            trackingRef.current?.focus();
                          }}
                          className="font-medium text-sky-700 hover:text-sky-900"
                        >
                          {text(invoice.invoiceNo)}
                        </button>
                      </Td>
                      <Td>{text(invoice.custTitle)}</Td>
                      <Td>{date(invoice.invoiceDate)}</Td>
                      <Td>
                        <span className="block max-w-40 truncate">
                          {text(invoice.delName ?? invoice.delAdr2)}
                        </span>
                      </Td>
                      <Td>
                        <TrackingNoCell
                          value={invoice.trackingNo?.trim() ?? ""}
                          saving={
                            trackingNoMutation.isPending &&
                            trackingNoMutation.variables?.id === invoice.id
                          }
                          onSave={(trackingNo) =>
                            trackingNoMutation.mutate({ id: invoice.id, trackingNo })
                          }
                        />
                      </Td>
                      <Td>
                        <Badge tone="amber">
                          {trackingStatusLabel[invoice.trackingStatus] ??
                            invoice.trackingStatus}
                        </Badge>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant={invoice.trackingRequired ? "secondary" : "ghost"}
                          loading={
                            requiredMutation.isPending &&
                            requiredMutation.variables?.id === invoice.id
                          }
                          onClick={() =>
                            requiredMutation.mutate({
                              id: invoice.id,
                              required: !invoice.trackingRequired,
                            })
                          }
                        >
                          {invoice.trackingRequired ? "Yes" : "No"}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * The Tracking Number(s) cell in the pending list. Editable free text like the old grid column
 * (TrackingEntry.frm): type to change it, and it is saved when you leave the cell or press Enter.
 * Escape puts back the saved value. Clearing it saves a blank.
 */
function TrackingNoCell({
  value,
  saving,
  onSave,
}: {
  value: string;
  saving: boolean;
  onSave: (trackingNo: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // Pick up the saved value when the list refetches (or a scan appends to it).
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const next = draft.trim();
    if (next === value) {
      setDraft(value);
      return;
    }
    onSave(next);
  };

  return (
    <Input
      className="w-56 text-xs"
      value={draft}
      maxLength={150}
      disabled={saving}
      aria-label="Tracking number(s)"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}