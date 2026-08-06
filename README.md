# Stamp Orders — web front end

Next.js 15 front end for the Stead Brothers Stamp Orders modernisation. It replaces the
VB6 desktop UI and talks exclusively to the `StampOrders` C# API.

See `DESIGN-NOTES.md` for the VB6 form mapping, the consolidations, and the list of legacy
functions the API does not yet support.

---

## Running it

**1. Start the API.** Use the HTTP profile. The dev HTTPS certificate is self-signed and
the Next.js server-side proxy will reject it.

```
cd "Stamp Orders C#/src/StampOrders.Api"
dotnet run
```

It listens on `http://localhost:57901`.

**2. Configure and start the web app.**

```
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

If the API is somewhere other than `http://localhost:57901`, set `STAMP_ORDERS_API_URL`
in `.env.local`.

---

## How it talks to the API

The browser only ever calls this application's own origin. `next.config.ts` rewrites
`/api/*` and `/health/*` to the API server-side.

That means:

- `Cors:AllowedOrigins` in `appsettings.json` can stay empty
- no CORS preflight round-trips
- the API base URL is never exposed to the client

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Work waiting: live orders, staged invoices, despatch queue, receipts to bank |
| `/orders` | Order list, filtered by customer or run number |
| `/orders/new` | Create an order; the rest defaults from the customer |
| `/orders/[orderId]` | Order workspace — lines, totals, credit position, Soset status |
| `/invoicing` | Invoice run: select → stage → review → post |
| `/invoices` | Invoice history search |
| `/invoices/[invoiceNo]` | Invoice or delivery docket, printable |
| `/receipts` | Receipt entry and allocation against open items |
| `/deposits` | Bank deposits |
| `/despatch` | Consignment capture and despatch notifications |
| `/customers`, `/customers/[custId]` | Customer reference (read-only) |
| `/products` | Product reference from Soset (read-only) |
| `/system` | Soset diagnostics, API readiness, stamp job lookup |

---

## Structure

```
src/
├── app/                    Routes (App Router)
├── components/
│   ├── ui/                 Buttons, cards, tables, modal, form controls
│   ├── AppShell.tsx        Navigation
│   ├── CustomerPicker.tsx  Replaces GetCust.Frm
│   ├── ProductPicker.tsx   Replaces GetProd.frm
│   ├── AddLineDialog.tsx   Replaces addLine.frm and UpdLine.Frm
│   └── CreditCheckPanel.tsx
├── lib/
│   ├── api.ts              Fetch wrapper, RFC 7807 handling
│   ├── endpoints.ts        One function per API endpoint
│   └── format.ts           Formatting + LineCalculator mirror
└── types/api.ts            TypeScript mirrors of the C# contracts
```

---

## Deployment

Built for GitHub + Vercel, as set out in the technology overview.

Set `STAMP_ORDERS_API_URL` as an environment variable in the Vercel project, pointing at
the API on the cloud server. Because the proxy runs server-side, the API only needs to
accept traffic from Vercel rather than from every user's browser.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next.js lint |
