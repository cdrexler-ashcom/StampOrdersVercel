/**
 * TypeScript mirrors of the StampOrders API contracts.
 *
 * Source of truth:
 *   StampOrders.Domain/Entities/*
 *   StampOrders.Domain/Enums/*
 *   StampOrders.Application/Contracts/Requests.cs
 *
 * The API serialises enums as names (JsonStringEnumConverter in Program.cs), so the union
 * types below use the C# member names verbatim.
 */

// ---------------------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------------------

export type TrackingStatus = "Pending" | "ReadyToEmail" | "Complete";

export type CreditStatus =
  | "None"
  | "ThirtyDays"
  | "SixtyDays"
  | "NinetyDays"
  | "Always";

export type FreightSuggestion = "NoChange" | "ApplyFreight" | "RemoveFreight";

export type PriceSource =
  | "None"
  | "CustomerSpecificRule"
  | "AllCustomersRule"
  | "ProductPriceCode";

/** PaymentType is a static class of const strings, not an enum. */
export const PAYMENT_TYPES = [
  "Cheque",
  "Credit Card",
  "Cash",
  "Direct Deposit",
  "Maz Cheque",
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Mirrors PaymentType.CapturesChequeDetails. */
export const capturesChequeDetails = (type?: string | null): boolean =>
  type === "Cheque" || type === "Maz Cheque";

/** Mirrors PaymentType.CapturesCardDetails. */
export const capturesCardDetails = (type?: string | null): boolean =>
  type === "Credit Card";

// ---------------------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------------------

export interface OrderLine {
  orderId: number;
  jobNo: string;
  custOrderNo: string | null;
  product: string;
  details: string | null;
  colour: string | null;
  colourDesc: string | null;
  wildSearch: string | null;
  qty: number | null;
  price: number | null;
  discPct: number | null;
  gst: number | null;
  priceIncGst: boolean;
  stampLabel: boolean;
  stampLabelCode: string | null;
  totalPrice: number | null;
}

export interface OrderHeader {
  orderId: number;
  custId: number | null;
  custTitle: string | null;
  date: string | null;
  binNo: number | null;
  runNo: string | null;
  priceCode: number | null;
  invAdr1: string | null;
  invAdr2: string | null;
  invAdr3: string | null;
  invPostCode: string | null;
  delName: string | null;
  delAdr0: string | null;
  delAdr1: string | null;
  delAdr2: string | null;
  delAdr3: string | null;
  delCode: string | null;
  direct: boolean;
  freight: number | null;
  freightApplies: boolean;
  credit: boolean;
  invoiceApplied: string | null;
  invoiceComp: string | null;
  email: string | null;
  phoneNo: string | null;
  note: string | null;
  /**
   * Populated by GET /api/orders/{orderId}, which Includes them.
   * GET /api/orders does not, so treat this as absent in list responses.
   */
  lines?: OrderLine[];
}

export interface Customer {
  uniqueId: number;
  accountNo: string | null;
  title: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  postCode: string | null;
  delivery1: string | null;
  delivery2: string | null;
  delivery3: string | null;
  delPostCode: string | null;
  delState: string | null;
  phoneNo: string | null;
  priceCode: number | null;
  discPct: number | null;
  gstExempt: boolean;
  priceIncGst: boolean;
  freight: boolean;
  freightAmt: number | null;
  deliveryThreshold: number | null;
  defDelCode: string | null;
  runNo: string | null;
  creditStatus: string | null;
  creditMsg: string | null;
  emailInvoice: boolean;
  accountsEmail: string | null;
  deliveryDocket: boolean;
  invoiceComp: string | null;
  orderNote: string | null;
  dealerReturnAddress: boolean;
  webEmail: boolean;
  webFreightApplies: boolean;
  webDeliveryDocket: boolean;
  webRunNo: string | null;
  drawerName: string | null;
  bankName: string | null;
  bankBranch: string | null;
  cardNumber: string | null;
  expiryDate: string | null;
  paidDefault: boolean;
}

export interface ArchiveHeader {
  id: number;
  orderId: number;
  custId: number | null;
  custTitle: string | null;
  date: string | null;
  invoiceDate: string | null;
  invoiceNo: string | null;
  binNo: number | null;
  runNo: string | null;
  priceCode: number | null;
  invAdr1: string | null;
  invAdr2: string | null;
  invAdr3: string | null;
  invPostCode: string | null;
  delName: string | null;
  delAdr0: string | null;
  delAdr1: string | null;
  delAdr2: string | null;
  delAdr3: string | null;
  delCode: string | null;
  directDel: boolean | null;
  directDelivery: boolean;
  freight: number | null;
  freightApplies: boolean;
  credit: boolean;
  invoiceApplied: string | null;
  invoiceComp: string | null;
  email: string | null;
  phoneNo: string | null;
  note: string | null;
  paid: boolean;
  trackingNo: string | null;
  trackingStatus: TrackingStatus;
  trackingRequired: boolean;
  emailSent: string | null;
}

export interface ArchiveLine {
  orderId: number;
  jobNo: string;
  custOrderNo: string | null;
  product: string;
  details: string | null;
  colour: string | null;
  colourDesc: string | null;
  qty: number | null;
  price: number | null;
  discPct: number | null;
  gst: number | null;
  priceIncGst: boolean;
  totalPrice: number | null;
}

export interface InvoiceHeader {
  id: number;
  orderId: number;
  invoiceNo: string | null;
  custId: number | null;
  custTitle: string | null;
  invoiceDate: string | null;
  credit: boolean;
  lines: InvoiceLine[];
}

export interface InvoiceLine {
  orderId: number;
  jobNo: string;
  product: string;
  details: string | null;
  qty: number | null;
  price: number | null;
  totalPrice: number | null;
}

export interface OpenItem {
  id: number;
  custId: number | null;
  date: string | null;
  type: string | null;
  docNo: string | null;
  detail: string | null;
  originalAmount: number | null;
  paidAmount: number | null;
  outstanding: number;
}

export interface SosetProduct {
  prodId: string;
  prodName: string | null;
  prodShape: string | null;
  prodWeight: number | null;
  unitPrice1: number | null;
  unitPrice2: number | null;
  unitPrice3: number | null;
  unitPrice4: number | null;
  unitPrice5: number | null;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
  cat4: string | null;
  cutWidth: number | null;
  cutHeight: number | null;
  printSetId: string | null;
  typeset: string | null;
  screenInfo: string | null;
  suppressesStampJob: boolean;
}

export interface SosetColour {
  colourId: string;
  name: string | null;
}

export interface SosetStamp {
  orderNo: string | null;
  searchKey1: string | null;
  searchKey2: string | null;
  prodId: string | null;
  colourId: string | null;
  quantity: number | null;
  statusId: string | null;
  date: string | null;
  custInfo: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------

export interface AgingBuckets {
  current: number;
  month2: number;
  month3: number;
  prior: number;
  total: number;
}

export interface OrderTotalsResult {
  netAmount: number;
  gstAmount: number;
  grossAmount: number;
  deliveryThreshold: number;
  freightSuggestion: FreightSuggestion;
}

export interface CreditCheckResult {
  custId: number;
  customerTitle: string | null;
  status: CreditStatus;
  onHold: boolean;
  message: string | null;
  aging: AgingBuckets;
}

export interface PostedInvoice {
  orderId: number;
  invoiceNo: string | null;
  custId: number | null;
  customerTitle: string | null;
  isCredit: boolean;
  netAmount: number;
  gstAmount: number;
  grossAmount: number;
  archiveId: number;
}

export interface InvoiceRunResult {
  invoiceCount: number;
  totalNet: number;
  totalGst: number;
  invoices: PostedInvoice[];
}

export interface ProcessReceiptsResult {
  receiptsProcessed: number;
  totalApplied: number;
}

export interface DepositResult {
  depositNo: number;
  depositDate: string;
  receiptCount: number;
  totalAmount: number;
}

export interface DepositSummary {
  depositNo: number;
  depositDate: string | null;
  receiptCount: number;
  totalAmount: number;
}

export interface PriceResult {
  price: number;
  source: PriceSource;
}

export interface Receipt {
  id: number;
  custId: number | null;
  receiptNo: number | null;
  transDate: string | null;
  amount: number | null;
  discount: number | null;
  description: string | null;
  paymentType: string | null;
  drawer: string | null;
  bank: string | null;
  branch: string | null;
  processed?: boolean;
}

export interface BankableReceipt {
  id: number;
  custId: number | null;
  customerTitle?: string | null;
  receiptNo: number | null;
  transDate: string | null;
  amount: number | null;
  paymentType: string | null;
  description: string | null;
}

export interface SosetStatus {
  dataPath: string;
  writeMode: string;
  referenceCacheMinutes: number;
  dataPathExists: boolean;
  note: string;
}

export interface SosetTableInfo {
  table: string;
  found: boolean;
  file?: string;
  version?: string;
  records?: number;
  columns?: number;
  recordLength?: number;
  encoding?: string;
  hasMemo?: boolean;
}

// ---------------------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------------------

export interface CreateOrderRequest {
  custId: number;
  orderDate?: string | null;
  runNo?: string | null;
  delCode?: string | null;
  email?: string | null;
  delName?: string | null;
  delAdr0?: string | null;
  delAdr1?: string | null;
  delAdr2?: string | null;
  delAdr3?: string | null;
  isCredit?: boolean;
  invoiceApplied?: string | null;
}

export interface AddOrderLineRequest {
  jobNo: string;
  product: string;
  qty: number;
  price?: number | null;
  discPct?: number | null;
  priceIncGst?: boolean | null;
  custOrderNo?: string | null;
  details?: string | null;
  colour?: string | null;
  colourDesc?: string | null;
  wildSearch?: string | null;
  stampLabel?: boolean;
  stampLabelCode?: string | null;
}

export interface InvoiceRunRequest {
  orderIds?: number[] | null;
  startRun?: number | null;
  endRun?: number | null;
  invoiceDate?: string | null;
}

export interface ReceiptAllocationRequest {
  openItemId: number;
  appliedAmount: number;
}

export interface RecordReceiptRequest {
  customerAccountNo: string;
  amount: number;
  discount?: number;
  receiptNo?: number | null;
  transDate?: string | null;
  description?: string | null;
  paymentType?: string | null;
  drawer?: string | null;
  bank?: string | null;
  branch?: string | null;
  cardNo?: string | null;
  expiryDate?: string | null;
  allocations?: ReceiptAllocationRequest[];
}

export interface PostDepositRequest {
  receiptHistoryIds: number[];
  depositDate?: string | null;
}

export interface AddTrackingRequest {
  invoiceNo: string;
  trackingNo: string;
}

/** RFC 7807, as produced by the API's exception handler and Results.Problem. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}
