"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Field,
  Input,
  Modal,
  Notice,
  Spinner,
} from "@/components/ui";
import { ArchivedInvoiceDocument } from "@/components/ArchivedInvoiceDocument";
import { invoices } from "@/lib/endpoints";
import {
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

  const queryClient = useQueryClient();
  const [emailResult, setEmailResult] = useState<{
    tone: "green" | "amber" | "red";
    text: string;
  } | null>(null);

  const query = useQuery({
    queryKey: ["invoice", invoiceNo],
    queryFn: () => invoices.historyDetail(invoiceNo),
  });

  // Email invoice asks first and shows the recipient, which can be changed (customer feedback,
  // Nov 2026): the button no longer sends on the first click.
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  // Real SMTP send of the invoice to the customer (E1). The invoice's stored address is used
  // unless the operator typed a different one, which is sent as the API's toOverride.
  const emailMutation = useMutation({
    mutationFn: (to: string) => {
      const stored = query.data?.invoice.email?.trim() ?? "";
      return invoices.email(invoiceNo, to !== stored ? to : undefined);
    },
    onSettled: () => setEmailOpen(false),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceNo] });
      setEmailResult(
        result.sent
          ? { tone: "green", text: `Invoice emailed to ${result.recipient}.` }
          : { tone: "amber", text: result.message ?? "The invoice was not emailed." },
      );
    },
    onError: (error) =>
      setEmailResult({
        tone: "red",
        text: error instanceof Error ? error.message : "The invoice could not be emailed.",
      }),
  });

  if (query.isLoading) return <Spinner label="Loading invoice…" />;
  if (query.isError) return <ErrorState error={query.error} />;
  if (!query.data) return <EmptyState title="Invoice not found" />;

  const { invoice, lines } = query.data;
  const isDocket = documentType === "docket";


  const hasEmail = Boolean(invoice.email?.trim());
  const emailTarget = emailTo.trim();
  const emailChanged = emailTarget !== (invoice.email?.trim() ?? "");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTarget);
  const documentName = invoice.credit ? "credit note" : "invoice";

  const openEmail = () => {
    setEmailTo(invoice.email?.trim() ?? "");
    setEmailResult(null);
    setEmailOpen(true);
  };

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          History
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

          <Button loading={emailMutation.isPending} onClick={openEmail}>
            <Mail className="size-3.5" />
            Email invoice
          </Button>

          <Button variant="primary" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <ArchivedInvoiceDocument invoice={invoice} lines={lines} docket={isDocket} />

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

          {emailResult ? (
            <Notice tone={emailResult.tone} title="Email">
              {emailResult.text}
            </Notice>
          ) : (
            <Notice tone="slate" title="Emailing">
              {hasEmail
                ? "Email invoice asks you to confirm, and lets you change the address first. The server sends it."
                : "This invoice has no stored email address. Enter one when you email it."}
            </Notice>
          )}
        </aside>
      </div>

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={`Email ${documentName}`}
        description={`${invoice.credit ? "Credit note" : "Invoice"} ${invoiceNo}`}
        bodyOverflow="visible"
        footer={
          <>
            <Button onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={emailMutation.isPending}
              disabled={!emailValid}
              onClick={() => emailMutation.mutate(emailTarget)}
            >
              <Mail className="size-3.5" />
              Send
            </Button>
          </>
        }
      >
        <Field
          label="Send to"
          error={emailTarget && !emailValid ? "Enter a valid email address." : undefined}
          hint={
            emailChanged && emailValid
              ? hasEmail
                ? `Differs from the address on the invoice (${invoice.email?.trim()}). This send only; the invoice keeps its address.`
                : "The invoice has no stored address. This send only."
              : "The address stored on the invoice. Change it to send somewhere else."
          }
        >
          <Input
            type="email"
            autoFocus
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && emailValid && !emailMutation.isPending) {
                e.preventDefault();
                emailMutation.mutate(emailTarget);
              }
            }}
          />
        </Field>
      </Modal>
    </>
  );
}
