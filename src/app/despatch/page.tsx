"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Send } from "lucide-react";
import { useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { tracking } from "@/lib/endpoints";
import { date, dateTime, text, trackingStatusLabel } from "@/lib/format";
import { useSortableTable } from "@/lib/useSortableTable";
import type { AddTrackingRequest } from "@/types/api";

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

  const invoiceRef = useRef<HTMLInputElement>(null);
  const trackingRef = useRef<HTMLInputElement>(null);

  const pending = useQuery({
    queryKey: ["tracking", "pending"],
    queryFn: () => tracking.pending(),
  });

  const awaiting = useQuery({
    queryKey: ["tracking", "awaiting-notification"],
    queryFn: () => tracking.awaitingNotification(),
  });

  // Sorted client-side: neither /api/tracking/pending nor /api/tracking/awaiting-notification
  // has a cap — each is already scoped to a specific tracking-status queue (pending, or
  // ready-to-email), so it's an inherently bounded working set rather than an open-ended
  // archive. No full-dataset-vs-capped-page correctness issue to work around here. The two
  // tables sort independently.
  const pendingSort = useSortableTable(
    pending.data,
    {
      invoiceNo: (i) => i.invoiceNo,
      custTitle: (i) => i.custTitle,
      invoiceDate: (i) => (i.invoiceDate ? new Date(i.invoiceDate).getTime() : null),
      deliverTo: (i) => i.delName ?? i.delAdr2,
      status: (i) => trackingStatusLabel[i.trackingStatus] ?? i.trackingStatus,
    },
    undefined,
    "asc",
    "despatch:pending-sort",
  );

  const awaitingSort = useSortableTable(
    awaiting.data,
    {
      invoiceNo: (i) => i.invoiceNo,
      custTitle: (i) => i.custTitle,
      trackingNo: (i) => i.trackingNo,
      email: (i) => i.email,
      emailSent: (i) => (i.emailSent ? new Date(i.emailSent).getTime() : null),
    },
    undefined,
    "asc",
    "despatch:awaiting-sort",
  );

  const addMutation = useMutation({
    mutationFn: (body: AddTrackingRequest) => tracking.add(body),
    onSuccess: (_data, variables) => {
      setLastCaptured(variables.invoiceNo);
      setInvoiceNo("");
      setTrackingNo("");
      invoiceRef.current?.focus();
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: () => tracking.advance(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  const notifyMutation = useMutation({
    mutationFn: (archiveId: number) => tracking.markNotified(archiveId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracking"] }),
  });

  // Real SMTP send of a single despatch notification (E1). On success the API stamps EmailSent,
  // so the row drops out of the awaiting list when the query refetches.
  const sendMutation = useMutation({
    mutationFn: (archiveId: number) => tracking.sendNotification(archiveId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
      setSendResult(
        result.sent
          ? { tone: "green", text: `Despatch notification sent to ${result.recipient}.` }
          : { tone: "amber", text: result.message ?? "The notification was not sent." },
      );
    },
    onError: (error) =>
      setSendResult({
        tone: "red",
        text: error instanceof Error ? error.message : "The notification could not be sent.",
      }),
  });

  // Send every awaiting notification in one go (E1). Reports how many succeeded/failed.
  const sendAllMutation = useMutation({
    mutationFn: () => tracking.sendAllNotifications(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
      setSendResult({
        tone: result.failed > 0 ? "amber" : "green",
        text:
          result.total === 0
            ? "There were no notifications to send."
            : `Sent ${result.sent} of ${result.total} notification(s)` +
              (result.failed > 0 ? `, ${result.failed} failed.` : "."),
      });
    },
    onError: (error) =>
      setSendResult({
        tone: "red",
        text: error instanceof Error ? error.message : "The notifications could not be sent.",
      }),
  });

  const [sendResult, setSendResult] = useState<{ tone: "green" | "amber" | "red"; text: string } | null>(null);

  const capture = () => {
    if (!invoiceNo.trim() || !trackingNo.trim()) return;
    addMutation.mutate({
      invoiceNo: invoiceNo.trim(),
      trackingNo: trackingNo.trim(),
    });
  };

  return (
    <>
      <PageHeader
        title="Despatch"
        description="Capture consignment numbers and send despatch notifications."
        actions={
          <Button
            loading={advanceMutation.isPending}
            onClick={() => advanceMutation.mutate()}
          >
            Advance tracking status
          </Button>
        }
      />

      {advanceMutation.isSuccess && advanceMutation.data && (
        <div className="mb-4">
          <Notice tone="green" title="Tracking advanced">
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
                    <Th {...pendingSort.th("invoiceNo")}>Invoice</Th>
                    <Th {...pendingSort.th("custTitle")}>Customer</Th>
                    <Th {...pendingSort.th("invoiceDate")}>Invoice date</Th>
                    <Th {...pendingSort.th("deliverTo")}>Deliver to</Th>
                    <Th {...pendingSort.th("status")}>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingSort.sorted?.map((invoice) => (
                    <tr key={invoice.id} {...(invoice.invoiceNo ? rowLink(`/invoices/${encodeURIComponent(invoice.invoiceNo)}`) : {})}>
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
                        <Badge tone="amber">
                          {trackingStatusLabel[invoice.trackingStatus] ??
                            invoice.trackingStatus}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Ready to notify"
              description="Invoices with a consignment number, awaiting a despatch notification."
              actions={
                <div className="flex items-center gap-2">
                  {awaitingSort.isSorted && (
                    <Button size="sm" variant="ghost" onClick={awaitingSort.clear}>
                      Clear sorting
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={(awaiting.data?.length ?? 0) === 0}
                    loading={sendAllMutation.isPending}
                    onClick={() => sendAllMutation.mutate()}
                  >
                    <Send className="size-3" />
                    Send all awaiting
                  </Button>
                </div>
              }
            />

            {sendResult && (
              <div className="px-4 pt-3">
                <Notice tone={sendResult.tone} title="Despatch email">
                  {sendResult.text}
                </Notice>
              </div>
            )}

            {awaiting.isLoading ? (
              <Spinner />
            ) : (awaiting.data?.length ?? 0) === 0 ? (
              <EmptyState title="No notifications outstanding" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th {...awaitingSort.th("invoiceNo")}>Invoice</Th>
                    <Th {...awaitingSort.th("custTitle")}>Customer</Th>
                    <Th {...awaitingSort.th("trackingNo")}>Consignment</Th>
                    <Th {...awaitingSort.th("email")}>Email</Th>
                    <Th {...awaitingSort.th("emailSent")}>Notified</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {awaitingSort.sorted?.map((invoice) => (
                    <tr key={invoice.id} {...(invoice.invoiceNo ? rowLink(`/invoices/${encodeURIComponent(invoice.invoiceNo)}`) : {})}>
                      <Td>
                        <span className="font-medium text-slate-900">
                          {text(invoice.invoiceNo)}
                        </span>
                      </Td>
                      <Td>{text(invoice.custTitle)}</Td>
                      <Td>
                        <span className="text-xs">{text(invoice.trackingNo)}</span>
                      </Td>
                      <Td>
                        <span className="block max-w-40 truncate text-xs">
                          {text(invoice.email)}
                        </span>
                      </Td>
                      <Td>
                        {invoice.emailSent ? dateTime(invoice.emailSent) : "—"}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          {invoice.email?.trim() && (
                            <Button
                              size="sm"
                              loading={
                                sendMutation.isPending &&
                                sendMutation.variables === invoice.id
                              }
                              onClick={() => sendMutation.mutate(invoice.id)}
                            >
                              <Send className="size-3" />
                              Send email
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="primary"
                            loading={
                              notifyMutation.isPending &&
                              notifyMutation.variables === invoice.id
                            }
                            onClick={() => notifyMutation.mutate(invoice.id)}
                          >
                            Mark notified
                          </Button>
                        </div>
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
