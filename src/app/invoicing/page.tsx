"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
import { invoices, orders } from "@/lib/endpoints";
import { date, dateInput, documentTotals, money, text } from "@/lib/format";
import { printReportHtml } from "@/lib/print";
import { fetchReportHtml } from "@/lib/reports";
import type { InvoiceHeader, InvoiceRunRequest, InvoiceRunResult } from "@/types/api";

/**
 * Invoice run.
 *
 * Replaces PrtInvoice.frm, EmailInvoices.frm, ReprintBatch.frm and the run-number boxes
 * that were scattered across them. The API separates staging from posting deliberately
 * ("Stages orders and allocates invoice numbers. Does not post."), so the screen is built
 * around that: select, stage, review, then commit.
 *
 * The legacy application allocated numbers and printed in one irreversible action. Here
 * the review step sits between the two.
 */
export default function InvoicingPage() {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"runRange" | "selected">("runRange");
  const [startRun, setStartRun] = useState("");
  const [endRun, setEndRun] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(dateInput(new Date()));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // POST /api/invoices/runs/stage returns the staged headers, not a run summary — the
  // net/GST figures are derived from their lines the same way the review table below is.
  const [stageResult, setStageResult] = useState<InvoiceHeader[] | null>(null);
  const [postResult, setPostResult] = useState<InvoiceRunResult | null>(null);
  const [printDockets, setPrintDockets] = useState(true);
  // Set once the dockets have been sent to the printer; holds how many, and drives the
  // "did they print correctly?" confirmation that gates posting.
  const [docketCheck, setDocketCheck] = useState<number | null>(null);

  const liveOrders = useQuery({ queryKey: ["orders", {}], queryFn: () => orders.list() });
  const staged = useQuery({
    queryKey: ["invoices", "staged"],
    queryFn: () => invoices.staged(),
  });

  const stageMutation = useMutation({
    mutationFn: (body: InvoiceRunRequest) => invoices.stageRun(body),
    onSuccess: (result) => {
      setStageResult(result);
      setPostResult(null);
      setDocketCheck(null);
      queryClient.invalidateQueries({ queryKey: ["invoices", "staged"] });
    },
  });

  // Legacy PrtInvoice.frm printed the delivery dockets between staging and posting, then asked
  // "N delivery docket(s) should have been printed. Have they printed correctly?" and only
  // posted on Yes. The DelDocket report reads the staging tables, which posting empties, so
  // this order is required, not just a courtesy. Dockets are the staged invoices flagged
  // DirectDel — the API sets that from the run number (runs 1, 2, 5, 6).
  const docketMutation = useMutation({
    mutationFn: async () => {
      const html = await fetchReportHtml("DelDocket", "html", { directDel: true });
      printReportHtml(html);
    },
    onSuccess: () => setDocketCheck(docketCount),
  });

  // Legacy ReprintBatch.frm: reprint the last batch's dockets (DirectDel only). Posting empties
  // staging, so the API reads the last posted batch back from the archive.
  const reprintMutation = useMutation({
    mutationFn: async () => {
      const html = await fetchReportHtml("DelDocket", "html", {
        directDel: true,
        lastBatch: true,
      });
      printReportHtml(html);
    },
  });

  const postMutation = useMutation({
    mutationFn: () => invoices.postStaged(),
    onSuccess: (result) => {
      setPostResult(result);
      setStageResult(null);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
  });

  const toggle = (orderId: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const stage = () => {
    const body: InvoiceRunRequest = {
      invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : null,
    };

    if (mode === "selected") {
      body.orderIds = Array.from(selected);
    } else {
      body.startRun = startRun.trim() ? Number(startRun) : null;
      body.endRun = endRun.trim() ? Number(endRun) : null;
    }

    stageMutation.mutate(body);
  };

  const stagedCount = staged.data?.length ?? 0;
  const docketCount = staged.data?.filter((header) => header.directDel).length ?? 0;
  const stagedTotals = stageResult?.reduce(
    (acc, header) => {
      const totals = documentTotals(header.lines ?? []);
      return { net: acc.net + totals.net, gst: acc.gst + totals.gst };
    },
    { net: 0, gst: 0 },
  );
  const canStage =
    mode === "selected" ? selected.size > 0 : startRun.trim() !== "" || endRun.trim() !== "";

  return (
    <>
      <PageHeader
        title="Invoice run"
        description="Stage a run to allocate invoice numbers, review it, then post."
      />

      {postResult && (
        <div className="mb-4">
          <Notice tone="green" title={`Posted ${postResult.invoiceCount} invoice(s)`}>
            Net {money(postResult.totalNet)} · GST {money(postResult.totalGst)}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="1. Select orders"
              description="By run number range, or by picking individual orders."
            />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={mode === "runRange"}
                    onChange={() => setMode("runRange")}
                    className="size-4 border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  Run number range
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={mode === "selected"}
                    onChange={() => setMode("selected")}
                    className="size-4 border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  Selected orders ({selected.size})
                </label>
              </div>

              {mode === "runRange" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Start run">
                    <Input
                      type="number"
                      value={startRun}
                      onChange={(e) => setStartRun(e.target.value)}
                    />
                  </Field>
                  <Field label="End run">
                    <Input
                      type="number"
                      value={endRun}
                      onChange={(e) => setEndRun(e.target.value)}
                    />
                  </Field>
                  <Field label="Invoice date">
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {mode === "selected" && (
                <>
                  <Field label="Invoice date" className="max-w-52">
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </Field>

                  {liveOrders.isLoading ? (
                    <Spinner />
                  ) : (liveOrders.data?.length ?? 0) === 0 ? (
                    <EmptyState title="No live orders to invoice" />
                  ) : (
                    <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200">
                      <Table>
                        <thead className="sticky top-0 bg-slate-50">
                          <tr>
                            <Th />
                            <Th>Order</Th>
                            <Th>Customer</Th>
                            <Th>Date</Th>
                            <Th>Run</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {liveOrders.data?.map((order) => (
                            <tr key={order.orderId} className="hover:bg-slate-50">
                              <Td>
                                <input
                                  type="checkbox"
                                  checked={selected.has(order.orderId)}
                                  onChange={() => toggle(order.orderId)}
                                  className="size-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                                />
                              </Td>
                              <Td>{order.orderId}</Td>
                              <Td>{text(order.custTitle)}</Td>
                              <Td>{date(order.date)}</Td>
                              <Td>{text(order.runNo)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              )}

              {stageMutation.isError && (
                <Notice tone="red" title="Staging failed">
                  {(stageMutation.error as Error).message}
                </Notice>
              )}

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={stage}
                  loading={stageMutation.isPending}
                  disabled={!canStage}
                >
                  Stage run
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="2. Review staged invoices"
              description="Invoice numbers are allocated. Nothing is committed until you post."
              actions={
                stagedCount > 0 ? (
                  <Badge tone="amber">{stagedCount} staged</Badge>
                ) : undefined
              }
            />

            {staged.isLoading ? (
              <Spinner />
            ) : staged.isError ? (
              <ErrorState error={staged.error} />
            ) : stagedCount === 0 ? (
              <EmptyState
                title="Nothing staged"
                description="Stage a run above to see it here."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Date</Th>
                    <Th align="right">Lines</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staged.data?.map((invoice) => (
                    <tr key={invoice.invoiceNo ?? invoice.orderId}>
                      <Td>
                        <span className="font-medium text-slate-900">
                          {text(invoice.invoiceNo)}
                        </span>
                        {invoice.credit && (
                          <Badge tone="violet" className="ml-2">
                            Credit
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        <Link
                          href={`/orders/${invoice.orderId}`}
                          className="text-sky-700 hover:text-sky-900"
                        >
                          {invoice.orderId}
                        </Link>
                      </Td>
                      <Td>{text(invoice.custTitle)}</Td>
                      <Td>{date(invoice.invoiceDate)}</Td>
                      <Td align="right">{invoice.lines?.length ?? 0}</Td>
                      <Td align="right">
                        {money(documentTotals(invoice.lines ?? []).gross)}
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
            <CardHeader title="3. Post" />
            <CardBody className="space-y-3">
              <p className="text-sm text-slate-600">
                Posting writes the ledger and archive, releases bins, and removes the
                orders from the live list.
              </p>

              {stageResult && stagedTotals && (
                <Notice tone="amber" title="Staged and ready">
                  {stageResult.length} invoice(s) · Net {money(stagedTotals.net)} · GST{" "}
                  {money(stagedTotals.gst)}
                </Notice>
              )}

              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={printDockets}
                  disabled={docketCheck !== null}
                  onChange={(e) => setPrintDockets(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>
                  Generate delivery dockets for all invoices in the run
                  <span className="block text-xs text-slate-500">
                    {stagedCount === 0
                      ? "Printed before posting; you confirm they printed before it posts."
                      : docketCount > 0
                        ? `${docketCount} of ${stagedCount} staged invoice(s) are on a delivery docket run (1, 2, 5, 6).`
                        : "None of the staged invoices are on a delivery docket run (1, 2, 5, 6)."}
                  </span>
                </span>
              </label>

              {(docketMutation.isError || reprintMutation.isError) && (
                <Notice tone="red" title="Delivery dockets failed">
                  {((docketMutation.error ?? reprintMutation.error) as Error).message}
                </Notice>
              )}

              {postMutation.isError && (
                <Notice tone="red" title="Posting failed">
                  {(postMutation.error as Error).message}
                </Notice>
              )}

              {docketCheck !== null ? (
                <Notice tone="amber" title="Delivery dockets">
                  <p>
                    {docketCheck} delivery docket(s) should have been printed. Have they
                    printed correctly?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={postMutation.isPending}
                      onClick={() => {
                        setDocketCheck(null);
                        postMutation.mutate();
                      }}
                    >
                      Yes, post
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={postMutation.isPending}
                      onClick={() => setDocketCheck(null)}
                    >
                      No, don&apos;t post
                    </Button>
                  </div>
                </Notice>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  loading={postMutation.isPending || docketMutation.isPending}
                  disabled={stagedCount === 0}
                  onClick={() =>
                    printDockets && docketCount > 0
                      ? docketMutation.mutate()
                      : postMutation.mutate()
                  }
                >
                  <CheckCircle2 className="size-3.5" />
                  {printDockets && docketCount > 0
                    ? `Print dockets, then post ${stagedCount} invoice(s)`
                    : `Post ${stagedCount > 0 ? `${stagedCount} invoice(s)` : "staged run"}`}
                </Button>
              )}

              <Button
                variant="secondary"
                className="w-full"
                loading={reprintMutation.isPending}
                onClick={() => reprintMutation.mutate()}
              >
                <Printer className="size-3.5" />
                Reprint last batch delivery dockets
              </Button>
            </CardBody>
          </Card>

          {postResult && postResult.invoices.length > 0 && (
            <Card>
              <CardHeader
                title="Posted"
                description="Open an invoice to print or send it."
              />
              <CardBody className="space-y-1.5">
                {postResult.invoices.map((invoice) => (
                  <Link
                    key={invoice.archiveId}
                    href={`/invoices/${encodeURIComponent(invoice.invoiceNo ?? "")}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm hover:bg-slate-100"
                  >
                    <span className="min-w-0 truncate">
                      <FileText className="mr-1.5 inline size-3.5 text-slate-400" />
                      <span className="font-medium text-slate-900">
                        {text(invoice.invoiceNo)}
                      </span>
                      <span className="text-slate-500">
                        {" "}
                        — {text(invoice.customerTitle)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {money(invoice.grossAmount)}
                    </span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
