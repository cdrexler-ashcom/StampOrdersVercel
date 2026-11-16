"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ArchivedInvoiceDocument } from "@/components/ArchivedInvoiceDocument";
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Field,
  Input,
  Modal,
  Notice,
  Textarea,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { invoices } from "@/lib/endpoints";
import type { ArchiveHeader, ArchiveLine } from "@/types/api";

type Detail = { invoice: ArchiveHeader; lines: ArchiveLine[] };

/**
 * The old email text said "Please see attached PDF file." The new email carries the invoice details
 * in its body rather than a PDF, so the default says that instead.
 */
const DEFAULT_MESSAGE = "Please find your invoice below.";

const looksLikeAnEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Reprint Invoice — a port of Reprint.frm: pick ONE posted invoice by number and print, preview or
 * email it.
 *
 *  * Invoice No      Leaving the field looks the invoice up: it shows the customer's name and fills
 *                    the email address from the invoice. "Invoice number not found" if there is no
 *                    such invoice. Enter prints (Print was the form's default button). Esc leaves.
 *  * Print Delivery Docket   Prints the delivery docket (no prices) instead of the invoice.
 *  * Print / Preview Print opens the browser's print dialog; Preview shows the document first.
 *  * Email           Needs an address ("An email address must be entered."), asks "OK to email this
 *                    invoice?", then sends it with the Subject and Text typed in Email Details.
 *  * Exit            Leaves the screen.
 *
 * Differences from the legacy form: the document is printed by the browser, so the printer is chosen
 * in the print dialog; the email carries the invoice details in its body instead of a PDF
 * attachment (so Print Delivery Docket only affects Print and Preview); and the Subject is not
 * remembered between sessions (the legacy form saved it back to the Control record on exit).
 */
export function ReprintInvoicePanel() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [invoiceNo, setInvoiceNo] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [docket, setDocket] = useState(false);

  const [emailTo, setEmailTo] = useState("");
  const [subject, setSubject] = useState("");
  const subjectEdited = useRef(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [sent, setSent] = useState<{ tone: "green" | "amber" | "red"; text: string } | null>(null);

  const invoiceRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  /** Get_Email_Address: look the invoice up, show the customer and fill in the email address. */
  const lookup = async (raw: string): Promise<Detail | null> => {
    const no = raw.trim();
    setProblem(null);
    setSent(null); // a result belongs to the invoice it was sent for
    if (!no) {
      setDetail(null);
      return null;
    }
    try {
      const found = await queryClient.fetchQuery({
        queryKey: ["invoice", no],
        queryFn: () => invoices.historyDetail(no),
      });
      setDetail(found);
      setEmailTo(found.invoice.email?.trim() ?? "");
      if (!subjectEdited.current) setSubject(`Invoice ${no}`);
      return found;
    } catch (error) {
      setDetail(null);
      setProblem(
        error instanceof ApiError && error.status === 404
          ? "Invoice number not found"
          : error instanceof Error
            ? error.message
            : "The invoice could not be loaded.",
      );
      invoiceRef.current?.focus();
      return null;
    }
  };

  /** What every action starts with: an invoice number must be entered, and it must exist. */
  const ensureInvoice = async (): Promise<Detail | null> => {
    const no = invoiceNo.trim();
    if (!no) {
      setProblem("An Invoice number must be entered");
      invoiceRef.current?.focus();
      return null;
    }
    if (detail && detail.invoice.invoiceNo?.trim() === no) return detail;
    return lookup(no);
  };

  const preview = async () => {
    setSent(null);
    if (await ensureInvoice()) setPreviewOpen(true);
  };

  const print = async () => {
    setSent(null);
    if (await ensureInvoice()) setPrintRequested(true);
  };

  // The print area only exists once the invoice is loaded, so print after it has rendered.
  useEffect(() => {
    if (!printRequested || !detail) return;
    const handle = window.setTimeout(() => {
      window.print();
      setPrintRequested(false);
    }, 50);
    return () => window.clearTimeout(handle);
  }, [printRequested, detail]);

  const email = async () => {
    setSent(null);
    const to = emailTo.trim();
    if (!to) {
      setProblem("An email address must be entered.");
      emailRef.current?.focus();
      return;
    }
    if (!looksLikeAnEmail(to)) {
      setProblem("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    if (await ensureInvoice()) {
      setProblem(null);
      setConfirmEmail(true);
    }
  };

  const emailMutation = useMutation({
    mutationFn: () =>
      invoices.email(invoiceNo.trim(), emailTo.trim(), {
        subject: subject.trim(),
        message: message.trim(),
      }),
    onSuccess: (result) =>
      setSent(
        result.sent
          ? { tone: "green", text: `The invoice was sent successfully to ${result.recipient}.` }
          : { tone: "amber", text: result.message ?? "The invoice was not emailed." },
      ),
    onError: (error) =>
      setSent({
        tone: "red",
        text: error instanceof Error ? error.message : "The invoice could not be emailed.",
      }),
  });

  const documentName = docket ? "Delivery docket" : detail?.invoice.credit ? "Credit note" : "Invoice";

  return (
    <>
      <div className="no-print mx-auto max-w-2xl space-y-4">
        <Card>
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Invoice No" className="w-48">
                <Input
                  ref={invoiceRef}
                  value={invoiceNo}
                  autoFocus
                  onChange={(event) => setInvoiceNo(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  onBlur={() => void lookup(invoiceNo)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      // Print is the legacy form's default button, so Enter prints.
                      event.preventDefault();
                      void print();
                    } else if (event.key === "Escape") {
                      router.push("/");
                    }
                  }}
                />
              </Field>

              <p className="min-h-6 pb-2 text-sm font-medium text-slate-900">
                {detail?.invoice.custTitle ?? ""}
              </p>

              <div className="ml-auto pb-2">
                <Checkbox
                  label="Print Delivery Docket"
                  checked={docket}
                  onChange={(event) => setDocket(event.target.checked)}
                />
              </div>
            </div>

            <fieldset className="space-y-3 rounded border border-slate-200 p-3">
              <legend className="px-1 text-xs font-medium text-slate-500">Email Details</legend>

              <Field label="Email Address">
                <Input
                  ref={emailRef}
                  type="email"
                  value={emailTo}
                  onChange={(event) => setEmailTo(event.target.value)}
                />
              </Field>

              <Field label="Subject">
                <Input
                  value={subject}
                  maxLength={200}
                  onChange={(event) => {
                    subjectEdited.current = true;
                    setSubject(event.target.value);
                  }}
                />
              </Field>

              <Field label="Text">
                <Textarea
                  rows={4}
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </Field>
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => void print()}>
                Print
              </Button>
              <Button onClick={() => void preview()}>Preview</Button>
              <Button loading={emailMutation.isPending} onClick={() => void email()}>
                Email
              </Button>
              <Button onClick={() => router.push("/")}>Exit</Button>
            </div>
          </CardBody>
        </Card>

        {problem && (
          <Notice tone="amber" title="Reprint Invoice">
            {problem}
          </Notice>
        )}

        {sent && (
          <Notice tone={sent.tone} title="Email Invoice">
            {sent.text}
          </Notice>
        )}

        <Modal
          open={confirmEmail}
          onClose={() => setConfirmEmail(false)}
          title="Email Invoice"
          footer={
            <>
              <Button onClick={() => setConfirmEmail(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setConfirmEmail(false);
                  emailMutation.mutate();
                }}
              >
                OK
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-700">OK to email this invoice?</p>
        </Modal>

        <Modal
          open={previewOpen && detail !== null}
          onClose={() => setPreviewOpen(false)}
          title={`${documentName} ${detail?.invoice.invoiceNo?.trim() ?? ""}`}
          description="Preview"
          width="xl"
          footer={
            <>
              <Button onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button variant="primary" onClick={() => setPrintRequested(true)}>
                Print
              </Button>
            </>
          }
        >
          {detail && (
            <ArchivedInvoiceDocument invoice={detail.invoice} lines={detail.lines} docket={docket} />
          )}
        </Modal>
      </div>

      {/* The page's print copy: invisible on screen, and the only thing that prints. */}
      {detail && (
        <div className="hidden print:block">
          <ArchivedInvoiceDocument invoice={detail.invoice} lines={detail.lines} docket={docket} />
        </div>
      )}
    </>
  );
}
