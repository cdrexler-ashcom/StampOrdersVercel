"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { InvoiceDocument } from "@/components/InvoiceDocument";
import { Button, EmptyState, ErrorState, Notice, Spinner } from "@/components/ui";
import { invoiceStates, orders, settings } from "@/lib/endpoints";
import { addressLines, date, text } from "@/lib/format";

/**
 * Pro forma invoice for an order that has not been invoiced yet.
 *
 * Customer feedback, Nov 2026 (meeting item M15): when a customer asks for paperwork before they
 * pay, the team prints a pro forma from the order, not a final invoice, and it should look like the
 * normal invoice. So this is the same document as the posted invoice (InvoiceDocument), built from
 * the order's own lines and totals, with a "Pro forma invoice" title and the order number in place of
 * an invoice number, since nothing has been invoiced or numbered yet. It replaces ProForma.Frm.
 *
 * Freight needs nothing special: when it is charged it is already a line on the order (the invoice
 * run does not add one either), so the pro forma shows what the invoice would. Because the customer
 * is being asked to pay from this, it also prints the company's bank details (as ProForma.Frm did),
 * taken from the company on the order, or the Control record where the company has none.
 *
 * Print only. ProForma.Frm could also email the document; the API has no endpoint for emailing an
 * order, so that is not here.
 */
export default function ProFormaPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const validId = Number.isInteger(orderId) && orderId > 0;

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orders.get(orderId),
    enabled: validId,
  });
  const totalsQuery = useQuery({
    queryKey: ["order-totals", orderId],
    queryFn: () => orders.totals(orderId),
    enabled: validId,
  });

  const order = orderQuery.data;
  const comp = order?.invoiceComp?.trim() ?? "";

  const companyQuery = useQuery({
    queryKey: ["invoice-state", comp],
    queryFn: () => invoiceStates.get(comp),
    enabled: comp !== "",
    // A company that has been removed or never existed just means no company details.
    retry: false,
  });
  const controlQuery = useQuery({
    queryKey: ["settings", "control"],
    queryFn: () => settings.control(),
  });

  if (!validId) return <EmptyState title="Order not found" />;
  if (orderQuery.isLoading || totalsQuery.isLoading || (comp !== "" && companyQuery.isLoading)) {
    return <Spinner label="Loading order…" />;
  }
  if (orderQuery.isError) return <ErrorState error={orderQuery.error} />;
  if (totalsQuery.isError) return <ErrorState error={totalsQuery.error} />;
  if (!order || !totalsQuery.data) return <EmptyState title="Order not found" />;

  const company = companyQuery.data ?? null;
  const control = controlQuery.data ?? null;
  const lines = order.lines ?? [];

  // The company's bank details, or the Control record's where the company has none, as the legacy
  // invoice did. A company can switch them off entirely.
  const showBank = company ? company.printBankDetails : true;
  const bankName = company?.bankName?.trim() || control?.bankName?.trim() || "";
  const bankBsb = company?.bankBsb?.trim() || control?.bankBsb?.trim() || "";
  const bankAcct = company?.bankAcct?.trim() || control?.bankAcct?.trim() || "";
  const hasBank = showBank && Boolean(bankName || bankBsb || bankAcct);

  const companyAddress = company
    ? addressLines(
        company.address1,
        company.address2,
        company.address3,
        [company.suburb, company.stateCode, company.postCode].filter(Boolean).join(" "),
      ).join(", ")
    : "";

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Order {orderId}
        </Link>

        <Button variant="primary" autoFocus onClick={() => window.print()}>
          <Printer className="size-3.5" />
          Print
        </Button>
      </div>

      {lines.length === 0 && (
        <div className="no-print mb-4">
          <Notice tone="amber" title="This order has no lines yet">
            The pro forma will print with no lines and a zero total. Add the lines first.
          </Notice>
        </div>
      )}

      <InvoiceDocument
        heading={company?.name?.trim() || "Stead Brothers"}
        subheading={companyAddress || text(order.invoiceComp, "Stamp manufacturing")}
        title="Pro forma invoice"
        numberLabel="Order no"
        number={String(order.orderId)}
        // The date it is printed, as the legacy form did (InvoiceDate = Now), not the order date.
        dateText={date(new Date().toISOString())}
        invoiceTo={addressLines(
          order.custTitle,
          order.invAdr1,
          order.invAdr2,
          order.invAdr3,
          order.invPostCode,
        )}
        deliverTo={addressLines(
          order.delName,
          order.delAdr0,
          order.delAdr1,
          order.delAdr2,
          order.delAdr3,
        )}
        lines={lines.map((line) => ({
          key: line.jobNo,
          jobNo: line.jobNo,
          product: line.product,
          details: line.details,
          colour: line.colourDesc ?? line.colour,
          qty: line.qty,
          price: line.price,
          total: line.totalPrice ?? 0,
        }))}
        totals={{
          net: totalsQuery.data.netAmount,
          gst: totalsQuery.data.gstAmount,
          gross: totalsQuery.data.grossAmount,
        }}
        note={order.note}
      >
        {hasBank && (
          <div className="mt-6 border-t border-slate-200 pt-3 text-sm text-slate-700">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment details
            </p>
            {bankName && <p>Bank: {bankName}</p>}
            {bankBsb && <p>BSB: {bankBsb}</p>}
            {bankAcct && <p>Account no: {bankAcct}</p>}
            <p className="mt-1 text-xs text-slate-500">Please quote order {order.orderId}.</p>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          This is a pro forma invoice for payment in advance. It is not a tax invoice.
        </p>
      </InvoiceDocument>
    </>
  );
}
