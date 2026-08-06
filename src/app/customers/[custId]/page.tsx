"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CreditCheckPanel } from "@/components/CreditCheckPanel";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailRow,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { customers, invoices, orders, receipts } from "@/lib/endpoints";
import { addressLines, date, money, text } from "@/lib/format";

/**
 * Customer detail.
 *
 * Pulls together what the legacy application spread across CustEdit.frm, OpenItems.frm,
 * InvoiceHistory.frm and the customer filter on the order screen. Everything on this
 * page is read-only, matching what the API exposes.
 */
export default function CustomerDetailPage() {
  const params = useParams<{ custId: string }>();
  const custId = Number(params.custId);

  const customerQuery = useQuery({
    queryKey: ["customer", custId],
    queryFn: () => customers.get(custId),
    enabled: Number.isFinite(custId),
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", { custId }],
    queryFn: () => orders.list({ custId }),
    enabled: Number.isFinite(custId),
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices", "history", { custId }],
    queryFn: () => invoices.history({ custId }),
    enabled: Number.isFinite(custId),
  });

  const openItemsQuery = useQuery({
    queryKey: ["receipts", "outstanding", custId],
    queryFn: () => receipts.outstanding(custId),
    enabled: Number.isFinite(custId),
  });

  if (customerQuery.isLoading) return <Spinner label="Loading customer…" />;
  if (customerQuery.isError) return <ErrorState error={customerQuery.error} />;

  const customer = customerQuery.data;
  if (!customer) return <EmptyState title="Customer not found" />;

  return (
    <>
      <div className="no-print mb-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Customers
        </Link>
      </div>

      <PageHeader
        title={text(customer.title, "Customer")}
        description={`Account ${text(customer.accountNo)}`}
        actions={
          <Link href="/orders/new">
            <Button variant="primary">
              <Plus className="size-3.5" />
              New order
            </Button>
          </Link>
        }
      />

      {customer.orderNote?.trim() && (
        <div className="mb-4">
          <Notice tone="amber" title="Order note">
            {customer.orderNote}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <CreditCheckPanel custId={custId} />

          <Card>
            <CardHeader
              title="Outstanding items"
              description={`${openItemsQuery.data?.length ?? 0} item(s)`}
              actions={
                <Link href="/receipts">
                  <Button size="sm">Take a receipt</Button>
                </Link>
              }
            />

            {openItemsQuery.isLoading ? (
              <Spinner />
            ) : (openItemsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState title="Nothing outstanding" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th>Document</Th>
                    <Th align="right">Original</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Outstanding</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openItemsQuery.data?.map((item) => (
                    <tr key={item.id}>
                      <Td>{date(item.date)}</Td>
                      <Td>
                        <Badge tone={item.type === "Payment" ? "green" : "slate"}>
                          {text(item.type)}
                        </Badge>
                      </Td>
                      <Td>{text(item.docNo)}</Td>
                      <Td align="right">{money(item.originalAmount)}</Td>
                      <Td align="right">{money(item.paidAmount)}</Td>
                      <Td align="right" className="font-medium">
                        {money(item.outstanding)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Live orders" />

            {ordersQuery.isLoading ? (
              <Spinner />
            ) : (ordersQuery.data?.length ?? 0) === 0 ? (
              <EmptyState title="No live orders" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Date</Th>
                    <Th>Run</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersQuery.data?.map((order) => (
                    <tr key={order.orderId} className="hover:bg-slate-50">
                      <Td>{order.orderId}</Td>
                      <Td>{date(order.date)}</Td>
                      <Td>{text(order.runNo)}</Td>
                      <Td align="right">
                        <Link
                          href={`/orders/${order.orderId}`}
                          className="text-xs font-medium text-sky-700 hover:text-sky-900"
                        >
                          Open
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent invoices" />

            {invoicesQuery.isLoading ? (
              <Spinner />
            ) : (invoicesQuery.data?.length ?? 0) === 0 ? (
              <EmptyState title="No invoices" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th>Order</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesQuery.data?.slice(0, 15).map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <Td>
                        <span className="font-medium text-slate-900">
                          {text(invoice.invoiceNo)}
                        </span>
                        {invoice.credit && (
                          <Badge tone="violet" className="ml-2">
                            Credit
                          </Badge>
                        )}
                      </Td>
                      <Td>{date(invoice.invoiceDate)}</Td>
                      <Td>{invoice.orderId}</Td>
                      <Td align="right">
                        {invoice.invoiceNo && (
                          <Link
                            href={`/invoices/${encodeURIComponent(invoice.invoiceNo)}`}
                            className="text-xs font-medium text-sky-700 hover:text-sky-900"
                          >
                            Open
                          </Link>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Addresses" />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Invoice</p>
                {addressLines(
                  customer.address1,
                  customer.address2,
                  customer.address3,
                  customer.postCode,
                ).map((line, index) => (
                  <p key={index} className="text-slate-700">
                    {line}
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Delivery</p>
                {addressLines(
                  customer.delivery1,
                  customer.delivery2,
                  customer.delivery3,
                  customer.delState,
                  customer.delPostCode,
                ).map((line, index) => (
                  <p key={index} className="text-slate-700">
                    {line}
                  </p>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Trading terms" />
            <CardBody>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Price code">{customer.priceCode ?? "—"}</DetailRow>
                <DetailRow label="Discount">{`${customer.discPct ?? 0}%`}</DetailRow>
                <DetailRow label="Prices include GST">
                  {customer.priceIncGst ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="GST exempt">
                  {customer.gstExempt ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Run number">{text(customer.runNo)}</DetailRow>
                <DetailRow label="Delivery code">
                  {text(customer.defDelCode)}
                </DetailRow>
                <DetailRow label="Freight">
                  {customer.freight ? money(customer.freightAmt) : "None"}
                </DetailRow>
                <DetailRow label="Delivery threshold">
                  {money(customer.deliveryThreshold)}
                </DetailRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documents" />
            <CardBody>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Email invoices">
                  {customer.emailInvoice ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Accounts email">
                  {text(customer.accountsEmail)}
                </DetailRow>
                <DetailRow label="Delivery docket">
                  {customer.deliveryDocket ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Return address label">
                  {text(customer.invoiceComp)}
                </DetailRow>
                <DetailRow label="Dealer return address">
                  {customer.dealerReturnAddress ? "Yes" : "No"}
                </DetailRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Web order defaults" />
            <CardBody>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Email dealer">
                  {customer.webEmail ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Freight applies">
                  {customer.webFreightApplies ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Delivery docket">
                  {customer.webDeliveryDocket ? "Yes" : "No"}
                </DetailRow>
                <DetailRow label="Run number">{text(customer.webRunNo)}</DetailRow>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
