# Customer feedback — November 2026

The customer reviewed the web UI and sent back printed screenshots with handwritten notes,
alongside marked-up screenshots of the legacy VB6 forms. The scans are in
`C:\Projects\Stead Brothers - UI Feedback from Customer` (three CamScanner PDFs, Parts 1–3).
This file turns them into one list of requests, with each item's status.

Work on these items is collected on the **`feat/customer-feedback-nov-2026`** branch and
merged to `master` once it is done.

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
| Push back | We should not do this as asked |

A ✓ in the **Source** column means the customer ticked the item on the scan. On the Part 1
typed list a tick probably means "discussed" or "agreed", not "done".

Status as at 11 Nov 2026.

---

## 1. Questions and general requests (Part 1, typed and handwritten list)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | How do we print the despatch labels? | P1 | Branch | **Still to do: a separate sidebar print button** (see the merged-branches table above). From `feat/despatch-labels`: capturing a consignment prints a return label and a delivery label (`DespatchLabelPrint.tsx`, `GET /api/tracking/labels/{invoiceNo}`). The Despatch page is rebuilt to work like the old Tracking Entry screen (Scan and Process buttons, `ScanTrackingDialog.tsx`). |
| 2 | Put a heading on the packing slip. It is blank now; it should come from the dealer or the invoice. | P1 | To do | Packing slip / delivery docket heading. |
| 3 | Where do we find the Express Post numbers, to see whether we missed any? | P1 | Branch (partial) | `feat/despatch-labels` adds Order, an editable Tracking number(s) column and a Required toggle to the pending despatch list, so invoices still missing a number are visible. There is no list of numbers already used. Confirm with the customer that this is enough. |
| 4 | What CSV format do we need to import from Mr Stamps? ("CSV type?") | P1 ✓ | Question | Send them the import file spec for `/imports` (`POST /api/imports/web-orders`). |
| 5 | Print job cards for a whole run. | P1 ✓ | To do | Today a job card can only be printed from a single order (`GET /api/orders/{id}/job-card`). |
| 6 | Email proofs from every company on the proof screen. | P1 ✓ | To do | Check that the company list on `ProofDialog` offers every company and that each one sends. |
| 7 | F2 keys. | P1 ✓ | Done | PR 317: F2 opens Colour in the add line dialog. Pickers already open by typing. |
| 8 | Make it usable without a mouse. | P1 ✓ | Partial | PR 317: tab order, shortcuts and Alt+L on the order screen. Continue across the other screens. |

## 2. Order screen (Part 2, pages 1–3 and 7)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 9 | Add Dealer Return Address to the order header. Circled on the VB6 order form, with "Order ✓" beside it. | P2 p1 | Branch | `feat/order-dealer-return-address`, also included in `feat/despatch-labels`. A checkbox on new and existing orders and in `EditOrderDialog`; it defaults from the customer. It is stored as `OrdHeader.DirectDelivery` (`directDelivery` on `OrderHeader`); `direct` is the separate delivery docket flag. Needs the API to accept `dealerReturnAddress` on create and update. |
| 10 | "How to update here", written on both the order screen and the Edit order dialog. | P2 p2–3 | Partial | Header fields already edit in place and save when you leave a field (`OrderWorkspace.tsx`, header auto-save). The customer could not tell, so make saving obvious: a visible saved state, hints, or simplify the More fields dialog. |
| 11 | Double-click a line to edit it. | P2 p3 ✓ | Done | PR 317. |
| 12 | Question marks over More fields, Invoice run and Job card. | P2 p7 | To do | They do not know what these buttons do. Clearer labels or tooltips. |

## 3. Invoice detail (Part 2, page 5)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 13 | Email invoice: ask for confirmation and show the recipient address, which they can change. | P2 p5 | To do | Today the button sends straight away (`app/invoices/[invoiceNo]/page.tsx`). The endpoint already accepts `toOverride` (`invoices.email`), so the UI only needs a confirm dialog with an editable address. |

## 4. Reports — Invoice Register (Part 2, page 4)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 14 | Remove the description text, the date-range preset dropdown, Invoice no., Sort by, Layout only, Clear, Refresh and Open in new tab. | P2 p4 | To do | That leaves From, To, Customer and Generate. Confirm whether this applies to every report screen or only the Invoice Register (`ReportParamsPanel`, `app/reports/[name]/page.tsx`). |
| 15 | Rename "Save as PDF" to "Print". | P2 p4 | To do | The button already opens the browser print dialog (`lib/print.ts`). |

## 5. Customer maintenance (Part 3, pages 1 and 6, marked up on the VB6 Customer Edit form)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 16 | Allow account codes up to 8 characters. | P3 p1 | To do | `CustomerForm` currently allows 16 (`MAX.accountNo`). Check the database column and the API validation, then set the limit to 8. |
| 17 | Rename State Invoice to "Company". | P3 p1 | Done | PR 271 / PR 303. |
| 18 | Copy button from the invoice address to the delivery address. | P3 p1 | Done | `copyInvoiceAddress` in `CustomerForm`. |
| 19 | Remove Bank, Branch, Drawer name, Fax, GST exempt, Currency code and Use All Price. | P3 p1, p6 | Partial | All are gone except **GST exempt**, which is still on the form. |
| 20 | Paid default is crossed out with an X. | P3 p1 | To do | Probably means remove it. Still on the form ("Paid by default"); confirm before removing. |
| 21 | Add a "CSV" field next to the credit card number and expiry. | P3 p1 | Push back | Almost certainly the CVV (card security code). PCI-DSS does not allow storing it after authorisation, so we should not add it. Explain why. |
| 22 | Delivery Docket should "always" be ticked. | P3 p6 | To do | Either default it to on or remove the option; confirm which. |
| 23 | Discount %: handwritten note, read as "Nil". | P3 p6 | Question | Possibly default to 0. The note is hard to read, so confirm. |
| 24 | Proof header and proof "from" email should come from the company ("Pick up from State Invoice"), not be set per customer. | P3 p6 | To do | Affects `CustomerForm` (Letterhead image, Proof email "from") and the proof defaults (`GET /api/proofs/{jobNo}`). |
| 25 | Dealer Return Address: "?". | P3 p1 | Question | Explain what it does. It is now used on the order (#9) and by the despatch return label (#1). |
| 26 | Web order defaults: "Do we need this?". | P3 p1 | Question | Used by the web order import (#4). Explain, or remove it if they do not import web orders. |

## 6. History / invoice search (Part 3, page 2)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 27 | Show these columns together: Customer No., Customer name, Recipient, Date, Invoice No., Job No., Cust order No., Email (invoice), Phone (invoice) and Tracking. | P3 p2 | Done | All on `/invoices`, plus Order (PRs 307 and 314). |
| 28 | Search by phone and by email (taken from the invoice). | P3 p2 ✓ | To do | The columns exist. Check that there are phone and email search boxes and add them if not (`invoices.history` already takes `email` / `phoneNo`). |

## 7. Receipts (Part 3, page 3)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 29 | Drop the payment details popup (drawer, bank, branch) and just process the receipt. | P3 p3 | Done | The receipt screen has no drawer, bank or branch fields. |

## 8. Proof screen (Part 3, page 5)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 30 | Remove the Fax field and the Fax/Email output choice. | P3 p5 | Done | `ProofDialog` has no fax output. |
| 31 | Put the cursor in the Email field first ("1st Tab"). | P3 p5 | To do | Focus Email when the proof dialog opens. |

## 9. New feature — product price maintenance (Part 3, page 4)

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 32 | "I want pricing to be linked from Excel. Do a page like my price increase Access program." | P3 p4 | To do | Modelled on their Access form "Change prices in Soset": it asks for a product ID, then shows product name, product ID, search code, weight, supplier code, cost, retail and price codes 2–9 (Aust Post; ENZ code 7; Adams/RSA/eStamps code 8, inc delivery and GST; Stamp World code 9; one N/A), plus the NoStamp flag and **Go to next record**. This needs a Soset product price **write** endpoint on the API, which does not exist yet. Excel import/export of prices is the other half of the request. The largest item on this list. |

## 10. Unclear

| # | Request | Source | Status | Notes |
| --- | --- | --- | --- | --- |
| 33 | A handwritten column of prices, with some crossed out, "15.99A??" circled, and "Order No, Disc" written sideways. | P2 p6 | Question | Possibly a price check against a real order. Ask the customer. |

---

## Summary

| Status | Items |
| --- | --- |
| Done | 7, 11, 17, 18, 27, 29, 30 |
| Branch (on the hub branch, not yet on `master`) | 1 (sidebar print button still to do), 3 (partial), 9 |
| Partial | 8, 10, 19 |
| To do | 2, 5, 6, 12, 13, 14, 15, 16, 20, 22, 24, 28, 31, 32 |
| Question | 4, 23, 25, 26, 33 |
| Push back | 21 |
