"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Send } from "lucide-react";
import Link from "next/link";
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
export default function DespatchPage() {
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
                    <Th>Invoice</Th>
                    <Th>Customer</Th>
                    <Th>Invoice date</Th>
                    <Th>Deliver to</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.data?.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
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
                      <Td align="right">
                        {invoice.invoiceNo && (
                          <Link
                            href={`/invoices/${encodeURIComponent(invoice.invoiceNo)}`}
                            className="text-xs font-medium text-sky-700 hover:text-sky-900"
                          >
                            Open
                          </Link>
                        )}
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
            />

            {awaiting.isLoading ? (
              <Spinner />
            ) : (awaiting.data?.length ?? 0) === 0 ? (
              <EmptyState title="No notifications outstanding" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Customer</Th>
                    <Th>Consignment</Th>
                    <Th>Email</Th>
                    <Th>Notified</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {awaiting.data?.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
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
                            <a
                              href={`mailto:${encodeURIComponent(
                                invoice.email.trim(),
                              )}?subject=${encodeURIComponent(
                                `Despatch notification — invoice ${invoice.invoiceNo ?? ""}`,
                              )}&body=${encodeURIComponent(
                                `Your order has been despatched.\n\nInvoice: ${
                                  invoice.invoiceNo ?? ""
                                }\nConsignment: ${invoice.trackingNo ?? ""}\n`,
                              )}`}
                            >
                              <Button size="sm">
                                <Send className="size-3" />
                                Email
                              </Button>
                            </a>
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
