# Customer feedback — November 2026

The customer reviewed the web UI and sent back printed screenshots with handwritten notes,
alongside marked-up screenshots of the legacy VB6 forms. The scans are in
`C:\Projects\Stead Brothers - UI Feedback from Customer` (three CamScanner PDFs, Parts 1–3).
This file turns them into one list of requests, with each item's status.

The scans came with a **meeting summary** (`SteadBros Meeting Summary.docx`, an AI-generated
summary of a meeting between the customer and the development team). It is covered in
**section 11** (items M1–M41), compared against the current app, with the open questions at the
end. Where the two overlap, the paper items link to the M items. Some words in the summary look
mistranscribed: "SOC" is almost certainly Soset, "Supreme Rubber Snaps" is Supreme Rubber
Stamps, and "corrected status" in the job-card section is unclear.

Work on these items is collected on the **`feat/customer-feedback-nov-2026`** branch and
merged to `master` once it is done.

**The API has a matching `feat/customer-feedback-nov-2026` branch** (repo `Stead Brothers Stamp Orders API`, based on `master` with `feat/despatch-labels` merged in). API-side work for this round is committed there. It must be deployed with the UI hub branch; see section 12.

**Merged into the branch so far**

| Branch | Items | Merged | Notes |
| --- | --- | --- | --- |
| `feat/despatch-labels` (Jackson Beecher), which includes `feat/order-dealer-return-address` | 1, 3, 9 | 11 Nov 2026 | The developer says it is about 99% done. The print button has been taken off the Despatch page on purpose. Printing now has its own sidebar button, **Email invoices**, whose Reprint invoice tab prints, previews or emails one invoice (on `feat/cf-despatch-email-tab`). Despatch labels print only from **Accept** in the Scan Tracking dialog. This branch also removes the "Ready to notify" grid from the Despatch page. |

**Status key**

| Status | Meaning |
| --- | --- |
| Done | Already on `master` |
| Branch | Done or partly done on `feat/customer-feedback-nov-2026`, not yet on `master` (the branch it came from is named) |
| Partial | Some of it is on `master`; the rest is still to do |
| To do | Not started |
| Question | Needs an answer or a decision, not code |
| Verify | May already work; needs checking against the API or real data before any change |
| Design needed | Needs an architecture decision before it can be built |
| Push back | We should not do this as asked |

A ✓ in the **Source** column means the customer ticked the item on the scan. On the Part 1
typed list a tick probably means "discussed" or "agreed", not "done".

Status as at 11 Nov 2026.

---

## 1. Questions and general requests (Part 1, typed and handwritten list)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | How do we print the despatch labels? | P1 | Branch | **Sidebar print button: done** (the **Email invoices** sidebar page, Reprint invoice tab; see the merged-branches table above). From `feat/despatch-labels`: capturing a consignment prints a return label and a delivery label (`DespatchLabelPrint.tsx`, `GET /api/tracking/labels/{invoiceNo}`). The Despatch page is rebuilt to work like the old Tracking Entry screen (Scan and Process buttons, `ScanTrackingDialog.tsx`). |
| 2 | Put a heading on the packing slip. It is blank now; it should come from the dealer or the invoice. | P1 | Branch (API) | API: the delivery docket report now prints the invoice company's letterhead as its heading, top right like the invoice. The UI invoice page's docket view hard-codes "Stead Brothers" and is unchanged. **Confirm with the customer that "heading" means the company logo/letterhead and not text** (Q13). The tax invoice report has the same blank slot (no data binding) and was not changed. |
| 3 | Where do we find the Express Post numbers, to see whether we missed any? | P1 | Branch (partial) | `feat/despatch-labels` adds Order, an editable Tracking number(s) column and a Required toggle to the pending despatch list, so invoices still missing a number are visible. There is no list of numbers already used. Confirm with the customer that this is enough. |
| 4 | What CSV format do we need to import from Mr Stamps? ("CSV type?") | P1 ✓ | Question | Send them the import file spec for `/imports` (`POST /api/imports/web-orders`). The meeting reports a newly acquired company's CSV being rejected; see M21. |
| 5 | Print job cards for a whole run. | P1 ✓ | Branch (UI + API) | API: `GET /api/job-cards?startRun=&endRun=`. UI: new **Job cards** page (Order to invoice): first and last run, a list of what will print with orders that have no stamp job flagged, one Print for the batch, and a Reprint by order number. The order screen's Print job card still covers one order. Not yet tried against a running API. See M14. |
| 6 | Email proofs from every company on the proof screen. | P1 ✓ | To do | Check that the company list on `ProofDialog` offers every company and that each one sends. The meeting says emailing fails for non-Stead companies; see M19–M20. API: proof defaults now follow the order's company (see item 24). Not reproduced against a real job. |
| 7 | F2 keys. | P1 ✓ | Done | PR 317: F2 opens Colour in the add line dialog. Pickers already open by typing. |
| 8 | Make it usable without a mouse. | P1 ✓ | Partial | PR 317: tab order, shortcuts and Alt+L on the order screen. Continue across the other screens. |

## 2. Order screen (Part 2, pages 1–3 and 7)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 9 | Add Dealer Return Address to the order header. Circled on the VB6 order form, with "Order ✓" beside it. | P2 p1 | Branch | `feat/order-dealer-return-address`, also included in `feat/despatch-labels`. A checkbox on new and existing orders and in `EditOrderDialog`; it defaults from the customer. It is stored as `OrdHeader.DirectDelivery` (`directDelivery` on `OrderHeader`); `direct` is the separate delivery docket flag. Needs the API to accept `dealerReturnAddress` on create and update. |
| 10 | "How to update here", written on both the order screen and the Edit order dialog. | P2 p2–3 | Question | Header fields already edit in place and save when you leave a field, and the header already shows "Saving… / Saved / Not saved". So the problem is probably not a missing save control. The Edit order dialog says "Customer, bin and the credit flag are fixed once an order is created", so they may want to change the customer or bin on an existing order. Ask them what they were trying to change. |
| 11 | Double-click a line to edit it. | P2 p3 ✓ | Done | PR 317. |
| 12 | Question marks over More fields, Invoice run and Job card. | P2 p7 | Branch | Renamed to Edit order, Go to invoice run and Print job card, each with a tooltip. |

## 3. Invoice detail (Part 2, page 5)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 13 | Email invoice: ask for confirmation and show the recipient address, which they can change. | P2 p5 | Branch | Email invoice now opens a confirm dialog with the recipient, editable. A changed address is sent as `toOverride`, for that send only. Also available when the invoice has no stored address. Not yet tried against a running API. |

## 4. Reports — Invoice Register (Part 2, page 4)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 14 | Remove the description text, the date-range preset dropdown, Invoice no., Sort by, Layout only, Clear, Refresh and Open in new tab. | P2 p4 | Done | PR 312 (28 Oct) added a per-report "simple" mode, used by the Invoice Register (`simple: true` in `lib/reports.ts`). The scan shows the older layout, so the customer was probably looking at an older deployed build. **Check what Vercel is serving**; PR 312 also says it needs the matching API change deployed first. Other reports are unchanged; confirm whether they should follow. |
| 15 | Rename "Save as PDF" to "Print". | P2 p4 | Done | PR 312: the simple report toolbar has a single Print button (`ReportFrame`). |

## 5. Customer maintenance (Part 3, pages 1 and 6, marked up on the VB6 Customer Edit form)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 16 | Allow account codes up to 8 characters. | P3 p1 | Done | **No change needed.** The customer already answered this on 29 Oct 2026 (API repo `docs/CUSTOMER-REQUIREMENTS.md`, item 15): "16 would be great", recorded as "Done, no change". The form and the API allow 16 (`MAX.accountNo`; `Customer.ACCOUNTNO` is `nvarchar(16)`). The legacy form allowed 10. This note on the scan is the same request, so reducing the limit would go against what they said. |
| 17 | Rename State Invoice to "Company". | P3 p1 | Done | PR 271 / PR 303. |
| 18 | Copy button from the invoice address to the delivery address. | P3 p1 | Done | `copyInvoiceAddress` in `CustomerForm`. |
| 19 | Remove Bank, Branch, Drawer name, Fax, GST exempt, Currency code and Use All Price. | P3 p1, p6 | Branch | GST exempt checkbox removed from the customer form. The stored value is still loaded and sent back on save, so existing exempt customers stay exempt. The read-only customer page still shows it. |
| 20 | Paid default is crossed out with an X. | P3 p1 | Branch | Checkbox removed, stored value kept on save, as for GST exempt. Confirm with the customer that "removed" is what the X meant. |
| 21 | Add a "CSV" field next to the credit card number and expiry. | P3 p1 | Push back | Almost certainly the CVV (card security code). PCI-DSS does not allow storing it after authorisation, so we should not add it. Explain why. The meeting also says card details are to be retained (M30), so review how the card number and expiry are stored today. |
| 22 | Delivery Docket should "always" be ticked. | P3 p6 | Done | The customer form always sends `deliveryDocket: true` and the checkbox is gone (July 2026 upgrade). Only the separate Web order defaults checkbox remains. |
| 23 | Discount %: handwritten note, read as "Nil". | P3 p6 | Question | Possibly default to 0. The note is hard to read, so confirm. |
| 24 | Proof header and proof "from" email should come from the company ("Pick up from State Invoice"), not be set per customer. | P3 p6 | Branch (UI + API) | Companies already have a letterhead and a From address, and the proof dialog's "Email from" follows Company. What remains is removing the per-customer proof fields from `CustomerForm` and the proof defaults (`GET /api/proofs/{jobNo}`). API: the proof defaults now take the Company from the order (then the customer), the Company's From address before the customer's, and the Company's letterhead as the default. UI: `ProofDialog` no longer defaults to the customer's own letterhead (still offered as a tick box), and the Letterhead image and Proof email "from" fields are gone from `CustomerForm` (stored values kept on save, as for GST exempt). Same work as M19–M20. |
| 25 | Dealer Return Address: "?". | P3 p1 | Question | Explain what it does. It is now used on the order (#9) and by the despatch return label (#1). |
| 26 | Web order defaults: "Do we need this?". | P3 p1 | Question | Used by the web order import (#4). Explain, or remove it if they do not import web orders. |

## 6. History / invoice search (Part 3, page 2)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 27 | Show these columns together: Customer No., Customer name, Recipient, Date, Invoice No., Job No., Cust order No., Email (invoice), Phone (invoice) and Tracking. | P3 p2 | Done | All on `/invoices`, plus Order (PRs 307 and 314). |
| 28 | Search by phone and by email (taken from the invoice). | P3 p2 ✓ | Branch (UI + API) | PR 314 added a Recipient search. API: `GET /api/invoices/history` now also takes `emailSearch`, `phoneSearch` (ignores spaces, hyphens and brackets) and `dateFrom`/`dateTo`. UI: Email (invoice), Phone (invoice) and Invoice date from/to boxes on `/invoices`. Not yet tried against a running API. See also M23. |

## 7. Receipts (Part 3, page 3)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 29 | Drop the payment details popup (drawer, bank, branch) and just process the receipt. | P3 p3 | Done | The receipt screen has no drawer, bank or branch fields. |

## 8. Proof screen (Part 3, page 5)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 30 | Remove the Fax field and the Fax/Email output choice. | P3 p5 | Done | `ProofDialog` has no fax output. |
| 31 | Put the cursor in the Email field first ("1st Tab"). | P3 p5 | Branch | The proof dialog now opens with the cursor in Email. |

## 9. New feature — product price maintenance (Part 3, page 4)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 32 | "I want pricing to be linked from Excel. Do a page like my price increase Access program." | P3 p4 | Branch (UI + API), **approach changed**; see M31 to M33 | Modelled on their Access form "Change prices in Soset": product ID, name, search code, weight, supplier code, cost, retail and price codes 2–9 (Aust Post; ENZ code 7; Adams/RSA/eStamps code 8, inc delivery and GST; Stamp World code 9), the NoStamp flag and **Go to next record**. **The meeting then agreed prices live in the Orders SQL database, maintained by Excel-compatible export and import** (see M31–M34), not by writing to Soset. Today the catalogue and `unitPrice1`–`5` are read from Soset only, so this needs new SQL product and price tables and a data migration. The largest item on this list. **Built on the branch (best-judgement version, may be reworked once Q8 is answered):** a Price list screen (Settings > Price list) with export, a checked import, a Soset copy and single-product edit, on a new `ProductPrice` table. |

## 10. Unclear

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 33 | A handwritten column of prices, with some crossed out, "15.99A??" circled, and "Order No, Disc" written sideways. | P2 p6 | Question | Possibly a price check against a real order. Ask the customer. |

---

## 11. Meeting summary (M1–M41)

Compared with the web app on the hub branch, the API and the legacy repo (status as at 12 Nov
2026). "Today" is what the code does now.

### Keyboard-first order entry

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M1 | Cursor lands in the customer field on the Orders screen | The customer picker takes focus on a new order (`OrderWorkspace.tsx`) | None | Done |
| M2 | Enter accepts the customer; Enter again starts the order | First Enter selects. "Start order" is a button, and an existing-open-order dialog can appear in between. | Done: after a customer is chosen and any open-order prompt is answered, Start order takes focus, so Enter, then Enter again. The prompt focuses "Yes, open the existing order" (Enter) and Escape starts a new order | Branch |
| M3 | F2 to search for a different customer | `CustomerPicker` handles F2 | None | Done |
| M4 | Enter job/order no., product, qty and colour without the mouse | PR 317: tab order, text selected on focus, F2 for Colour, Alt+L for a new line, double-click to edit | Done: the edit-line dialog now has the same focus, select-on-focus, skipped Details and GST tick, and looping Save. F2 there still means change product | Branch |
| M5 | Rarely changed fields out of the tab order or in an expandable section | Done in the add-line dialog. On the order, infrequent fields are in the "More fields" popup. | Decide whether "expandable" means in-page instead of a popup (Q12) | Partial |
| M6 | Keyboard use across the whole app; replacements for F5/F6 | Key handlers only on Orders, the pickers, Despatch and Pricing. Previous/Next on the order are buttons only. | **Done: Alt+P / Alt+N for Previous / Next order** (with Alt+L for a new line). **Still to do:** audit every other screen for mouse-only steps. Ask the customer which screens (paper item 8) | Partial |

### Order details, drop-ship labels, email

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M7 | Dealer return address on the order | On `feat/despatch-labels` (merged into the hub), including the customer default | The API must accept `dealerReturnAddress`. Confirm it is not shown as the customer-facing delivery address. | Branch |
| M8 | Customer label and a separate return label, in different sizes | The branch prints a small return label then a large delivery label as two pages | Needs direct printing to two printers (M37) | Branch |
| M9 | Scan invoice or job no., scan consignment note, accept, labels print; fast for large batches | Scan Tracking dialog on the branch. Printing goes through `window.print()`, which opens a dialog each time. | Direct printing (M37) before it is usable for 60–70 parcels | Branch |
| M10 | Invoice email address editable per order | The order's Email is editable on the main screen and defaults from the customer. The API emails the address stored on the posted invoice. | Verify the order's email reaches the posted invoice. If it does, this is already met. | Verify |
| M11 | Frequently changed order fields on the main screen, the rest expandable | Main screen has account, date, run, delivery code, phone, email, applied-to, invoice note, dealer return and credit. The dialog has price code, freight, company, docket and paid. | Largely done; see M5 | Partial |

### Batch invoicing, job cards, pro forma

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M12 | Orders carry a run number; run 1 means ready to invoice, other runs hold orders | Run number on each order; `/invoicing` filters by start and end run | Default the invoice run to run 1 (Q9) | Partial |
| M13 | Select a run and print directly, with no intermediate list of orders | `/invoicing` runs select, stage, review, post. The API stages and posts separately, and the delivery-docket report reads the staging data. | Chain stage, dockets and post in one action in the UI, keeping the "did the dockets print?" check | Partial |
| M14 | One job-card workflow: print the batch by run, plus reprint for one-off jobs | Per-order only (`GET /api/orders/{id}/job-card`) | Done on both: `GET /api/job-cards` and the Job cards page, with a single-order reprint (also paper item 5). Open: which status triggers printing (Q2) | Branch |
| M15 | Pro forma invoice, printed by order ID, using the invoice template | **Does not exist** in either repo. The design notes say it was folded into document actions, but there is no such action. | Done in the UI only: a **Pro forma** button on the order screen opens `/orders/{id}/pro-forma`, the same document as the posted invoice (now a shared `InvoiceDocument`) built from the order's lines and totals. Titled "Pro forma invoice", with the order number instead of an invoice number and the day it is printed, the company's name and address, and its bank details (or the Control record's) so the customer can pay. Print only: ProForma.Frm could also email it, and the API has no endpoint for emailing an order. The footer says "This is a pro forma invoice for payment in advance. It is not a tax invoice.", which is my wording and needs the customer's OK (Q1). The API report definitions (`STINVOICE`, `DelDocket`) still carry an unused `Proforma` parameter | Branch |

### Dispatch

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M16 | Verify each order has a consignment number, then confirm the batch as tracked | Branch: editable tracking column and a "Process" button with a confirm | None | Branch |
| M17 | One batch action to email invoice and tracking to customers; orders can be held overnight | **Built on `feat/cf-despatch-email-tab`, not yet on the hub branch.** The **Email invoices** sidebar page has a Send despatch emails tab, modelled on the old Email Invoices screen: Preview, Send Now, an "OK to send invoices?" confirmation and a result list with failures. The "Ready to notify" grid was removed from the Despatch page. | Still open: the email has no invoice PDF and no tracking link, and the old wording and company SMTP settings are not ported (Q7). The old app also had a test-mode switch that sent every email to one internal address. The new app has none. | Partial |
| M18 | Simplified dispatch screen with one consolidated action | Mostly done on the branch | The sidebar print button is done: the Email invoices page (paper item 1) | Branch |

### Proofs and companies

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M19 | Proof header, logo and sender chosen from the order's company | The proof dialog has a Company field, and companies already have a letterhead and a From address | Done on both: proof defaults follow the order's company, the customer's letterhead is opt-in and the customer proof fields are gone (paper item 24) | Branch |
| M20 | Proofs can't be emailed reliably for companies other than Stead Brothers | An email endpoint exists. A likely cause is the API rule that the proof header must match the customer's stored one. | The company/sender precedence is fixed in the API (see M19). Reproduce with a real Adams or Supreme job to see whether anything else (for example the SMTP server refusing a different From address) is involved (paper items 6, 24) | Verify |

### Imports

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M21 | A CSV from a newly acquired company is rejected as an unrecognised format | The parser requires the first header to be `order_number` (`ImportWebOrdersService.cs`) and treats one file as one order | Get the failing file. Working examples are in the legacy folder (`IMPORT*.csv`, `stead-bros-order-*.csv`). A byte-order mark or a different export layout is my first guess. | Verify |
| M22 | Remove the obsolete Adams import | **Nothing named Adams in the new UI or API.** Only "Import web orders" exists, and the stamp import was already dropped (July 2026). | Ask which control or setting they mean. `defImportCust` belongs to the web import, which they want to keep. | Question |

### Reports and history

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M23 | History: type what you know, then press Search. No automatic load. Search by name, phone, email, invoice no., job no. or approximate date. | The grid loads when the page opens. Recipient, job, order and invoice no. search exist. No date, phone or email search. | Done on both: email, phone and date-range boxes (paper item 28), and an explicit Search button (or Enter) with an empty start, so nothing loads or re-queries until asked. Search needs at least one box filled. The search is remembered across Back | Branch (UI + API) |
| M24 | Invoice register by date range and a customer range that covers company prefixes | Date range and a single customer picker | Done on both: the register takes a customer code from/to; "to" includes every code starting with it, so ADM to ADM is all ADM accounts. The printed register names the customers covered. The API also accepts the range for Customer Sales and Product Sales, but only the register screen offers it. **The report used to stop silently at 500 invoices (newest dropped, totals short). Fixed on the API branch: the limit is now 5,000 and a larger run is refused with a message to narrow the dates or customers.** | Branch (UI + API) |
| M25 | Reports print directly, not saved as PDF | Browser print dialog (`lib/print.ts`) | Depends on the cloud printing decision (M35–M36) | Design needed |

### Customers, receipts, deposits

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M26 | Compact customer screen: too many fields, too much scrolling | Eleven stacked cards (Identity, Invoice address, Delivery address, Contact, Pricing & GST, Freight & delivery, Credit, Invoicing & documents, Proofs, Web order defaults, Remembered payment details) | Rework as tabs and remove rarely used fields | Branch: four tabs (Details, Pricing & freight, Invoicing & proofs, Web & payment), one Save. No fields removed yet: we need the customer to say which are rarely used. |
| M27 | Separate fields that were combined; rename State to Company; remove cheque and fax options; keep delivery and return address | Company rename done; cheque and fax mostly gone (paper item 19) | Ask which combined fields they mean (Q3) | Partial |
| M28 | Receipts: pick customer, review outstanding items, enter amount, auto-allocate; keep settlement discount | Done | None | Done |
| M29 | Bank deposits happen automatically after a receipt; the Bank deposits screen may go | Deposits are a manual run over unbanked receipts (`DepositService`) | **Earlier answer (29 Oct 2026, API repo `docs/CUSTOMER-REQUIREMENTS.md`): the Bank deposits screen is "probably not necessary" because banking is done in Xero; the last deposit recorded was 16 April 2026.** So this may simply be removing the screen rather than automating deposits. **Done on the branch (UI only): the Bank deposits menu entry, the dashboard "Receipts to bank" tile and the Bank Deposit report (`bankdep`) are removed, and the receipts screen no longer says receipts are "available to bank".** This follows their 29 Oct answer ("No. Just automatically process.") and the meeting. It is a soft removal: the `/deposits` page, the API (`/api/deposits`) and all deposit data are untouched, so putting it back is a few lines. **Not built: "automatically process".** It probably means receipts post to the ledger when recorded, with no separate "Process unprocessed receipts" step, but that removes the chance to correct a receipt before it posts, so it needs their confirmation (Q4, reworded). | Branch (UI only), automatic processing to confirm |
| M30 | Retain credit-card details where required | "Remembered payment details" stores card number and expiry | **Conflicts with earlier advice (29 Oct 2026): do not store card numbers either; 542 customers had a card number stored, and a purge plan is needed.** The customer was told to use a payment gateway (Stripe or Square); the emailed-invoice payment link (PR 309) is the start of that. Raise this before keeping the fields; see paper item 21 (CVV) | Question |

### Pricing

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M31 | Pricing stays in the Orders SQL database, alongside the product catalogue, not in the website database | The product catalogue and `unitPrice1`–`5` are read from Soset (`Product` is a Soset entity). SQL holds pricing rules only. | New SQL product and price tables, plus a migration. This contradicts "no new database fields" (M39). | **Branch (API).** New table `ProductPrice` (`docs/sql/product-prices.sql`, run it first): one row per product, `Price1` to `Price9`, `Cost`, description. A one-off "Copy from Soset" fills it without overwriting anything. Only prices are migrated, not the whole catalogue (T4 assumed, not confirmed). |
| M32 | Export prices, edit in Excel, import the revised file | None | Export and import endpoints and a screen. CSV underneath is fine; Excel in the user-facing flow (paper item 32). **Known shape of their sample sheet (API repo `docs/CUSTOMER-REQUIREMENTS.md`): about 961 rows of Prod ID, Product Description, nine price codes and COST, no formulas; most rows have only a Code 1 price. Price code names: 1 Web including delivery, 2 Web add delivery, 3 Dealers, 4 Govt High Volume, 5 Aust Post, 6 Phil Stead, 7 to 9 unnamed.** That is not the shape Soset supplies today (`UnitPrice1`–`5`, `Cat1`–`Cat5`), and does not match the Access screen on the scan (price codes 2 to 9, cost, retail). The sample used placeholder values. | **Branch (UI + API).** CSV in and out (opens in Excel; accepts Excel's own CSV, semicolons and a byte-order mark). The import is checked first and shows what would change, applies all-or-nothing, never deletes a product, treats a missing column as "leave alone" and a blank cell as "clear". **Not done: reading .xlsx directly** (save as CSV for now), and the column set is the sample sheet's shape, so Q8 may change it. |
| M33 | Where prices are resolved at order entry | The API resolves price from Soset `unitPrice` columns by price code | Switch to the SQL price source. Decide what happens to the catalogue and Soset's stamp jobs (T4). | **Branch (API).** Order entry uses the list before Soset for the customer's price code, behind the switch `Pricing:UseSqlPrices` (off by default, so deploying changes nothing). A blank price falls back to Soset, and customer pricing rules still win. Cut-over steps are in `docs/sql/product-prices.sql`. Soset's catalogue and stamp jobs are untouched. |
| M34 | Future stock control should be able to read the same data | n/a | Keep the structure open for it; not in scope | Info |

### Printing from the cloud

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M35 | A cloud-hosted app must reach printers on the user's machine | All printing is `window.print()`; the browser cannot choose a printer | Decide: local print agent, print server or network printing (T1) | Design needed |
| M36 | Ordinary reports and documents may use a print dialog, defaulting to the system printer | Works today | Verify in the target environment | Verify |
| M37 | Dispatch labels print directly, with no dialog, to the right printer for each label size | The label page uses `window.print()`, so a dialog opens for every parcel | Needs M35's decision | Design needed |

### Environment and scope

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M38 | An Ashcom Cloud environment connected to the related systems for end-to-end testing | UI on Vercel proxying to the API. The Soset worker is a 32-bit Windows process that needs access to the Soset data. | The host must give the API and the worker access to the Soset data (T2) | Design needed |
| M39 | Use the existing SQL database; no new fields expected | n/a | Pricing needs new tables; run job cards, automatic deposits and an order email may need more | Question |
| M40 | Old and new apps may run side by side during validation, on the shared database | n/a | Checked: the API already takes numbers atomically, but the legacy invoice run, receipt form and deposit form hold a number and write it back later, which can wind a sequence back. API (branch): skips any number already in use, so it never issues a duplicate, and `GET /api/settings/number-sequences` reports a sequence that is behind or a number used twice. The reverse (legacy reusing an API number) needs the operating rules in the API's `docs/PARALLEL-RUNNING.md`, or a small legacy patch. | Branch (API only) |
| M41 | Immediate scope is feature parity with the existing app; no fixed cut-over date | n/a | Use `DESIGN-NOTES.md` §2 and §4 as the parity checklist. They are partly out of date. | Info |

### Open questions

**For the customer**

| # | Question | Items |
| --- | --- | --- |
| Q1 | Pro forma: what should it show, and does it need a number? | M15 |
| Q2 | Job cards: which status triggers printing ("corrected status" is unclear)? Print by run only, or also by date? | M14 |
| Q3 | Which fields on the customer record should be separated? | M27 |
| Q4 | We have hidden Bank deposits and its report. Does "automatically process" mean a receipt should post to the ledger as soon as it is recorded, with no separate Process step (so it cannot be corrected first)? Or is today's Process button fine? | M29 |
| Q5 | Which Adams control or setting should be removed? | M22 |
| Q6 | Send the failing CSV and a working one. | M21 |
| Q7 | Should the despatch email attach the invoice as well as the tracking number? | M17 |
| Q8 | Pricing: which columns do they edit in Excel, who edits them, and can we have their Excel file and a demo of the Access tool? | M31–M32, paper item 32 |
| Q9 | Should the invoice run default to run 1? | M12 |
| Q10 | What does "How to update here" refer to (paper item 10)? | paper item 10 |
| Q11 | Handwritten price list on Part 2 page 6: what is it? | paper item 33 |
| Q12 | Should less common order fields be in-page and expandable, or stay in the popup? | M5, M11 |
| Q14 | Which fields on the customer screen are rarely used and can be removed? (The screen is now in four tabs; nothing has been removed.) | M26 |

**For the team and Ashcom**

| # | Question | Items |
| --- | --- | --- |
| T1 | Label printing: what printer models and language (ZPL?), what sizes, USB or network, how many workstations print? | M8, M9, M35, M37 |
| T2 | Can the cloud host reach the Soset data and run the 32-bit worker? | M38 |
| T3 | How do we stop number-allocation clashes while both apps run? | M40 |
| T4 | Where do product prices live today, and which system wins at order entry after the move? Migrate the whole catalogue from Soset, or only prices? | M31, M33 |
| T5 | Is the "no new database fields" position still intended, given pricing? | M39 |

**To check in code or data**

- The order's email reaches the posted invoice (M10).
- Why proof emailing fails for other companies (M20).
- The failing CSV against `ImportWebOrdersService` (M21).
- Whether the Vercel deployment is behind `master`, since the scans show old report screens (paper items 14, 15).
- How many customers have GST exempt or Paid default set before those checkboxes are hidden (paper items 19, 20).

---

## 12. API work for this round

Committed on the API repo's `feat/customer-feedback-nov-2026` branch (base: `master` with `feat/despatch-labels` merged in). Tests: 475 pass; 4 database integration tests fail, which need a real database and were failing before this work (earlier the test database also lacked the `PaymentLinkUrl` column).

| API change | Endpoint or area | For | UI to do |
| --- | --- | --- | --- |
| Despatch labels, tracking Required toggle, barcode parsing, order dealer return address (Jackson Beecher, merged in) | `/api/tracking/...`, order create/update | 1, 3, 9; M7–M9, M16 | Already on the UI hub branch |
| History search by email, phone and invoice date range | `GET /api/invoices/history`: `emailSearch`, `phoneSearch`, `dateFrom`, `dateTo` | 28; M23 | Done (boxes, date range and the explicit Search button) |
| Job cards for a whole run | `GET /api/job-cards?startRun=&endRun=` | 5; M14 | Done (Job cards page) |
| Proof defaults follow the order's company | `GET /api/proofs/{jobNo}` | 24, 6; M19, M20 | Done (customer letterhead off by default; customer proof fields removed) |
| Customer account-number range on the archived-invoice reports | `GET /api/reports/{name}/html`: `custFrom`, `custTo` | M24 | Done (Customer from/to on the Invoice Register) |
| Company letterhead as the delivery docket heading | `DelDocket` report | 2 | None, unless "heading" means text (Q13) |

Not done on the API: emailing a pro forma (the pro forma itself needs no API work: the UI builds it from the order, M15), the invoice PDF and tracking link on the despatch email (M17, Q7), automatic deposits (M29), and pricing in SQL (M31–M33).

Open question added: **Q13** (for the customer): by "heading" on the packing slip do they mean the company logo/letterhead (what the API now prints), or the company name and address as text?

---

## Summary

**Paper items (1–33)**

| Status | Items |
| --- | --- |
| Done | 7, 11, 14, 15, 16, 17, 18, 22, 27, 29, 30 |
| Branch (on the hub branch, not yet on `master`) | 1 (sidebar print button done), 3 (partial), 9, 12, 13, 19, 20, 31 |
| Branch (UI + API) | 5, 6, 24, 28, 32 |
| Branch (API only; docket heading) | 2 |
| Partial | 8 |
| Question | 4, 10, 23, 25, 26, 33 |
| Push back | 21 |

**Meeting items (M1–M41)**

| Status | Items |
| --- | --- |
| Done | M1, M3, M28 |
| Branch | M2, M4, M7, M8, M9, M15, M16, M18, M26, M29 |
| Branch (API only) | M40 |
| Branch (UI + API) | M14, M19, M23, M24, M32 |
| Branch (API) | M31, M33 |
| Partial | M5, M6, M11, M12, M13, M17, M27 |
| Verify | M10, M20, M21, M36 |
| Design needed | M25, M35, M37, M38 |
| Question | M22, M30, M39 |
| Info | M34, M41 |

**Biggest risks:** cloud and direct label printing (M35–M37), switching order entry over to the SQL
price list (M31–M33; built, but off until someone checks prices and turns on `Pricing:UseSqlPrices`),
and running both apps on one database (M40).

### Still outstanding (as at 13 Nov 2026)

Everything below "Done" is on the hub branches (`feat/customer-feedback-nov-2026` in the UI and the API),
not yet on `master`. What is left:

**1. Waiting on the customer** (nothing to build until they answer)

| Question | Holds up |
| --- | --- |
| Q1 pro forma wording and whether it needs a number | M15 (built with my own wording) |
| Q4 should a receipt post to the ledger as soon as it is recorded, with no Process step? | M29 (automatic processing) |
| Q8 which price columns they edit, who edits them, their real Excel file | M31 to M33 (built as a best-judgement version, may be reworked) |
| Q13 is the docket "heading" the company logo or the company name and address as text? | paper item 2 |
| Q14 which customer-screen fields are rarely used? | M26 (tabs done, nothing removed) |
| The PCI concern: do not store a card security code; 542 customers already have card numbers stored | M30, paper item 21 |
| Q2, Q3, Q5, Q6, Q7, Q9, Q10, Q11, Q12 | M14, M27, M22, M21, M17, M12, paper items 10 and 33, M5 and M11 |

**2. Built, but needs testing or a decision before it is used**

| What | Needed |
| --- | --- |
| Price list (M31 to M33) | Run `docs/sql/product-prices.sql` (API repo) before deploying. Fill the list, check some prices against Soset, then turn on `Pricing:UseSqlPrices`. It is off by default. |
| Number clashes (M40) legacy patch | Not compiled or run. Build it in VB6 and test against a copy of the database (Legacy repo, branch `feat/cf-number-writeback`, not merged to `master`). |
| Number clashes (M40) unique indexes | Run `docs/sql/unique-document-numbers.sql` only after the duplicate check is clean and a receipt and an invoice run have been tested from the legacy app. |
| Number clashes (M40) operating rules | Agree them with the staff: one app at a time for invoicing, and one receipt batch open at a time (both apps share the receipt working tables). |
| Invoice register cap | The limit is now 5,000 and a bigger run is refused. Tell the staff what the message means. |
| Soset worker path | The despatch branch changes `SosetDataPath` from `C:\FoxPro` to `C:\Soset`. Confirm it is intended. |

**3. Not built**

| Item | Notes |
| --- | --- |
| M17 despatch email content | The batch send is built (Email invoices page). Still to do: the invoice PDF, tracking link, old wording and company SMTP settings (Q7). |
| M5, M6, M11, M12, M13, M27 | Partly done. M6 needs an audit of other screens for mouse-only steps. |
| M35 to M37, M25, M38 | Cloud and direct label printing, and the cloud test environment. Need a design first. |
| Pro forma by email | The API has no endpoint for emailing an order. |
| Reading .xlsx for the price list | CSV only for now. |
| Product Control screen (item 12: supplier, margins, costs) | Needs a data model. |
| Automatic receipt processing (M29) | Waiting on Q4. |

**4. To check**

M10, M20, M21 and M36 may already work. They need checking against the API or real data before any change.

**5. Release**

None of this is on `master` yet. When the hub branches are merged, `master` is mirrored to GitHub and Vercel by the pipeline.

---

## 13. Splitting the remaining work between two developers

The remaining items are split by code area so the two developers rarely edit the same files, with
the work that is blocked on customer answers put first.

### Developer A: despatch, printing and order entry

Stays close to Jackson Beecher's despatch branch and the order screen.

| Item | What | Notes |
| --- | --- | --- |
| M17 | Despatch email | The batch send is built. Still to do: invoice PDF, tracking link, old wording, company SMTP settings (Q7). |
| 1 | Despatch sidebar print button | Done: the Email invoices sidebar page (Reprint invoice tab). |
| 2 | Docket heading | Blocked on Q13 (logo or text?). |
| M6, M5, M11, M12, M13, M27 | Keyboard audit of other screens, and the partials | First task: read these rows and list what each still needs. |
| M35–M37 | Cloud and direct label printing | Design note only to start; high risk. |
| (check) | Soset worker `SosetDataPath` `C:\FoxPro` to `C:\Soset` | Confirm the change is intended. |

### Developer B: customers, pricing and money

| Item | What | Notes |
| --- | --- | --- |
| M26 | Customer screen tabs | Do first; not blocked. |
| M32, 32 | Price maintenance in SQL with Excel import and export | Built on the branch as a best-judgement version (see M31 to M33): table, endpoints, Price list screen. May be reworked when Q8 is answered. Not done: reading .xlsx directly. |
| M29 | Bank deposits | Done on the branch (menu, dashboard tile and report hidden; API untouched). Automatic processing still to confirm with the customer (Q4). |
| M30, 21 | Card storage and CVV | Raise the PCI concern with the customer; do not build until they answer. |
| M40 | Running-number clashes with both apps on one database | Done on the API branch (guard and health check), plus a legacy VB6 patch (Legacy repo, branch `feat/cf-number-writeback`, not compiled or run: build and test it in VB6 first) and a unique-index script (`docs/sql/unique-document-numbers.sql` in the API repo, run only after checking duplicates). Operating rules are in the API's `docs/PARALLEL-RUNNING.md`. Also found: the legacy receipt screen empties the `Receipts` and `RecInvoice` working tables when it opens, and the web app keeps its receipt batch in the same tables, so only one app may have a receipt batch open at a time. |
| Invoice register cap | Done on the API branch: the limit (`ReportQuery.MaxInvoices`) is raised from 500 to 5,000, and a report over the limit is now refused with a message to narrow the dates or customers, instead of quietly dropping the newest invoices. UI unchanged: it already shows the message. |

### Shared rules

1. **Branches.** Each developer works on a sub-branch of `feat/customer-feedback-nov-2026` in both
   repos (for example `feat/cf-despatch-print` and `feat/cf-customers-pricing`) and merges back into
   the hub branch, not `master`.
2. **API ownership.** A owns despatch and tracking in the API; B owns customers, pricing and
   numbering. Ask the other developer before changing their area.
3. **This file.** It is the most likely thing to conflict. Each developer edits only the rows for
   their own items, and one person merges those edits.
4. **Customer questions.** Send Q1–Q13 and T1–T5 as one batch before either starts, so nobody
   waits on answers mid-build.
5. **Claude Code.** Point each session at this file as the brief. Commit and push only when asked;
   check the API repo is up to date and has no unmerged work before changing it; leave the API
   repo's `stash@{0}` (unfinished statement remittance work) alone.
6. **Balance.** A has more, smaller items; B has fewer, heavier ones. If B is blocked on Q8, B takes
   M26 and the 500-invoice decision first while A carries on with M6 and the despatch work.
