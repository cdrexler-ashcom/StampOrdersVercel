"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreditCheckPanel } from "@/components/CreditCheckPanel";
import { CustomerPicker } from "@/components/CustomerPicker";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Notice,
  PageHeader,
} from "@/components/ui";
import { orders } from "@/lib/endpoints";
import { text, todayInput } from "@/lib/format";
import type { CreateOrderRequest, Customer } from "@/types/api";

/**
 * Order creation.
 *
 * The legacy flow put every header field on Form2 at once, whether or not it was needed
 * yet. This asks only for what the API's CreateOrderRequest accepts; everything else —
 * invoice address, price code, bin, freight, discount — is defaulted from the customer
 * by OrderService, exactly as the original form did on Add Order.
 */
export default function NewOrderPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderDate, setOrderDate] = useState("");
  const [runNo, setRunNo] = useState("");
  const [delCode, setDelCode] = useState("");
  const [email, setEmail] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [invoiceApplied, setInvoiceApplied] = useState("Open");
  const [overrideDelivery, setOverrideDelivery] = useState(false);
  const [delName, setDelName] = useState("");
  const [delAdr0, setDelAdr0] = useState("");
  const [delAdr1, setDelAdr1] = useState("");
  const [delAdr2, setDelAdr2] = useState("");
  const [delAdr3, setDelAdr3] = useState("");

  // Seeded on the client: the server and browser evaluate "today" at different moments,
  // and in different time zones, which React reports as a hydration mismatch.
  useEffect(() => {
    setOrderDate(todayInput());
  }, []);

  const pickCustomer = (next: Customer | null) => {
    setCustomer(next);
    // Seed the fields the customer record carries defaults for, so the operator can see
    // and adjust them before the order is created.
    setRunNo(next?.runNo?.trim() ?? "");
    setDelCode(next?.defDelCode?.trim() ?? "");
    setEmail(next?.accountsEmail?.trim() ?? "");
  };

  const mutation = useMutation({
    mutationFn: (body: CreateOrderRequest) => orders.create(body),
    onSuccess: (order) => router.push(`/orders/${order.orderId}`),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) return;

    mutation.mutate({
      custId: customer.uniqueId,
      orderDate: orderDate ? new Date(orderDate).toISOString() : null,
      runNo: runNo.trim() || null,
      delCode: delCode.trim() || null,
      email: email.trim() || null,
      isCredit,
      invoiceApplied: isCredit ? invoiceApplied.trim() || "Open" : null,
      delName: overrideDelivery ? delName.trim() || null : null,
      delAdr0: overrideDelivery ? delAdr0.trim() || null : null,
      delAdr1: overrideDelivery ? delAdr1.trim() || null : null,
      delAdr2: overrideDelivery ? delAdr2.trim() || null : null,
      delAdr3: overrideDelivery ? delAdr3.trim() || null : null,
    });
  };

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="New order"
        description="Choose a customer; the rest defaults from their account and can be adjusted after the order is created."
        actions={
          <>
            <Button type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={mutation.isPending}
              disabled={!customer}
            >
              Create order
            </Button>
          </>
        }
      />

      {mutation.isError && (
        <div className="mb-4">
          <Notice tone="red" title="Order was not created">
            {(mutation.error as Error).message}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-3">
              <Field label="Account" required>
                <CustomerPicker value={customer} onChange={pickCustomer} autoFocus />
              </Field>

              {customer && (
                <>
                  <CreditCheckPanel custId={customer.uniqueId} />

                  {customer.orderNote?.trim() && (
                    <Notice tone="amber" title="Order note on this account">
                      {customer.orderNote}
                    </Notice>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Order details" />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              <Field label="Order date">
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </Field>

              <Field
                label="Run number"
                hint="Two characters. Defaults from the customer."
              >
                <Input
                  value={runNo}
                  maxLength={2}
                  onChange={(e) => setRunNo(e.target.value)}
                />
              </Field>

              <Field label="Delivery code">
                <Input
                  value={delCode}
                  onChange={(e) => setDelCode(e.target.value)}
                />
              </Field>

              <Field label="Email" hint="Used for invoice delivery.">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Delivery address"
              description="Leave off to use the customer's delivery address."
              actions={
                <Checkbox
                  label="Override"
                  checked={overrideDelivery}
                  onChange={(e) => setOverrideDelivery(e.target.checked)}
                  className="text-xs"
                />
              }
            />

            {overrideDelivery ? (
              <CardBody className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" className="sm:col-span-2">
                  <Input value={delName} onChange={(e) => setDelName(e.target.value)} />
                </Field>
                <Field label="Address line 1">
                  <Input value={delAdr0} onChange={(e) => setDelAdr0(e.target.value)} />
                </Field>
                <Field label="Address line 2">
                  <Input value={delAdr1} onChange={(e) => setDelAdr1(e.target.value)} />
                </Field>
                <Field label="Suburb">
                  <Input value={delAdr2} onChange={(e) => setDelAdr2(e.target.value)} />
                </Field>
                <Field label="State">
                  <Input
                    value={delAdr3}
                    maxLength={3}
                    onChange={(e) => setDelAdr3(e.target.value)}
                  />
                </Field>
              </CardBody>
            ) : (
              <CardBody>
                {customer ? (
                  <div className="text-sm text-slate-600">
                    <p>{text(customer.delivery1)}</p>
                    <p>{text(customer.delivery2, "")}</p>
                    <p>
                      {[customer.delivery3, customer.delState, customer.delPostCode]
                        .map((part) => part?.trim())
                        .filter(Boolean)
                        .join("  ")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a customer to see their delivery address.
                  </p>
                )}
              </CardBody>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Type" />
            <CardBody className="space-y-3">
              <Checkbox
                label="This is a credit"
                checked={isCredit}
                onChange={(e) => setIsCredit(e.target.checked)}
              />

              {isCredit && (
                <Field
                  label="Invoice applied to"
                  hint='Use "Open" for a standalone credit.'
                >
                  <Input
                    value={invoiceApplied}
                    onChange={(e) => setInvoiceApplied(e.target.value)}
                  />
                </Field>
              )}
            </CardBody>
          </Card>

          {customer && (
            <Card>
              <CardHeader title="Defaults from this account" />
              <CardBody className="space-y-1 text-sm">
                <Detail label="Price code" value={customer.priceCode ?? "—"} />
                <Detail label="Discount" value={`${customer.discPct ?? 0}%`} />
                <Detail
                  label="Prices include GST"
                  value={customer.priceIncGst ? "Yes" : "No"}
                />
                <Detail label="GST exempt" value={customer.gstExempt ? "Yes" : "No"} />
                <Detail
                  label="Delivery docket"
                  value={customer.deliveryDocket ? "Yes" : "No"}
                />
                <Detail
                  label="Email invoices"
                  value={customer.emailInvoice ? "Yes" : "No"}
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
