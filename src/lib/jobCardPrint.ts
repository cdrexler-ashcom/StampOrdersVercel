import { date as formatDate, qty as formatQty, text } from "@/lib/format";
import type { JobCard } from "@/types/api";

/**
 * Builds a self-contained, print-ready HTML document for an order's job cards — the same
 * "self-contained document, printed via a hidden iframe" contract lib/print.ts documents for
 * the Crystal report HTML, just built client-side instead of by the API.
 *
 * A client-rendered iframe route can't use printReportUrl() directly: print.ts calls
 * window.print() as soon as the iframe's `load` event fires, which for a React page fires
 * before data has fetched and painted, printing a blank page. Building the finished HTML here
 * (from data the caller already has, since the panel fetched it to display) and handing it to
 * printReportUrl() as a blob: URL sidesteps that — the document is complete before the iframe
 * ever loads it.
 *
 * Layout follows PrtJobCard.frm / ReprintJobCard.frm (see ReportDefinitions/jobcard.xml on the
 * API side): job number, customer info, date, a product/bin/colour/size/quantity row, a rush
 * flag, and a special-instructions block. One job card per page.
 */
export function buildJobCardPrintHtml(orderId: number, cards: JobCard[]): string {
  const pages = cards.length > 0
    ? cards.map(cardHtml).join("\n")
    : `<div class="page"><p class="empty">No job cards have been printed for order ${orderId} yet.</p></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Job card — order ${orderId}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
  }
  .page {
    padding: 24px 32px;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .title { font-size: 22px; font-weight: bold; }
  .title span { font-weight: normal; margin-left: 12px; }
  .custinfo { margin-top: 10px; font-size: 12px; white-space: pre-line; }
  .date { margin-top: 4px; font-size: 12px; color: #333; }
  table.grid {
    margin-top: 16px;
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  table.grid td {
    border: 1px solid #000;
    padding: 8px 10px;
    vertical-align: top;
  }
  table.grid .label { font-weight: bold; display: block; margin-bottom: 3px; }
  .rush {
    margin-top: 10px;
    font-weight: bold;
    font-size: 12px;
  }
  .instructions {
    margin-top: 16px;
    font-size: 12px;
  }
  .instructions .label { font-weight: bold; margin-bottom: 4px; display: block; }
  .instructions .box {
    margin-top: 4px;
    min-height: 80px;
    border: 1px solid #000;
    padding: 8px 10px;
    white-space: pre-line;
  }
  .empty { font-size: 13px; color: #555; padding: 24px 32px; }
  @media print {
    .page { padding: 0; }
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cardHtml(card: JobCard): string {
  const size =
    card.width != null && card.height != null
      ? `${(card.width / 100).toFixed(2)} x ${(card.height / 100).toFixed(2)}`
      : "—";

  return `<div class="page">
  <div class="title">JOB No: <span>${esc(card.jobNo)}</span></div>
  ${card.custInfo ? `<div class="custinfo">${esc(card.custInfo)}</div>` : ""}
  <div class="date">${esc(formatDate(card.date))}</div>

  <table class="grid">
    <tr>
      <td><span class="label">Product:</span>${esc(text(card.prodId))}</td>
      <td><span class="label">Bin No.:</span>${esc(text(card.searchKey2))}</td>
      <td><span class="label">Colour:</span>${esc(text(card.colour))}</td>
    </tr>
    <tr>
      <td><span class="label">Description:</span>${esc(text(card.prodName))}</td>
      <td><span class="label">Quantity:</span>${esc(formatQty(card.quantity))}</td>
      <td><span class="label">Size:</span>${esc(size)}</td>
    </tr>
  </table>

  ${card.rush ? `<div class="rush">RUSH</div>` : ""}

  <div class="instructions">
    <span class="label">Special Instructions</span>
    <div class="box">${card.holdMemo ? esc(card.holdMemo) : ""}</div>
  </div>
</div>`;
}
