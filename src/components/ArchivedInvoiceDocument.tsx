"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { InvoiceDocument } from "@/components/InvoiceDocument";
import { invoiceStates } from "@/lib/endpoints";
import { addressLines, date, documentTotals, lineTotal, text } from "@/lib/format";
import type { ArchiveHeader, ArchiveLine } from "@/types/api";

/**
 * The company logo as an object URL, for the delivery docket's heading. Null while it loads, and
 * when the company has no logo (or the file is missing): the heading then falls back to text.
 */
function useCompanyLogo(company: string | null | undefined, enabled: boolean): string | null {
  const code = company?.trim() ?? "";
  const query = useQuery({
    queryKey: ["letterhead", code],
    queryFn: ({ signal }) => invoiceStates.letterhead(code, signal),
    enabled: enabled && code !== "",
    retry: false,
    staleTime: 5 * 60_000,
  });

  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!query.data) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);

  return url;
}

/**
 * A posted invoice, credit note or delivery docket, laid out as the printed document. Used by the
 * invoice page and by the Reprint tab on the Email invoices page, so both show the same thing.
 *
 * Archive lines carry price/qty/discount/GST but no stored line total, so the document rebuilds
 * net/GST/gross the same way the legacy GetTotPrcArch and the server's OrderTotalCalculator do:
 * sum (qty x price - rounded discount) and add the GST stored on each line as-is. Freight, when
 * charged, is itself one of these lines (product = Control.FreightProd) - there is no separate
 * header amount to add.
 */
export function ArchivedInvoiceDocument({
  invoice,
  lines,
  docket,
}: {
  invoice: ArchiveHeader;
  lines: ArchiveLine[];
  /** True for the delivery docket (no prices); false for the invoice or credit note. */
  docket: boolean;
}) {
  const { net, gst, gross } = documentTotals(lines);
  // The delivery docket's heading is the company logo, as on the printed docket report. The
  // invoice keeps its text heading.
  const logoUrl = useCompanyLogo(invoice.invoiceComp, docket);

  return (
    <InvoiceDocument
      heading="Stead Brothers"
      logoUrl={logoUrl}
      subheading={text(invoice.invoiceComp, "Stamp manufacturing")}
      title={docket ? "Delivery docket" : invoice.credit ? "Credit note" : "Tax invoice"}
      number={text(invoice.invoiceNo)}
      dateText={date(invoice.invoiceDate)}
      invoiceTo={addressLines(
        invoice.custTitle,
        invoice.invAdr1,
        invoice.invAdr2,
        invoice.invAdr3,
        invoice.invPostCode,
      )}
      deliverTo={addressLines(
        invoice.delName,
        invoice.delAdr0,
        invoice.delAdr1,
        invoice.delAdr2,
        invoice.delAdr3,
      )}
      lines={lines.map((line) => ({
        key: `${line.orderId}-${line.jobNo}`,
        jobNo: line.jobNo,
        product: line.product,
        details: line.details,
        colour: line.colourDesc ?? line.colour,
        qty: line.qty,
        price: line.price,
        total: lineTotal(line),
      }))}
      showPrices={!docket}
      totals={{ net, gst, gross }}
      note={invoice.note}
    />
  );
}