import { api } from "./api";
import type {
  AddOrderLineRequest,
  AddTrackingRequest,
  ArchiveHeader,
  ArchiveLine,
  BankableReceipt,
  CreateOrderRequest,
  CreditCheckResult,
  Customer,
  DepositResult,
  DepositSummary,
  InvoiceHeader,
  InvoiceRunRequest,
  InvoiceRunResult,
  OpenItem,
  OrderHeader,
  OrderLine,
  OrderListItem,
  OrderTotalsResult,
  PostDepositRequest,
  UpdateOrderLineRequest,
  UpdateOrderRequest,
  PriceResult,
  ProcessReceiptsResult,
  Receipt,
  RecordReceiptRequest,
  SosetColour,
  SosetProduct,
  SosetStamp,
  SosetStatus,
  SosetTableInfo,
  BinStatus,
  Bin,
  CreateBinRequest,
  UpdateBinRequest,
} from "@/types/api";

/**
 * One function per API endpoint, named after the route it calls.
 *
 * Nothing here invents behaviour. Where the UI needs something the API does not expose,
 * that gap is recorded in DESIGN-NOTES.md rather than faked at this layer.
 */

// --- Orders -----------------------------------------------------------------------------

export const orders = {
  /** GET /api/orders */
  list: (
    params: {
      custId?: number;
      runNo?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
    } = {},
  ) => api.get<OrderListItem[]>("/api/orders", params),

  /** GET /api/orders/{orderId} */
  get: (orderId: number) => api.get<OrderHeader>(`/api/orders/${orderId}`),

  /** POST /api/orders */
  create: (body: CreateOrderRequest) => api.post<OrderHeader>("/api/orders", body),

  /** PUT /api/orders/{orderId} */
  update: (orderId: number, body: UpdateOrderRequest) =>
    api.put<OrderHeader>(`/api/orders/${orderId}`, body),

  /** POST /api/orders/{orderId}/lines */
  addLine: (orderId: number, body: AddOrderLineRequest) =>
    api.post<OrderLine>(`/api/orders/${orderId}/lines`, body),

  /** PUT /api/orders/{orderId}/lines/{jobNo} */
  updateLine: (orderId: number, jobNo: string, body: UpdateOrderLineRequest) =>
    api.put<OrderLine>(
      `/api/orders/${orderId}/lines/${encodeURIComponent(jobNo)}`,
      body,
    ),

  /** DELETE /api/orders/{orderId}/lines/{jobNo} */
  removeLine: (orderId: number, jobNo: string) =>
    api.delete<void>(`/api/orders/${orderId}/lines/${encodeURIComponent(jobNo)}`),

  /** GET /api/orders/{orderId}/totals */
  totals: (orderId: number) =>
    api.get<OrderTotalsResult>(`/api/orders/${orderId}/totals`),

  /** DELETE /api/orders/{orderId} */
  remove: (orderId: number) => api.delete<void>(`/api/orders/${orderId}`),

  /** GET /api/orders/credit-check/{custId} */
  creditCheck: (custId: number) =>
    api.get<CreditCheckResult>(`/api/orders/credit-check/${custId}`),
};

// --- Invoicing --------------------------------------------------------------------------

export const invoices = {
  /** POST /api/invoices/runs/stage */
  stageRun: (body: InvoiceRunRequest) =>
    api.post<InvoiceRunResult>("/api/invoices/runs/stage", body),

  /** POST /api/invoices/runs/post */
  postStaged: () => api.post<InvoiceRunResult>("/api/invoices/runs/post"),

  /** GET /api/invoices/staged */
  staged: () => api.get<InvoiceHeader[]>("/api/invoices/staged"),

  /** GET /api/invoices/history */
  history: (
    params: {
      custId?: number;
      invoiceNo?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      custTitle?: string[];
      runNo?: string[];
      invoiceNos?: string[];
      orderId?: string[];
    } = {},
  ) => api.get<ArchiveHeader[]>("/api/invoices/history", params),

  /** GET /api/invoices/history/{invoiceNo} */
  historyDetail: (invoiceNo: string) =>
    api.get<{ invoice: ArchiveHeader; lines: ArchiveLine[] }>(
      `/api/invoices/history/${encodeURIComponent(invoiceNo)}`,
    ),
};

// --- Receipts ---------------------------------------------------------------------------

export const receipts = {
  /** POST /api/receipts */
  record: (body: RecordReceiptRequest) => api.post<Receipt>("/api/receipts", body),

  /** POST /api/receipts/process */
  process: () => api.post<ProcessReceiptsResult>("/api/receipts/process"),

  /** GET /api/receipts/outstanding/{custId} */
  outstanding: (custId: number) =>
    api.get<OpenItem[]>(`/api/receipts/outstanding/${custId}`),
};

// --- Deposits ---------------------------------------------------------------------------

export const deposits = {
  /** GET /api/deposits/bankable */
  bankable: () => api.get<BankableReceipt[]>("/api/deposits/bankable"),

  /** POST /api/deposits */
  post: (body: PostDepositRequest) => api.post<DepositResult>("/api/deposits/", body),

  /** GET /api/deposits */
  list: () => api.get<DepositSummary[]>("/api/deposits/"),
};

// --- Tracking ---------------------------------------------------------------------------

export const tracking = {
  /** GET /api/tracking/pending */
  pending: () => api.get<ArchiveHeader[]>("/api/tracking/pending"),

  /** POST /api/tracking */
  add: (body: AddTrackingRequest) => api.post<void>("/api/tracking/", body),

  /** POST /api/tracking/advance */
  advance: () => api.post<{ updated: number }>("/api/tracking/advance"),

  /** GET /api/tracking/awaiting-notification */
  awaitingNotification: () =>
    api.get<ArchiveHeader[]>("/api/tracking/awaiting-notification"),

  /** POST /api/tracking/{archiveId}/notified */
  markNotified: (archiveId: number) =>
    api.post<void>(`/api/tracking/${archiveId}/notified`),
};

// --- Reference --------------------------------------------------------------------------

export const customers = {
  /** GET /api/customers */
  search: (
    params: {
      search?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      title?: string[];
      address3?: string[];
      priceCode?: string[];
      discPct?: string[];
    } = {},
  ) => api.get<Customer[]>("/api/customers", params),

  /** GET /api/customers/{custId} */
  get: (custId: number) => api.get<Customer>(`/api/customers/${custId}`),
};

export const bins = {
  /** GET /api/bins */
  list: (params: { status?: BinStatus } = {}) => api.get<Bin[]>("/api/bins", params),

  /** GET /api/bins/{binNo} */
  get: (binNo: number) => api.get<Bin>(`/api/bins/${binNo}`),

  /** POST /api/bins */
  create: (body: CreateBinRequest) => api.post<Bin>("/api/bins", body),

  /** PUT /api/bins/{binNo} */
  update: (binNo: number, body: UpdateBinRequest) =>
    api.put<Bin>(`/api/bins/${binNo}`, body),

  /** DELETE /api/bins/{binNo} */
  remove: (binNo: number) => api.delete<void>(`/api/bins/${binNo}`),
};

export const reference = {
  /** GET /api/reference/products */
    products: (
    params: {
      search?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      prodName?: string[];
      cut?: string[];
    } = {},
  ) => api.get<SosetProduct[]>("/api/reference/products", params),

  /** GET /api/reference/products/{prodId} */
  product: (prodId: string) =>
    api.get<SosetProduct>(`/api/reference/products/${encodeURIComponent(prodId)}`),

  /** GET /api/reference/colours */
  colours: () => api.get<SosetColour[]>("/api/reference/colours"),

  /** GET /api/reference/price */
  price: (prodId: string, custId: number) =>
    api.get<PriceResult>("/api/reference/price", { prodId, custId }),
};

// --- Soset diagnostics ------------------------------------------------------------------

export const soset = {
  /** GET /api/soset/status */
  status: () => api.get<SosetStatus>("/api/soset/status"),

  /** GET /api/soset/tables */
  tables: () => api.get<SosetTableInfo[]>("/api/soset/tables"),

  /** GET /api/soset/stamps/{jobNo} */
  stamp: (jobNo: string) =>
    api.get<SosetStamp>(`/api/soset/stamps/${encodeURIComponent(jobNo)}`),

  /** GET /api/soset/next-order-number */
  nextOrderNumber: () =>
    api.get<{ parameter: string; value: string }>("/api/soset/next-order-number"),
};

// --- Health -----------------------------------------------------------------------------

export const health = {
  /** GET /health/ready */
  ready: async (): Promise<boolean> => {
    try {
      const response = await fetch("/health/ready", { cache: "no-store" });
      return response.ok;
    } catch {
      return false;
    }
  },
};
