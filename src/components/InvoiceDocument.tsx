import type { ReactNode } from "react";

import { money, qty as formatQty, text } from "@/lib/format";

/** One printed line of the document, already resolved to what is shown. */
export interface DocumentLine {
  key: string;
  jobNo: string;
  product: string;
  details: string | null;
  colour: string | null;
  qty: number | null;
  price: number | null;
  /** The line total as shown (net of discount, plus GST). */
  total: number;
}

/**
 * The printed invoice document: header, invoice-to and deliver-to blocks, the lines, the totals and
 * the note. Shared by the invoice page (a posted invoice, credit note or delivery docket) and the
 * pro forma page (an order not yet invoiced), so a pro forma is laid out the same as the invoice it
 * stands in for (customer feedback, Nov 2026).
 *
 * Presentational only: the caller works out the figures and says what to call things. With
 * `showPrices` off (a delivery docket) the price, total and totals block are left out.
 */
export function InvoiceDocument({
  heading,
  logoUrl,
  subheading,
  title,
  numberLabel,
  number,
  dateText,
  invoiceTo,
  deliverTo,
  lines,
  showPrices = true,
  totals,
  note,
  children,
}: {
  /** The business name at the top left. */
  heading: string;
  /** The company logo. When given it takes the place of the heading text (the delivery docket). */
  logoUrl?: string | null;
  subheading: string;
  /** "Tax invoice", "Credit note", "Delivery docket" or "Pro forma invoice". */
  title: string;
  /** A small label above the number, e.g. "Order no". Left out when the number speaks for itself. */
  numberLabel?: string;
  number: string;
  dateText: string;
  invoiceTo: string[];
  deliverTo: string[];
  lines: DocumentLine[];
  showPrices?: boolean;
  totals?: { net: number; gst: number; gross: number };
  note?: string | null;
  /** Extra blocks between the totals and the note, e.g. payment details on a pro forma. */
  children?: ReactNode;
}) {
  return (
    <article className="print-page mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob URL, not optimisable
            <img src={logoUrl} alt={heading} className="max-h-20 max-w-64 object-contain" />
          ) : (
            <>
              <p className="text-lg font-semibold text-slate-900">{heading}</p>
              <p className="text-xs text-slate-500">{subheading}</p>
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</p>
          {numberLabel && <p className="mt-1 text-xs text-slate-500">{numberLabel}</p>}
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{number}</p>
          <p className="text-xs text-slate-500">{dateText}</p>
        </div>
      </header>

      <section className="grid gap-6 py-5 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invoice to
          </p>
          {invoiceTo.map((line, index) => (
            <p key={index} className="text-sm text-slate-700">
              {line}
            </p>
          ))}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Deliver to
          </p>
          {deliverTo.map((line, index) => (
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
            {showPrices && (
              <>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line) => (
            <tr key={line.key}>
              <td className="py-2 text-slate-700">{line.jobNo}</td>
              <td className="py-2 text-slate-700">{line.product}</td>
              <td className="py-2 text-slate-700">{text(line.details)}</td>
              <td className="py-2 text-slate-700">{text(line.colour)}</td>
              <td className="py-2 text-right tabular-nums text-slate-700">
                {formatQty(line.qty)}
              </td>
              {showPrices && (
                <>
                  <td className="py-2 text-right tabular-nums text-slate-700">
                    {money(line.price)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-slate-900">
                    {money(line.total)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showPrices && totals && (
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <dl className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Net</dt>
              <dd className="tabular-nums text-slate-700">{money(totals.net)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">GST</dt>
              <dd className="tabular-nums text-slate-700">{money(totals.gst)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="tabular-nums font-semibold text-slate-900">{money(totals.gross)}</dd>
            </div>
          </dl>
        </div>
      )}

      {children}

      {note?.trim() && (
        <p className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-600">{note}</p>
      )}
    </article>
  );
}
