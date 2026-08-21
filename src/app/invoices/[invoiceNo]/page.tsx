"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailRow,
  EmptyState,
  ErrorState,
  Notice,
  Spinner,
} from "@/components/ui";
import { invoices } from "@/lib/endpoints";
import {
  addressLines,
  date,
  money,
  qty as formatQty,
  text,
  trackingStatusLabel,
} from "@/lib/format";

type DocumentType = "invoice" | "docket";

/**
 * Invoice document.
 *
 * Replaces Reprint.Frm, ProForma.Frm, ReprintBatch.frm and the delivery docket path in
 * PrtInvoice.frm. Those were four screens producing three documents through Crystal
 * Reports and a printer selection dialog (SelectPrinter.frm, frmViewer.frm).
 *
 * Here the document is rendered in the page and printed by the browser, which also
 * gives PDF export and a preview for free. The invoice/docket toggle replaces the
 * separate "Print Delivery Docket" checkbox that appeared on each of those forms.
 */
export default function InvoiceDocumentPage() {
  const params = useParams<{ invoiceNo: string }>();
  const invoiceNo = decodeURIComponent(params.invoiceNo);
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");

  const query = useQuery({
    queryKey: ["invoice", invoiceNo],
    queryFn: () => invoices.historyDetail(invoiceNo),
  });

  if (query.isLoading) return <Spinner label="Loading invoice…" />;
  if (query.isError) return <ErrorState error={query.error} />;
  if (!query.data) return <EmptyState title="Invoice not found" />;

  const { invoice, lines } = query.data;
  const isDocket = documentType === "docket";

  const net = lines.reduce(
    (sum, line) => sum + ((line.totalPrice ?? 0) - (line.gst ?? 0)),
    0,
  );
  const gst = lines.reduce((sum, line) => sum + (line.gst ?? 0), 0);
  const gross = lines.reduce((sum, line) => sum + (line.totalPrice ?? 0), 0);

  const mailto = invoice.email?.trim()
    ? `mailto:${encodeURIComponent(invoice.email.trim())}?subject=${encodeURIComponent(
        `${invoice.credit ? "Credit note" : "Invoice"} ${invoice.invoiceNo ?? ""} — Stead Brothers`,
      )}`
    : null;

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Invoice history
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md ring-1 ring-inset ring-slate-300">
            <button
              type="button"
              onClick={() => setDocumentType("invoice")}
              className={`rounded-l-md px-3 py-1.5 text-xs font-medium ${
                !isDocket ? "bg-sky-700 text-oncolor" : "bg-white text-slate-600"
              }`}
            >
              {invoice.credit ? "Credit note" : "Invoice"}
            </button>
            <button
              type="button"
              onClick={() => setDocumentType("docket")}
              className={`rounded-r-md px-3 py-1.5 text-xs font-medium ${
                isDocket ? "bg-sky-700 text-oncolor" : "bg-white text-slate-600"
              }`}
            >
              Delivery docket
            </button>
          </div>

          {mailto && (
            <a href={mailto}>
              <Button>
                <Mail className="size-3.5" />
                Email
              </Button>
            </a>
          )}

          <Button variant="primary" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="print-page mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
            <div>
              <p className="text-lg font-semibold text-slate-900">Stead Brothers</p>
              <p className="text-xs text-slate-500">
                {text(invoice.invoiceComp, "Stamp manufacturing")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                {isDocket
                  ? "Delivery docket"
                  : invoice.credit
                    ? "Credit note"
                    : "Tax invoice"}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {text(invoice.invoiceNo)}
              </p>
              <p className="text-xs text-slate-500">
                {date(invoice.invoiceDate)}
              </p>
            </div>
          </header>

          <section className="grid gap-6 py-5 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice to
              </p>
              {addressLines(
                invoice.custTitle,
                invoice.invAdr1,
                invoice.invAdr2,
                invoice.invAdr3,
                invoice.invPostCode,
              ).map((line, index) => (
                <p key={index} className="text-sm text-slate-700">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Deliver to
              </p>
              {addressLines(
                invoice.delName,
                invoice.delAdr0,
                invoice.delAdr1,
                invoice.delAdr2,
                invoice.delAdr3,
              ).map((line, index) => (
                <p key={index} className="text-sm text-slate-700">
                  {line}
                </p>
              ))}
            </div>
          </section>

          <table className="w-full border-t border-slate-200 text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-2 text-left font-medium">Job</th>
                <th className="py-2 text-left font-medium">Product</th>
                <th className="py-2 text-left font-medium">Details</th>
                <th className="py-2 text-left font-medium">Colour</th>
                <th className="py-2 text-right font-medium">Qty</th>
                {!isDocket && (
                  <>
                    <th className="py-2 text-right font-medium">Price</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={`${line.orderId}-${line.jobNo}`}>
                  <td className="py-2 text-slate-700">{line.jobNo}</td>
                  <td className="py-2 text-slate-700">{line.product}</td>
                  <td className="py-2 text-slate-700">{text(line.details)}</td>
                  <td className="py-2 text-slate-700">
                    {text(line.colourDesc ?? line.colour)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-700">
                    {formatQty(line.qty)}
                  </td>
                  {!isDocket && (
                    <>
                      <td className="py-2 text-right tabular-nums text-slate-700">
                        {money(line.price)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium text-slate-900">
                        {money(line.totalPrice)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!isDocket && (
            <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
              <dl className="w-56 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Net</dt>
                  <dd className="tabular-nums text-slate-700">{money(net)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">GST</dt>
                  <dd className="tabular-nums text-slate-700">{money(gst)}</dd>
                </div>
                {invoice.freightApplies && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Freight</dt>
                    <dd className="tabular-nums text-slate-700">
                      {money(invoice.freight)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <dt className="font-semibold text-slate-900">Total</dt>
                  <dd className="tabular-nums font-semibold text-slate-900">
                    {money(gross)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {invoice.note?.trim() && (
            <p className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-600">
              {invoice.note}
            </p>
          )}
        </article>

        <aside className="no-print space-y-4">
          <Card>
            <CardHeader title="Invoice" />
            <CardBody>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Order">
                  <Link
                    href={`/orders/${invoice.orderId}`}
                    className="text-sky-700 hover:text-sky-900"
                  >
                    {invoice.orderId}
                  </Link>
                </DetailRow>
                <DetailRow label="Order date">{date(invoice.date)}</DetailRow>
                <DetailRow label="Run">{text(invoice.runNo)}</DetailRow>
                <DetailRow label="Bin">{invoice.binNo ?? "—"}</DetailRow>
                <DetailRow label="Paid">{invoice.paid ? "Yes" : "No"}</DetailRow>
                <DetailRow label="Email">{text(invoice.email)}</DetailRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Despatch" />
            <CardBody className="space-y-2">
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Status">
                  <Badge
                    tone={
                      invoice.trackingStatus === "Complete"
                        ? "green"
                        : invoice.trackingStatus === "ReadyToEmail"
                          ? "amber"
                          : "slate"
                    }
                  >
                    {trackingStatusLabel[invoice.trackingStatus] ??
                      invoice.trackingStatus}
                  </Badge>
                </DetailRow>
                <DetailRow label="Consignment">
                  {text(invoice.trackingNo)}
                </DetailRow>
                <DetailRow label="Notified">
                  {invoice.emailSent ? date(invoice.emailSent) : "—"}
                </DetailRow>
              </dl>

              <Link href="/despatch">
                <Button size="sm" className="w-full">
                  Open despatch
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Notice tone="slate" title="Sending">
            The API does not expose a send endpoint, so Email opens your mail client with
            the customer address and subject filled in. Attach the printed PDF to send it.
          </Notice>
        </aside>
      </div>
    </>
  );
}
