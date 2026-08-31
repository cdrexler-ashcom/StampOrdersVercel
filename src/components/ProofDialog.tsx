"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Eye, RefreshCw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { proofs } from "@/lib/endpoints";
import { printHtml } from "@/lib/print";
import type { ProofEmailRequest, ProofPreviewRequest } from "@/types/api";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Notice,
  Select,
  Spinner,
  Textarea,
} from "./ui";

/**
 * Proof preview and email — the web equivalent of ProofSQL's frmSelect, minus its fax output
 * (the legacy fax server is gone). Preview renders the document in an iframe; Email sends it to
 * the customer as a PDF attachment via POST /api/proofs/email (see ProofEndpoints.cs).
 *
 * A standalone dialog rather than something baked into the order line row, because the job
 * number is all it needs: opened here from the order line's Proof button, but nothing about
 * it depends on being on that screen. Drive it from anywhere by setting a job number — a
 * despatch scan, a job-number search box — and rendering this once.
 *
 * Job lookup (GET /api/proofs/{jobNo}) seeds the form the way txJobNo_Validate populated the
 * legacy screen's controls; nothing is persisted until Preview is pressed, and even then the
 * API only renders a document — see ProofService.BuildAsync.
 */
export function ProofDialog({
  jobNo,
  onClose,
}: {
  jobNo: string | null;
  onClose: () => void;
}) {
  const open = jobNo !== null;

  const jobQuery = useQuery({
    queryKey: ["proof", "job", jobNo],
    queryFn: () => proofs.job(jobNo!),
    enabled: open,
    retry: false,
  });
  const job = jobQuery.data;

  // The stamp design image, like the job lookup and the preview, has to go through the
  // authenticated client rather than a bare <img src> — since auth (H1/H2) a plain browser
  // image request carries no bearer token and the API returns 401 (see api.getBlob).
  const imageQuery = useQuery({
    queryKey: ["proof", "image", job?.jobNo],
    queryFn: ({ signal }) => api.getBlob(proofs.imageUrl(job!.jobNo), signal),
    enabled: Boolean(job?.stampImageAvailable),
    retry: false,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!imageQuery.data) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageQuery.data);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageQuery.data]);

  const [custTitle, setCustTitle] = useState("");
  const [prodName, setProdName] = useState("");
  const [colourId, setColourId] = useState("");
  const [priceCode, setPriceCode] = useState("0");
  const [price, setPrice] = useState("");
  const [discPct, setDiscPct] = useState("0");
  const [email, setEmail] = useState("");
  const [invoiceComp, setInvoiceComp] = useState("");
  const [subject, setSubject] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [messageText, setMessageText] = useState("");
  const [extraText, setExtraText] = useState("");
  const [noProofHeader, setNoProofHeader] = useState(false);
  const [useCustomerLetterHead, setUseCustomerLetterHead] = useState(true);
  const [deliveryIncluded, setDeliveryIncluded] = useState(false);
  const [deliveryAmt, setDeliveryAmt] = useState("0.00");

  const messageTextRef = useRef<HTMLTextAreaElement>(null);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<{
    tone: "green" | "amber" | "red";
    text: string;
  } | null>(null);

  // Seed the form from the job lookup whenever the dialog opens for a (possibly different)
  // job. Keyed on jobNo so reopening on another line re-seeds rather than keeping stale values.
  useEffect(() => {
    if (!open || !job) return;

    setCustTitle(job.custTitle);
    setProdName(job.prodName);
    setColourId(job.colourId ?? "");
    setPriceCode(String(job.priceCode));
    setPrice(job.price.toFixed(2));
    setDiscPct(String(job.discPct));
    setEmail(job.email);
    setInvoiceComp(job.invoiceComp);
    setSubject(job.subject);
    setEmailFrom(job.emailFrom);
    setMessageText(job.messageText);
    setExtraText("");
    setNoProofHeader(job.noProofHeader);
    setUseCustomerLetterHead(Boolean(job.proofHeader));
    setDeliveryIncluded(false);
    setDeliveryAmt(job.deliveryAmt.toFixed(2));
    setPreviewHtml(null);
    setEmailResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.jobNo]);

  const previewMutation = useMutation({
    mutationFn: (body: ProofPreviewRequest) => proofs.preview(body),
    onSuccess: (html) => setPreviewHtml(html),
  });

  // Real SMTP send of the proof to the customer, with the rendered proof PDF attached —
  // ProofSQL's btAccept_Click / EmailProof.
  const emailMutation = useMutation({
    mutationFn: (body: ProofEmailRequest) => proofs.email(body),
    onSuccess: (result) =>
      setEmailResult(
        result.sent
          ? { tone: "green", text: `Proof emailed to ${result.recipient}.` }
          : { tone: "amber", text: result.message ?? "The proof was not emailed." },
      ),
    onError: (error) =>
      setEmailResult({
        tone: "red",
        text: error instanceof Error ? error.message : "The proof could not be emailed.",
      }),
  });

  const selectedColour = job?.colours.find((c) => c.colourId === colourId);

  const problems: string[] = [];
  if (price === "" || !Number.isFinite(Number(price)))
    problems.push("Price must be a number.");
  if (!Number.isFinite(Number(discPct))) problems.push("Discount must be a number.");
  if (!deliveryIncluded && !Number.isFinite(Number(deliveryAmt)))
    problems.push("Delivery amount must be a number.");

  const buildRequest = (): ProofPreviewRequest | null => {
    if (!job || problems.length > 0) return null;
    return {
      jobNo: job.jobNo,
      accountNo: job.accountNo,
      custTitle: custTitle.trim(),
      prodId: job.prodId,
      prodName: prodName.trim(),
      colour: selectedColour?.name ?? job.colour,
      qty: job.qty,
      priceCode: Number(priceCode) || 0,
      price: Number(price),
      discPct: Number(discPct) || 0,
      email: email.trim(),
      invoiceComp: invoiceComp.trim(),
      extraText: extraText.trim() || null,
      noProofHeader,
      priceIncGst: job.priceIncGst,
      deliveryIncluded,
      deliveryAmt: deliveryIncluded ? null : Number(deliveryAmt) || 0,
      proofHeader: useCustomerLetterHead ? job.proofHeader || null : null,
    };
  };

  const generate = () => {
    const body = buildRequest();
    if (body) previewMutation.mutate(body);
  };

  // Mirrors btAccept_Click: confirm, then send. buildRequest() already enforces a loaded job
  // with no field problems and carries the recipient, price, discount, delivery and
  // No-proof-header flags; the email adds the subject, the From override and the message body.
  const sendEmail = () => {
    const preview = buildRequest();
    if (!preview) return;
    if (!window.confirm("Do you really want to send this now?")) return;
    emailMutation.mutate({ preview, subject, emailFrom, messageText });
  };

  // Email From follows the selected Company — each has its own StateInvoice.EmailFrom — so
  // switching companies re-populates it, the way the legacy screen re-read SendFromEmail on
  // txJobNo_Validate. The operator can still edit it afterwards.
  const changeInvoiceComp = (state: string) => {
    setInvoiceComp(state);
    const match = job?.invoiceComps.find((c) => c.state === state);
    setEmailFrom(match?.emailFrom ?? "");
  };

  // Mirrors the legacy Insert Price / Insert Delivery buttons: <price> and <delivery> tokens
  // dropped into the message body at the cursor. EmailProof only substitutes real figures for
  // them when No proof header is ticked; otherwise they're stripped at send time.
  const insertToken = (token: string) => {
    const el = messageTextRef.current;
    if (!el) {
      setMessageText((current) => current + token);
      return;
    }
    const start = el.selectionStart ?? messageText.length;
    const end = el.selectionEnd ?? messageText.length;
    const next = messageText.slice(0, start) + token + messageText.slice(end);
    setMessageText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const openInNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={jobNo ? `Proof — job ${jobNo}` : "Proof"}
      description="Preview the proof, or email it to the customer as a PDF. Faxing is not available."
      width="xl"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            onClick={sendEmail}
            loading={emailMutation.isPending}
            disabled={!job || problems.length > 0 || !email.trim()}
            title={
              !email.trim()
                ? "Enter an email address to send the proof."
                : undefined
            }
          >
            <Send className="size-3.5" />
            Email
          </Button>
          <Button
            variant="primary"
            onClick={generate}
            loading={previewMutation.isPending}
            disabled={!job || problems.length > 0}
          >
            <Eye className="size-3.5" />
            Preview
          </Button>
        </>
      }
    >
      {jobQuery.isLoading && <Spinner label="Loading job…" />}

      {jobQuery.isError && (
        <Notice tone="red" title="Job could not be loaded">
          {(jobQuery.error as Error).message}
        </Notice>
      )}

      {job && (
        <div className="space-y-4">
          {previewMutation.isError && (
            <Notice tone="red" title="Preview could not be generated">
              {(previewMutation.error as Error).message}
            </Notice>
          )}
          {emailResult && (
            <Notice tone={emailResult.tone} title="Email">
              {emailResult.text}
            </Notice>
          )}
          {!job.stampImageAvailable && (
            <Notice tone="amber" title="No stamp design on file">
              This job has no scanned stamp image. The proof will print with an empty design
              area.
            </Notice>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem]">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Job number" hint="Immutable — the Soset job.">
                  <Input value={job.jobNo} disabled readOnly />
                </Field>
                <Field label="Account no." hint="Immutable — from Soset.">
                  <Input value={job.accountNo} disabled readOnly />
                </Field>
                <Field label="Customer">
                  <Input value={custTitle} onChange={(e) => setCustTitle(e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Product id" hint="From Soset.">
                  <Input value={job.prodId} disabled readOnly />
                </Field>
                <Field label="Product description" className="sm:col-span-2">
                  <Input value={prodName} onChange={(e) => setProdName(e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Colour">
                  <Select value={colourId} onChange={(e) => setColourId(e.target.value)}>
                    <option value="">Select a colour…</option>
                    {job.colours.map((c) => (
                      <option key={c.colourId} value={c.colourId}>
                        {c.name?.trim() || c.colourId}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantity" hint="From Soset.">
                  <Input value={job.qty} disabled readOnly />
                </Field>
                <Field label="Price code">
                  <Input
                    type="number"
                    value={priceCode}
                    onChange={(e) => setPriceCode(e.target.value)}
                  />
                </Field>
                <Field label="Price" required>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Discount %">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discPct}
                    onChange={(e) => setDiscPct(e.target.value)}
                  />
                </Field>
                <Field label="Company">
                  <Select
                    value={invoiceComp}
                    onChange={(e) => changeInvoiceComp(e.target.value)}
                  >
                    <option value="">—</option>
                    {job.invoiceComps.map((comp) => (
                      <option key={comp.state} value={comp.state}>
                        {comp.state}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Delivery amount"
                  hint={deliveryIncluded ? "Prints as “Delivery Included”." : undefined}
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryAmt}
                    disabled={deliveryIncluded}
                    onChange={(e) => setDeliveryAmt(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Email from" hint="Follows Company — editable.">
                  <Input
                    type="email"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Subject">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>

              <Field
                label="Email text"
                hint={
                  <>
                    <code>{"<price>"}</code> and <code>{"<delivery>"}</code> are placeholders —
                    see the buttons below.
                  </>
                }
              >
                <Textarea
                  ref={messageTextRef}
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </Field>
              <div className="-mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => insertToken("<price>")}>
                  Insert price
                </Button>
                <Button size="sm" variant="secondary" onClick={() => insertToken("<delivery>")}>
                  Insert delivery
                </Button>
              </div>

              <Field label="Extra text" hint="Appended to the proof, optional.">
                <Textarea
                  rows={2}
                  value={extraText}
                  onChange={(e) => setExtraText(e.target.value)}
                />
              </Field>

              <div className="flex flex-wrap items-center gap-4">
                <Checkbox
                  label="No proof header"
                  checked={noProofHeader}
                  onChange={(e) => setNoProofHeader(e.target.checked)}
                />
                <Checkbox
                  label="Delivery included"
                  checked={deliveryIncluded}
                  onChange={(e) => setDeliveryIncluded(e.target.checked)}
                />
                {job.proofHeader && (
                  <Checkbox
                    label={`Use customer's letterhead (${job.proofHeader})`}
                    checked={useCustomerLetterHead}
                    onChange={(e) => setUseCustomerLetterHead(e.target.checked)}
                  />
                )}
              </div>

              {problems.length > 0 && (
                <ul className="space-y-0.5 text-xs text-slate-500">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">Stamp design</p>
              {job.stampImageAvailable && imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={`Stamp design for job ${job.jobNo}`}
                  className="w-full rounded-md border border-slate-200 bg-white object-contain"
                />
              ) : job.stampImageAvailable && imageQuery.isLoading ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  Loading…
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  No image
                </div>
              )}
            </div>
          </div>

          {previewHtml && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-800">Preview</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={generate}>
                    <RefreshCw className="size-3.5" />
                    Refresh
                  </Button>
                  <Button size="sm" variant="secondary" onClick={openInNewTab}>
                    <ExternalLink className="size-3.5" />
                    Open in new tab
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => printHtml(previewHtml)}
                  >
                    <Download className="size-3.5" />
                    Save as PDF
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={previewHtml}
                title={`Proof preview — job ${job.jobNo}`}
                className="h-[480px] w-full bg-white"
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
