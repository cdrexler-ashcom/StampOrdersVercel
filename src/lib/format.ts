/**
 * Formatting and client-side calculation helpers.
 *
 * The line calculator here is a transcription of LineCalculator.Calculate so the entry
 * form can show live totals. The API remains authoritative: whatever it returns on save
 * replaces whatever was previewed here.
 */

const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const decimal = new Intl.NumberFormat("en-AU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return currency.format(value);
}

export function amount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return decimal.format(value);
}

export function qty(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : decimal.format(value);
}

export function date(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * yyyy-MM-dd, for date inputs.
 *
 * Built from local date components rather than toISOString(). toISOString() converts to
 * UTC, which rolls the date backwards for anyone east of Greenwich: at 09:00 AEST the
 * UTC date is still the previous day, so date fields would default to yesterday.
 */
export function dateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Today in yyyy-MM-dd, for seeding date inputs.
 *
 * Call this from an effect, never during render: the server and client evaluate
 * new Date() at different moments, which is a hydration mismatch.
 */
export function todayInput(): string {
  return dateInput(new Date());
}

export function text(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/** Joins address lines, dropping blanks. */
export function addressLines(...parts: (string | null | undefined)[]): string[] {
  return parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
}

// ---------------------------------------------------------------------------------------
// Line calculation — mirrors StampOrders.Domain.Calculations.LineCalculator
// ---------------------------------------------------------------------------------------

/**
 * Two places, round half away from zero.
 *
 * The API's Money.RoundCents is banker's rounding (MidpointRounding.ToEven, matching VB6's
 * CLng); this differs only on an exact half-cent midpoint, which binary floating point can
 * rarely represent anyway. The API stays authoritative on save — this is preview and
 * document display only.
 */
export function roundCents(value: number): number {
  const scaled = value * 100;
  const rounded =
    scaled >= 0 ? Math.round(scaled + Number.EPSILON) : -Math.round(-scaled + Number.EPSILON);
  return rounded / 100;
}

export interface LineAmounts {
  gross: number;
  discount: number;
  net: number;
  gst: number;
  total: number;
}

/**
 * Transcribed from LineCalculator.Calculate, which was itself transcribed from
 * addLine.frm -> CalcValue. Rounding happens at the same points: discount before
 * subtraction, GST before addition.
 */
export function calculateLine(
  qtyValue: number,
  price: number,
  discountPct: number,
  gstRatePct: number,
  priceIncludesGst: boolean,
): LineAmounts {
  const gross = qtyValue * price;
  const discount = roundCents((gross * discountPct) / 100);

  let gst: number;
  let total: number;

  if (priceIncludesGst) {
    total = roundCents(gross - discount);
    const exGst = roundCents(total / (1 + gstRatePct / 100));
    gst = roundCents(total - exGst);
  } else {
    gst = roundCents(((gross - discount) * gstRatePct) / 100);
    total = roundCents(gross - discount + gst);
  }

  return { gross, discount, net: roundCents(total - gst), gst, total };
}

/**
 * The GST rate the legacy application read from its control record at startup
 * (Form1!GstRate). The API applies the stored rate on save; this is display only.
 */
export const DEFAULT_GST_RATE = 10;

// ---------------------------------------------------------------------------------------
// Document totalling — mirrors StampOrders.Domain.Calculations.OrderTotalCalculator
// ---------------------------------------------------------------------------------------

/**
 * A line reduced to what totalling needs.
 *
 * Invoice and archive lines carry Price, Qty, DiscPct and the GST amount that was worked
 * out at entry time, but no stored line total — ArchLine and InvLine have no such column,
 * so the document rebuilds it the way the server (OrderTotalCalculator / GetTotPrc) and the
 * legacy invoice print do. GST is summed as stored, never recalculated.
 */
export interface TotallableLine {
  qty?: number | null;
  price?: number | null;
  discPct?: number | null;
  gst?: number | null;
}

/** Net for one line: qty·price less the rounded discount. Not rounded — the caller rounds. */
export function lineNet(line: TotallableLine): number {
  const gross = (line.qty ?? 0) * (line.price ?? 0);
  const discount = roundCents((gross * (line.discPct ?? 0)) / 100);
  return gross - discount;
}

/**
 * Gross for one line: net plus the stored GST, rounded to cents.
 *
 * Mirrors the legacy per-line `TotPrc = Qty*Price - DiscAmt + Gst` in Calculations.bas
 * (GetTotPrc / GetTotPrcArch / CalcLineTot).
 */
export function lineTotal(line: TotallableLine): number {
  return roundCents(lineNet(line) + (line.gst ?? 0));
}

export interface DocumentTotals {
  net: number;
  gst: number;
  gross: number;
}

/**
 * Net/GST/gross for a whole document.
 *
 * Accumulates the raw per-line net and the stored per-line GST, then rounds — net, GST, and
 * their sum — exactly as StampOrders.Domain.Calculations.OrderTotalCalculator does. The
 * legacy GetTotPrcArch rounds only the final combined figure, so the two can differ by a
 * cent on a large multi-line invoice; this side follows the API, which is what posts to the
 * customer's ledger.
 */
export function documentTotals(lines: readonly TotallableLine[]): DocumentTotals {
  let net = 0;
  let gst = 0;

  for (const line of lines) {
    net += lineNet(line);
    gst += line.gst ?? 0;
  }

  net = roundCents(net);
  gst = roundCents(gst);

  return { net, gst, gross: roundCents(net + gst) };
}

// ---------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------

export const trackingStatusLabel: Record<string, string> = {
  Pending: "Pending",
  ReadyToEmail: "Ready to email",
  Complete: "Complete",
};

export const creditStatusLabel: Record<string, string> = {
  None: "No hold",
  ThirtyDays: "Hold at 30 days",
  SixtyDays: "Hold at 60 days",
  NinetyDays: "Hold at 90 days",
  Always: "Always on hold",
};

export const priceSourceLabel: Record<string, string> = {
  None: "No price found",
  CustomerSpecificRule: "Customer pricing rule",
  AllCustomersRule: "All-customers pricing rule",
  ProductPriceCode: "Product price code",
};

export const freightSuggestionLabel: Record<string, string> = {
  NoChange: "No change",
  ApplyFreight: "Freight should be applied",
  RemoveFreight: "Freight should be removed",
};
