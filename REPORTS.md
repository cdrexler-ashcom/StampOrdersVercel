# Reports in the web UI

The UI now surfaces the API's reporting endpoints. Three routes:

| Route                     | Purpose                                                              |
|---------------------------|---------------------------------------------------------------------|
| `/reports`                | End-user index of the reports that render with **live data**.       |
| `/reports/[name]`         | Viewer: filter, generate, preview and **Save as PDF**.              |
| `/reports/debug`          | Admin screen: every report, binding progress, generate a test copy. |

## How it talks to the API

Each report has three server views, all under the proxied `/api/reports/{name}` path:

- `/definition` — parsed report definition (JSON) — shown in the debug inspector.
- `/layout` — HTML layout preview with field placeholders. Works for **all** reports.
- `/html` — HTML with live data where a binding exists, else the layout preview.

`lib/reports.ts` holds the UI-side catalog (friendly title, description, category and a `bound`
flag mirroring the API's `BoundReports` sets). When a new report is bound on the API, flip its
`bound` flag here and it moves from "Layout only" to "Live data" automatically.

The debug screen also calls `GET /api/reports` and cross-checks the live list against the catalog,
so any drift (a report on the API but missing here, or vice-versa) is flagged.

## PDF / download

The API renders each report as a self-contained, print-ready HTML document. Rather than convert to
PDF on the server, the UI drives the browser's own print pipeline (`lib/print.ts`): the report is
loaded into a hidden, same-origin iframe and `print()` is called on it. The browser's dialog then
offers **Save as PDF**, which downloads the file with the report layout preserved exactly. "Open in
new tab" is also available for viewing or printing manually.

> If a one-click, server-generated PDF is wanted later (no dialog), the natural next step is a
> `/api/reports/{name}/pdf` endpoint on the API (e.g. QuestPDF or headless Chromium). The UI's
> "Save as PDF" button would then point at that URL instead — no other UI change needed.

## Progress tracking

`/reports/debug` shows a progress bar (bound ÷ total) and lists every report with its status,
category and blocker (for unbound ones). "Generate" produces a test version — live data where
bound, layout preview otherwise — so even unimplemented reports can be exercised end to end.

As of this change: **9 of 20** reports are bound to live data
(`invreg`, `invregdate`, `invreginvc`, `CustSales`, `ProdSales`, `history`, `ositems`, `dephist`,
`ageopen_excel`). The rest render as layout previews with a noted blocker.
