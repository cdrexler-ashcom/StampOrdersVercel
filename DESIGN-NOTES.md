# Stamp Orders web front end — design notes

How the 49 VB6 forms in `OrdersSQL_Runnable` map onto this application, what was
consolidated and why, and what the API does not yet support.

---

## 1. Navigation

The legacy application opened on `Form1` (`menu.Frm`) — a wall of twelve buttons plus five
menus. None of the buttons carried information, so finding out whether there was work
waiting meant opening a screen.

The dashboard answers that first: live orders, staged invoices, invoices awaiting a
consignment number, and receipts waiting to be banked. Each tile is also the link to the
screen it counts.

Navigation is grouped by the job being done rather than by the screen that used to do it:

| Group | Pages |
| --- | --- |
| Order to invoice | Orders, Invoice run, Invoice history, Despatch |
| Money in | Receipts, Bank deposits |
| Reference | Customers, Products, System |

---

## 2. Form-by-form mapping

### Carried across directly

| VB6 form | Lines | Becomes |
| --- | --- | --- |
| `invoice.Frm` (Form2, "Customer Order") | 2,524 | `/orders/[orderId]` |
| `addLine.frm` | 1,028 | `AddLineDialog` |
| `Receipt.frm` | 1,459 | `/receipts` |
| `Deposit.frm` | 716 | `/deposits` |
| `TrackingEntry.frm` | 318 | `/despatch` |
| `PrtInvoice.frm` | 1,593 | `/invoicing` |
| `InvoiceHistoryList.frm` | 1,266 | `/invoices` |
| `CustEdit.frm` | 1,050 | `/customers/[custId]` (read-only — see §4) |
| `Ctrl.frm` ("Control Information") | 846 | `/settings/control` (see §4 for the two omitted field groups) |
| `menu.Frm` (Form1) | 617 | Dashboard + sidebar |

### Consolidated

| VB6 forms | Consolidated into | Reason |
| --- | --- | --- |
| `addLine.frm` + `UpdLine.Frm` | `AddLineDialog` | Identical field sets — job, product, details, colour, qty, price, discount, GST, stamp label. Two forms maintained in parallel, with the same `CalcValue` transcribed into each. |
| `GetCust.Frm`, `GetProd.frm`, `Getcol.Frm`, `prcLookup.frm`, `Wildsearch.frm` | `CustomerPicker`, `ProductPicker`, inline colour select | Five modal grids opened with F2 or a `...` button. Replaced with type-ahead in place. Nothing is hidden behind a function key. |
| `PrtInvoice.frm`, `EmailInvoices.frm`, `ReprintBatch.frm` | `/invoicing` | All three were stages of one run. The API separates staging from posting, so the screen follows: select → stage → review → post. |
| `Reprint.Frm`, `ProForma.Frm`, `ReprintJobCard.frm`, `ReprintDeposit.frm` | Document actions on the entity | Four screens whose only job was "produce that document again". Reprinting is now an action where the record lives. |
| `InvoiceHistory.frm` + `InvoiceHistoryList.frm` | `/invoices` | A search form and a result form. One page. |
| `OpenItems.frm` | Outstanding items table on `/receipts` and `/customers/[custId]` | It existed to be opened from the receipt screen; now it is the receipt screen. |
| `TrackAdd.frm`, `TrackAddSettings.frm` | `/despatch` capture panel | `TrackingEntry.frm` had a Scan button that switched the grid into capture mode. Capture is the default here. |
| `frmOdueMsg1.frm`, `frmOdueMsg2.frm` | `CreditCheckPanel` | Overdue warnings were message boxes raised partway through order entry. The ageing position is now shown before work starts, not as an interruption. |
| `StampStatus.frm`, "Go To Soset" button | Soset column on the order lines table, lookup on `/system` | "Did this reach Soset?" was answered by leaving the application. It is answered in place. |
| `Payment.frm` | Payment panel on `/receipts` | A sub-dialog of the receipt screen. |

### Dropped as redundant

| VB6 form | Why |
| --- | --- |
| `SelectPrinter.frm`, `PrinterSet.bas` | The browser print dialog does this, including printer choice, page setup and PDF export. |
| `frmViewer.frm` | A Crystal Reports preview host. Documents render in the page. |
| `Form3.frm` | No reachable entry point found. |
| `rmenu.Frm` | Superseded by `menu.Frm`. |
| Receipt offset buttons — Automatic, Reverse, Fully, Part | Four buttons writing the same allocation rows. Replaced by one editable allocation column plus **Auto allocate**, which fills oldest-first as Automatic Offset did. |

---

## 3. Behaviour preserved deliberately

These are the places where the legacy behaviour is non-obvious and was kept on purpose.

**Line calculation.** `LineCalculator.Calculate` — itself transcribed from
`addLine.frm -> CalcValue` — is mirrored in `src/lib/format.ts` so totals update while
typing. Rounding happens at the same points: discount before subtraction, GST before
addition. The API remains authoritative; the saved line replaces the preview.

**Price defaulting.** Choosing a product resolves the price through
`GET /api/reference/price`, as `Product_Change` did through `CalcPrice`. The resolved rule
is named in the field hint — customer rule, all-customers rule, or product price code — so
an unexpected price can be explained without opening the pricing table.

**Discount defaulting.** Defaults from the customer onto each new line, as
`Form_Activate` did with `Me.DiscPct = Form2.DiscPct`.

**Inc-GST entry mode.** Defaults from the customer's `PriceIncGST` flag.

**Freight threshold.** `Finished_Click` and `Form_Unload` both raised a message box when
the order total crossed the delivery threshold. The API returns this as
`OrderTotalsResult.FreightSuggestion`; it is shown as a banner on the order rather than a
modal on exit.

**NOSTAMP products.** `Product.SuppressesStampJob` is surfaced at the point of selection.
In the legacy code this was a silent branch in `Next_Click`, and the absence of a stamp
job only became apparent later.

**Appending consignment numbers.** `POST /api/tracking` appends rather than replaces where
a number already exists. Stated on the capture panel.

**Remembered payment details.** Drawer, bank, branch, card and expiry are seeded from the
customer record, which is where the legacy receipt screen stored them.

---

## 4. What the API does not yet support

Nothing in this application fabricates a capability. Where a legacy function has no
endpoint, it is absent and listed here.

| Legacy function | VB6 source | Missing endpoint |
| --- | --- | --- |
| Customer maintenance | `CustEdit.frm` | `POST`/`PUT /api/customers` — customers are read-only |
| Pricing maintenance | `Pricing.frm`, `PriceList.frm` | Pricing rule write endpoints |
| Control — number sequences | `Ctrl.frm` (Next Sales Inv/Credit, Next Receipt, Next Deposit, Next Delivery Job No) | No endpoint by design — a maintenance screen must not be able to move a sequence. `/settings/control` covers every other Control field. |
| Control — SMTP password | `Ctrl.frm` | Not exposed — the secret stays on the server and is changed in the database directly. |
| Bin maintenance | File → Bins | Bin endpoints |
| Invoice states | `InvoiceStates.frm`, `frmEditInvoiceState.frm` | State endpoints |
| Stamp labels | `frmStampLabels.frm` | Stamp label endpoints |
| Overdue messages | `frmOdueMsg1/2.frm` | Message template endpoints |
| Change stamp status | `StampStatus.frm` | Soset write endpoint for status |
| Import orders | `ImportOrders.frm` | Import endpoint |
| Import web orders | `ImportWebOrders.frm` | Import endpoint |
| Job cards | `PrtJobCard.frm`, `ReprintJobCard.frm` | Job card data endpoint |
| Proof preview and email | `Reports/Proof.rpt` | Proof endpoint |
| Sending invoices | `EmailInvoices.frm` | Send endpoint — **Email** currently opens the mail client with recipient and subject filled in |
| Statements | `Statmain.Frm` | Reporting endpoints |
| Aged open items | `openrpt.Frm` | Reporting endpoints |
| Invoice register | `invreg.Frm` | Reporting endpoints |
| Receipt history | `rechist.Frm` | Reporting endpoints |
| Daily / customer / product sales | `DailySales.Frm`, `CustSales.Frm`, `ProductSales.Frm` | Reporting endpoints |

One further gap worth noting: `GET /api/orders` does not `Include(o => o.Lines)`, so list
responses carry no lines. Line counts and order totals are therefore shown only on the
order detail page, not in any list. Adding a projection to the list endpoint would let
those columns return.

---

## 5. Technical notes

**API access.** The browser only ever calls this application's own origin. `next.config.ts`
rewrites `/api/*` and `/health/*` to the C# API server-side. The API's
`Cors:AllowedOrigins` can stay empty, there are no preflight round-trips, and the API base
URL is never exposed to the client.

**Errors.** The API's exception handler maps `SosetWriteDisabledException` to 409,
`DbfException` to 502 and `InvalidOperationException` to 400, all as RFC 7807 problem
documents. `src/lib/api.ts` unwraps `title` and `detail` so the operator sees the real
message. 4xx responses are not retried.

**Soset visibility.** Write mode and data-path reachability are shown permanently in the
sidebar, because "Soset writes are disabled" and "the stamp job did not appear" are the
same fact and were previously invisible.

**Types.** `src/types/api.ts` mirrors the C# contracts by hand. Enums are unions of the C#
member names, matching the `JsonStringEnumConverter` registered in `Program.cs`. If the
API contracts change, this file is the single place to update.
