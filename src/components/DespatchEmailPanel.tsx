"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Modal,
  Notice,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { tracking } from "@/lib/endpoints";
import { text } from "@/lib/format";
import type { ArchiveHeader, EmailBatchResult } from "@/types/api";

/**
 * Send despatch emails — the old EmailInvoices.frm. It had no list: just a message, a Preview
 * checkbox, Send Now and Cancel.
 *
 *  * Send Now  asks "OK to send invoices?" (Yes / No), then emails every invoice that is ready:
 *              tracking captured and processed (TrackingStatus = ready to email), a customer email
 *              address, no email sent yet. Afterwards it says how many were emailed, and if any
 *              failed, lists them (the legacy form wrote a log file and opened it in Notepad).
 *              Nothing ready: "No Invoices to Send."
 *  * Preview   ticked, Send Now sends nothing and does not ask: it shows which invoices WOULD be
 *              emailed. (The legacy preview opened the invoice report for the batch in a viewer.)
 *  * Cancel    leaves the screen.
 *
 * Differences from the legacy screen: it does not stop the whole run when the mail server fails
 * (the API carries on and reports each failure), and the email body is the API's despatch
 * notification rather than the legacy text with the invoice PDF attached.
 */
export function DespatchEmailPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [preview, setPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [previewRows, setPreviewRows] = useState<ArchiveHeader[] | null>(null);
  const [result, setResult] = useState<EmailBatchResult | null>(null);
  const [nothingToSend, setNothingToSend] = useState(false);

  // Preview: the same set Send Now would email (GET /api/tracking/awaiting-notification).
  const previewMutation = useMutation({
    mutationFn: () => tracking.awaitingNotification(),
    onSuccess: (rows) => {
      if (rows.length === 0) setNothingToSend(true);
      else setPreviewRows(rows);
    },
  });

  // Send Now: POST /api/tracking/send-notifications emails every invoice that is ready, carrying on
  // past individual failures, and stamps EmailSent on each success.
  const sendMutation = useMutation({
    mutationFn: () => tracking.sendAllNotifications(),
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
      if (batch.total === 0) setNothingToSend(true);
      else setResult(batch);
    },
  });

  const sendNow = () => {
    setNothingToSend(false);
    setResult(null);
    previewMutation.reset();
    sendMutation.reset();
    if (preview) previewMutation.mutate();
    else setConfirmSend(true);
  };

  const failures = result?.items.filter((item) => !item.sent) ?? [];
  const error = (sendMutation.error ?? previewMutation.error) as Error | null;

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardBody className="space-y-6">
            <p className="text-lg text-slate-800">
              Invoices with tracking details will be emailed to all customers that have a tracking
              number entered.
            </p>

            <Checkbox
              label="Preview"
              checked={preview}
              onChange={(event) => setPreview(event.target.checked)}
            />

            <div className="flex gap-3">
              <Button
                variant="primary"
                loading={sendMutation.isPending || previewMutation.isPending}
                onClick={sendNow}
              >
                Send Now
              </Button>
              <Button onClick={() => router.push("/")}>Cancel</Button>
            </div>
          </CardBody>
        </Card>

        {error && (
          <Notice tone="red" title="Not sent">
            {error.message}
          </Notice>
        )}

        {nothingToSend && (
          <Notice tone="sky" title="Send Invoices">
            No Invoices to Send.
          </Notice>
        )}

        {result && (
          <Notice
            tone={result.failed > 0 ? "amber" : "green"}
            title={`${result.sent} Invoice(s) emailed to customers.`}
          >
            {result.failed > 0 && "There were errors during processing, see the list below."}
          </Notice>
        )}

        {failures.length > 0 && (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Email</Th>
                  <Th>Problem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failures.map((item) => (
                  <tr key={item.archiveId}>
                    <Td>{text(item.invoiceNo)}</Td>
                    <Td>{text(item.recipient)}</Td>
                    <Td>{text(item.message)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        title="Email Invoices"
        footer={
          <>
            <Button onClick={() => setConfirmSend(false)}>No</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmSend(false);
                sendMutation.mutate();
              }}
            >
              Yes
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">OK to send invoices?</p>
      </Modal>

      <Modal
        open={previewRows !== null}
        onClose={() => setPreviewRows(null)}
        title="Invoices ready to email"
        description="Preview only: nothing has been sent."
        width="lg"
        footer={<Button onClick={() => setPreviewRows(null)}>Close</Button>}
      >
        <Table>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Customer</Th>
              <Th>Email</Th>
              <Th>Consignment</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {previewRows?.map((invoice) => (
              <tr key={invoice.id}>
                <Td>{text(invoice.invoiceNo)}</Td>
                <Td>{text(invoice.custTitle)}</Td>
                <Td>{text(invoice.email)}</Td>
                <Td>{text(invoice.trackingNo?.trim())}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal>
    </>
  );
}