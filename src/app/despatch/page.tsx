"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
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
import { ScanTrackingDialog } from "@/components/ScanTrackingDialog";
import { tracking } from "@/lib/endpoints";
import { date, text } from "@/lib/format";
import type { DespatchLabels } from "@/types/api";

/**
 * Despatch — the old Tracking Entry screen (TrackingEntry.frm).
 *
 * The grid lists invoices still awaiting tracking, with the same columns: Order Number, Customer,
 * Date, Invoice Number, Tracking Number(s) (editable) and Required (a Yes/No button). Two buttons:
 *
 *  * Scan    opens the Scan Tracking dialog (TrackAdd.frm) — see ScanTrackingDialog.
 *  * Process asks to confirm, then moves invoices on: tracked ones to ready-to-email (or complete
 *            when there is no email address), and ones not requiring tracking to complete.
 *
 * Sending the despatch emails is not on this screen yet; it is planned as its own tab.
 */
export default function DespatchPage() {
  const queryClient = useQueryClient();

  const [scanOpen, setScanOpen] = useState(false);
  const [confirmProcess, setConfirmProcess] = useState(false);
  const [labelsToPrint, setLabelsToPrint] = useState<DespatchLabels | null>(null);

  const pending = useQuery({
    queryKey: ["tracking", "pending"],
    queryFn: () => tracking.pending(),
  });

  // The grid's editable Tracking Number(s) column: free text, saved when you leave the cell.
  const trackingNoMutation = useMutation({
    mutationFn: (vars: { id: number; trackingNo: string }) =>
      tracking.setTrackingNo(vars.id, vars.trackingNo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  // The grid's Required column: whether a pending invoice needs a consignment number.
  const requiredMutation = useMutation({
    mutationFn: (vars: { id: number; required: boolean }) =>
      tracking.setRequired(vars.id, vars.required),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  const advanceMutation = useMutation({
    mutationFn: () => tracking.advance(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  return (
    <>
      <DespatchLabelPrint labels={labelsToPrint} onDone={() => setLabelsToPrint(null)} />

      <PageHeader
        title="Despatch"
        description="Tracking entry: scan consignment numbers and process tracking."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setScanOpen(true)}>
              <ScanLine className="size-3.5" />
              Scan
            </Button>
            <Button loading={advanceMutation.isPending} onClick={() => setConfirmProcess(true)}>
              Process
            </Button>
          </div>
        }
      />

      <ScanTrackingDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onPrint={setLabelsToPrint}
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

      <Card>
        <CardHeader
          title="Awaiting tracking"
          description={`${pending.data?.length ?? 0} invoice(s)`}
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
                <Th>Order Number</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Invoice Number</Th>
                <Th>Tracking Number(s)</Th>
                <Th>Required</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.data?.map((invoice) => (
                <tr key={invoice.id}>
                  <Td>{invoice.orderId}</Td>
                  <Td>{text(invoice.custTitle)}</Td>
                  <Td>{date(invoice.date)}</Td>
                  <Td>{text(invoice.invoiceNo)}</Td>
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
    </>
  );
}

/**
 * The Tracking Number(s) cell. Editable free text like the old grid column (TrackingEntry.frm):
 * type to change it, and it is saved when you leave the cell or press Enter. Escape puts back the
 * saved value. Clearing it saves a blank.
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
      className="w-72 text-xs"
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