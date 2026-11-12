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
| `feat/despatch-labels` (Jackson Beecher), which includes `feat/order-dealer-return-address` | 1, 3, 9 | 11 Nov 2026 | The developer says it is about 99% done. **Still to do:** the print button has been taken off the Despatch page on purpose. Printing will move to its own sidebar button, which has not been built yet. Until it is, labels print only from **Accept** in the Scan Tracking dialog. This branch also removes the "Ready to notify" grid from the Despatch page. |

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
| 1 | How do we print the despatch labels? | P1 | Branch | **Still to do: a separate sidebar print button** (see the merged-branches table above). From `feat/despatch-labels`: capturing a consignment prints a return label and a delivery label (`DespatchLabelPrint.tsx`, `GET /api/tracking/labels/{invoiceNo}`). The Despatch page is rebuilt to work like the old Tracking Entry screen (Scan and Process buttons, `ScanTrackingDialog.tsx`). |
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
| 32 | "I want pricing to be linked from Excel. Do a page like my price increase Access program." | P3 p4 | To do, **approach changed** | Modelled on their Access form "Change prices in Soset": product ID, name, search code, weight, supplier code, cost, retail and price codes 2–9 (Aust Post; ENZ code 7; Adams/RSA/eStamps code 8, inc delivery and GST; Stamp World code 9), the NoStamp flag and **Go to next record**. **The meeting then agreed prices live in the Orders SQL database, maintained by Excel-compatible export and import** (see M31–M34), not by writing to Soset. Today the catalogue and `unitPrice1`–`5` are read from Soset only, so this needs new SQL product and price tables and a data migration. The largest item on this list. |

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
| M2 | Enter accepts the customer; Enter again starts the order | First Enter selects. "Start order" is a button, and an existing-open-order dialog can appear in between. | Make Enter start the order | Partial |
| M3 | F2 to search for a different customer | `CustomerPicker` handles F2 | None | Done |
| M4 | Enter job/order no., product, qty and colour without the mouse | PR 317: tab order, text selected on focus, F2 for Colour, Alt+L for a new line, double-click to edit | Check the edit-line dialog behaves the same | Partial |
| M5 | Rarely changed fields out of the tab order or in an expandable section | Done in the add-line dialog. On the order, infrequent fields are in the "More fields" popup. | Decide whether "expandable" means in-page instead of a popup (Q12) | Partial |
| M6 | Keyboard use across the whole app; replacements for F5/F6 | Key handlers only on Orders, the pickers, Despatch and Pricing. Previous/Next on the order are buttons only. | Add shortcuts for Previous/Next, then audit every other screen (also paper item 8) | Partial |

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
| M15 | Pro forma invoice, printed by order ID, using the invoice template | **Does not exist** in either repo. The design notes say it was folded into document actions, but there is no such action. | New order action: the invoice template titled pro forma, with no invoice number | To do |

### Dispatch

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M16 | Verify each order has a consignment number, then confirm the batch as tracked | Branch: editable tracking column and a "Process" button with a confirm | None | Branch |
| M17 | One batch action to email invoice and tracking to customers; orders can be held overnight | **Not built.** The Despatch page says emails will be "planned as their own tab", and the "Ready to notify" grid was removed. The API already has per-invoice and batch send. | Add the send action. Confirm the despatch email includes the invoice (Q7). | To do |
| M18 | Simplified dispatch screen with one consolidated action | Mostly done on the branch | The sidebar print button is the developer's remaining part (paper item 1) | Branch |

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
| M24 | Invoice register by date range and a customer range that covers company prefixes | Date range and a single customer picker | Add customer from/to (API and UI) | To do |
| M25 | Reports print directly, not saved as PDF | Browser print dialog (`lib/print.ts`) | Depends on the cloud printing decision (M35–M36) | Design needed |

### Customers, receipts, deposits

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M26 | Compact customer screen: too many fields, too much scrolling | Eleven stacked cards (Identity, Invoice address, Delivery address, Contact, Pricing & GST, Freight & delivery, Credit, Invoicing & documents, Proofs, Web order defaults, Remembered payment details) | Rework as tabs and remove rarely used fields | To do |
| M27 | Separate fields that were combined; rename State to Company; remove cheque and fax options; keep delivery and return address | Company rename done; cheque and fax mostly gone (paper item 19) | Ask which combined fields they mean (Q3) | Partial |
| M28 | Receipts: pick customer, review outstanding items, enter amount, auto-allocate; keep settlement discount | Done | None | Done |
| M29 | Bank deposits happen automatically after a receipt; the Bank deposits screen may go | Deposits are a manual run over unbanked receipts (`DepositService`) | **Earlier answer (29 Oct 2026, API repo `docs/CUSTOMER-REQUIREMENTS.md`): the Bank deposits screen is "probably not necessary" because banking is done in Xero; the last deposit recorded was 16 April 2026.** So this may simply be removing the screen rather than automating deposits. Confirm, then keep or drop the deposit history report (Q4) | To do |
| M30 | Retain credit-card details where required | "Remembered payment details" stores card number and expiry | **Conflicts with earlier advice (29 Oct 2026): do not store card numbers either; 542 customers had a card number stored, and a purge plan is needed.** The customer was told to use a payment gateway (Stripe or Square); the emailed-invoice payment link (PR 309) is the start of that. Raise this before keeping the fields; see paper item 21 (CVV) | Question |

### Pricing

| # | Request | Today | Change needed | Status |
| --- | --- | --- | --- | --- |
| M31 | Pricing stays in the Orders SQL database, alongside the product catalogue, not in the website database | The product catalogue and `unitPrice1`–`5` are read from Soset (`Product` is a Soset entity). SQL holds pricing rules only. | New SQL product and price tables, plus a migration. This contradicts "no new database fields" (M39). | Design needed |
| M32 | Export prices, edit in Excel, import the revised file | None | Export and import endpoints and a screen. CSV underneath is fine; Excel in the user-facing flow (paper item 32). **Known shape of their sample sheet (API repo `docs/CUSTOMER-REQUIREMENTS.md`): about 961 rows of Prod ID, Product Description, nine price codes and COST, no formulas; most rows have only a Code 1 price. Price code names: 1 Web including delivery, 2 Web add delivery, 3 Dealers, 4 Govt High Volume, 5 Aust Post, 6 Phil Stead, 7 to 9 unnamed.** That is not the shape Soset supplies today (`UnitPrice1`–`5`, `Cat1`–`Cat5`), and does not match the Access screen on the scan (price codes 2 to 9, cost, retail). The sample used placeholder values. | To do, blocked on Q8 |
| M33 | Where prices are resolved at order entry | The API resolves price from Soset `unitPrice` columns by price code | Switch to the SQL price source. Decide what happens to the catalogue and Soset's stamp jobs (T4). | Question |
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
| M40 | Old and new apps may run side by side during validation, on the shared database | n/a | Check that both can't allocate the same invoice, receipt or deposit number (T3) | Verify |
| M41 | Immediate scope is feature parity with the existing app; no fixed cut-over date | n/a | Use `DESIGN-NOTES.md` §2 and §4 as the parity checklist. They are partly out of date. | Info |

### Open questions

**For the customer**

| # | Question | Items |
| --- | --- | --- |
| Q1 | Pro forma: what should it show, and does it need a number? | M15 |
| Q2 | Job cards: which status triggers printing ("corrected status" is unclear)? Print by run only, or also by date? | M14 |
| Q3 | Which fields on the customer record should be separated? | M27 |
| Q4 | Automatic banking: one deposit per day? Per payment type? Do they still need a deposit history report? | M29 |
| Q5 | Which Adams control or setting should be removed? | M22 |
| Q6 | Send the failing CSV and a working one. | M21 |
| Q7 | Should the despatch email attach the invoice as well as the tracking number? | M17 |
| Q8 | Pricing: which columns do they edit in Excel, who edits them, and can we have their Excel file and a demo of the Access tool? | M31–M32, paper item 32 |
| Q9 | Should the invoice run default to run 1? | M12 |
| Q10 | What does "How to update here" refer to (paper item 10)? | paper item 10 |
| Q11 | Handwritten price list on Part 2 page 6: what is it? | paper item 33 |
| Q12 | Should less common order fields be in-page and expandable, or stay in the popup? | M5, M11 |

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

Committed on the API repo's `feat/customer-feedback-nov-2026` branch (base: `master` with `feat/despatch-labels` merged in). Tests: 452 pass; the same 5 database integration tests fail as before this work (the test database lacks the `PaymentLinkUrl` column, so they fail on a schema gap rather than on any change here).

| API change | Endpoint or area | For | UI to do |
| --- | --- | --- | --- |
| Despatch labels, tracking Required toggle, barcode parsing, order dealer return address (Jackson Beecher, merged in) | `/api/tracking/...`, order create/update | 1, 3, 9; M7–M9, M16 | Already on the UI hub branch |
| History search by email, phone and invoice date range | `GET /api/invoices/history`: `emailSearch`, `phoneSearch`, `dateFrom`, `dateTo` | 28; M23 | Done (boxes, date range and the explicit Search button) |
| Job cards for a whole run | `GET /api/job-cards?startRun=&endRun=` | 5; M14 | Done (Job cards page) |
| Proof defaults follow the order's company | `GET /api/proofs/{jobNo}` | 24, 6; M19, M20 | Done (customer letterhead off by default; customer proof fields removed) |
| Company letterhead as the delivery docket heading | `DelDocket` report | 2 | None, unless "heading" means text (Q13) |

Not done on the API: pro forma (M15; `DelDocket.xml` and `STINVOICE.xml` already declare a `Proforma` parameter that nothing sets), batch despatch email action (M17; the batch send exists), customer range on the invoice register (M24), automatic deposits (M29), and pricing in SQL (M31–M33).

Open question added: **Q13** (for the customer): by "heading" on the packing slip do they mean the company logo/letterhead (what the API now prints), or the company name and address as text?

---

## Summary

**Paper items (1–33)**

| Status | Items |
| --- | --- |
| Done | 7, 11, 14, 15, 16, 17, 18, 22, 27, 29, 30 |
| Branch (on the hub branch, not yet on `master`) | 1 (sidebar print button still to do), 3 (partial), 9, 12, 13, 19, 20, 31 |
| Branch (UI + API) | 5, 6, 24, 28 |
| Branch (API only; docket heading) | 2 |
| Partial | 8 |
| To do | 32 (approach changed, and blocked on Q8; see M31–M34) |
| Question | 4, 10, 23, 25, 26, 33 |
| Push back | 21 |

**Meeting items (M1–M41)**

| Status | Items |
| --- | --- |
| Done | M1, M3, M28 |
| Branch | M7, M8, M9, M16, M18 |
| Branch (UI + API) | M14, M19, M23 |
| Partial | M2, M4, M5, M6, M11, M12, M13, M27 |
| To do | M15, M17, M24, M26, M29, M32 |
| Verify | M10, M20, M21, M36, M40 |
| Design needed | M25, M31, M35, M37, M38 |
| Question | M22, M30, M33, M39 |
| Info | M34, M41 |

**Biggest risks:** cloud and direct label printing (M35–M37), moving pricing into SQL (M31–M33),
and running both apps on one database (M40).
