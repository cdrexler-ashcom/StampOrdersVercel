"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { Badge, Button, EmptyState, ErrorState, Modal, Spinner } from "@/components/ui";
import { orders } from "@/lib/endpoints";
import { date, qty as formatQty, text } from "@/lib/format";
import { buildJobCardPrintHtml } from "@/lib/jobCardPrint";
import { printReportHtml } from "@/lib/print";

/**
 * Shows how many job cards exist for an order — a small badge meant to sit inside/beside the
 * "Job card" button, so there's something to see before opening the panel. Shares its query
 * key with JobCardPanel, so opening the panel afterwards reads from cache rather than
 * re-fetching.
 */
export function JobCardIndicator({ orderId }: { orderId: number }) {
  const { data } = useQuery({
    queryKey: ["job-card", orderId],
    queryFn: () => orders.jobCard(orderId),
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <Badge tone="green" className="ml-1">
      {data.length}
    </Badge>
  );
}

/**
 * Job card view + print action for an order (task E3). Replaces PrtJobCard.frm /
 * ReprintJobCard.frm — the legacy printer-picker dialog is gone; "Print" hands the browser's
 * own print dialog a document built from the same data shown here, so Save-as-PDF and printer
 * selection both come for free.
 */
export function JobCardPanel({
  orderId,
  open,
  onClose,
}: {
  orderId: number;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["job-card", orderId],
    queryFn: () => orders.jobCard(orderId),
    staleTime: 60_000,
  });

  const cards = query.data ?? [];

  const handlePrint = () => {
    const html = buildJobCardPrintHtml(orderId, cards);
    printReportHtml(html);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Job card — order ${orderId}`}
      description="Production card for each printed job on this order."
      width="lg"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            disabled={cards.length === 0}
            onClick={handlePrint}
          >
            <Printer className="size-3.5" />
            Print
          </Button>
        </>
      }
    >
      {query.isLoading ? (
        <Spinner label="Loading job card…" />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No job cards yet"
          description="No job card has been printed for a line on this order."
        />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <div
              key={card.jobNo}
              className="rounded-md border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Job {card.jobNo}
                  </p>
                  <p className="text-xs text-slate-500">{date(card.date)}</p>
                </div>
                {card.rush && <Badge tone="amber">Rush</Badge>}
              </div>

              {card.custInfo && (
                <p className="mt-2 whitespace-pre-line text-xs text-slate-600">
                  {card.custInfo}
                </p>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Product</dt>
                  <dd className="text-slate-800">{text(card.prodId)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Bin No.</dt>
                  <dd className="text-slate-800">{text(card.searchKey2)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Colour</dt>
                  <dd className="text-slate-800">{text(card.colour)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Quantity</dt>
                  <dd className="text-slate-800">{formatQty(card.quantity)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Size</dt>
                  <dd className="text-slate-800">
                    {card.width != null && card.height != null
                      ? `${(card.width / 100).toFixed(2)} x ${(card.height / 100).toFixed(2)}`
                      : "—"}
                  </dd>
                </div>
              </dl>

              {card.holdMemo?.trim() && (
                <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                  <p className="mb-1 font-medium text-slate-600">
                    Special instructions
                  </p>
                  <p className="whitespace-pre-line text-slate-700">
                    {card.holdMemo}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
