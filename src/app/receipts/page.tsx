"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { CreditCheckPanel } from "@/components/CreditCheckPanel";
import { CustomerPicker } from "@/components/CustomerPicker";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailRow,
  EmptyState,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { receipts } from "@/lib/endpoints";
import {
  PAYMENT_TYPES,
  capturesCardDetails,
  capturesChequeDetails,
} from "@/types/api";
import { date, money, roundCents, text, todayInput } from "@/lib/format";
import { useSortableTable } from "@/lib/useSortableTable";
import type { Customer, RecordReceiptRequest } from "@/types/api";

/**
 * Receipt entry and allocation.
 *
 * Replaces Receipt.frm and Payment.frm, and the four offset buttons Receipt.frm carried
 * (Automatic, Reverse, Fully, Part). Those were four ways of writing the same allocation
 * rows; here allocation is a single editable column with an auto-allocate action that
 * fills oldest-first, which is what Automatic Offset did.
 *
 * OpenItems.frm is folded in as the outstanding items table.
 */
export default function ReceiptsPage() {
  const queryClient = useQueryClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [transDate, setTransDate] = useState("");
  const [description, setDescription] = useState("");
  const [paymentType, setPaymentType] = useState<string>(PAYMENT_TYPES[0]);
  const [drawer, setDrawer] = useState("");
  const [bank, setBank] = useState("");
  const [branch, setBranch] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [allocations, setAllocations] = useState<Record<number, string>>({});

  // Seeded on the client: the server and browser evaluate "today" at different moments,
  // and in different time zones, which React reports as a hydration mismatch.
  useEffect(() => {
    setTransDate(todayInput());
  }, []);

  const outstanding = useQuery({
    queryKey: ["receipts", "outstanding", customer?.uniqueId],
    queryFn: () => receipts.outstanding(customer!.uniqueId),
    enabled: Boolean(customer),
  });

  const items = outstanding.data ?? [];

  // Sorted client-side: /api/receipts/outstanding/{custId} has no cap and is already
  // scoped to one customer's open items, so it's an inherently small, bounded set — no
  // full-dataset-vs-capped-page correctness issue to work around here.
  const { sorted, th } = useSortableTable(items, {
    date: (i) => (i.date ? new Date(i.date).getTime() : null),
    type: (i) => i.type,
    docNo: (i) => i.docNo,
    detail: (i) => i.detail,
    originalAmount: (i) => i.originalAmount,
    paidAmount: (i) => i.paidAmount,
    outstanding: (i) => i.outstanding,
  });

  const pickCustomer = (next: Customer | null) => {
    setCustomer(next);
    setAllocations({});
    // The customer record remembers payment details; the legacy receipt screen wrote
    // them back on save and read them on load.
    setDrawer(next?.drawerName?.trim() ?? "");
    setBank(next?.bankName?.trim() ?? "");
    setBranch(next?.bankBranch?.trim() ?? "");
    setCardNo(next?.cardNumber?.trim() ?? "");
    setExpiryDate(next?.expiryDate?.trim() ?? "");
  };

  const allocatedTotal = useMemo(
    () =>
      roundCents(
        Object.values(allocations).reduce(
          (sum, value) => sum + (Number(value) || 0),
          0,
        ),
      ),
    [allocations],
  );

  const receiptAmount = Number(amount) || 0;
  const discountAmount = Number(discount) || 0;
  const available = roundCents(receiptAmount + discountAmount);
  const unallocated = roundCents(available - allocatedTotal);

  /** Fills allocations oldest-first, as Automatic Offset did. */
  const autoAllocate = () => {
    let remaining = available;
    const next: Record<number, string> = {};

    const oldestFirst = [...items].sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return aDate - bDate;
    });

    for (const item of oldestFirst) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, item.outstanding);
      if (applied <= 0) continue;
      next[item.id] = roundCents(applied).toFixed(2);
      remaining = roundCents(remaining - applied);
    }

    setAllocations(next);
  };

  const recordMutation = useMutation({
    mutationFn: (body: RecordReceiptRequest) => receipts.record(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["credit-check"] });
      setAmount("");
      setDiscount("");
      setReceiptNo("");
      setDescription("");
      setAllocations({});
    },
  });

  const processMutation = useMutation({
    mutationFn: () => receipts.process(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
  });

  const problems: string[] = [];
  if (!customer) problems.push("Select a customer.");
  if (!customer?.accountNo?.trim())
    problems.push("The selected customer has no account number.");
  if (receiptAmount <= 0) problems.push("Enter a receipt amount.");
  if (allocatedTotal > available)
    problems.push("Allocations exceed the receipt amount plus discount.");

  const submit = () => {
    if (problems.length > 0 || !customer?.accountNo) return;

    const allocationRows = Object.entries(allocations)
      .map(([openItemId, value]) => ({
        openItemId: Number(openItemId),
        appliedAmount: Number(value) || 0,
      }))
      .filter((row) => row.appliedAmount !== 0);

    recordMutation.mutate({
      customerAccountNo: customer.accountNo.trim(),
      amount: receiptAmount,
      discount: discountAmount,
      receiptNo: receiptNo.trim() ? Number(receiptNo) : null,
      transDate: transDate ? new Date(transDate).toISOString() : null,
      description: description.trim() || null,
      paymentType,
      drawer: capturesChequeDetails(paymentType) ? drawer.trim() || null : null,
      bank: capturesChequeDetails(paymentType) ? bank.trim() || null : null,
      branch: capturesChequeDetails(paymentType) ? branch.trim() || null : null,
      cardNo: capturesCardDetails(paymentType) ? cardNo.trim() || null : null,
      expiryDate: capturesCardDetails(paymentType) ? expiryDate.trim() || null : null,
      allocations: allocationRows,
    });
  };

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Record a payment and allocate it against outstanding items."
        actions={
          <Button
            loading={processMutation.isPending}
            onClick={() => processMutation.mutate()}
          >
            Process unprocessed receipts
          </Button>
        }
      />

      {processMutation.isSuccess && processMutation.data && (
        <div className="mb-4">
          <Notice tone="green" title="Receipts processed">
            {processMutation.data.receiptsProcessed} receipt(s) applied, total{" "}
            {money(processMutation.data.totalApplied)}. They are now available to bank.
          </Notice>
        </div>
      )}

      {recordMutation.isSuccess && (
        <div className="mb-4">
          <Notice tone="green" title="Receipt recorded">
            Run Process to apply it to the ledger and make it bankable.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-3">
              <Field label="Account" required>
                <CustomerPicker value={customer} onChange={pickCustomer} autoFocus />
              </Field>

              {customer && <CreditCheckPanel custId={customer.uniqueId} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Outstanding items"
              description="Enter an amount against each item, or allocate automatically."
              actions={
                items.length > 0 ? (
                  <>
                    <Button size="sm" onClick={autoAllocate} disabled={available <= 0}>
                      Auto allocate
                    </Button>
                    <Button size="sm" onClick={() => setAllocations({})}>
                      Clear
                    </Button>
                  </>
                ) : undefined
              }
            />

            {!customer ? (
              <EmptyState
                title="Select a customer"
                description="Their outstanding invoices and credits appear here."
              />
            ) : outstanding.isLoading ? (
              <Spinner />
            ) : items.length === 0 ? (
              <EmptyState title="Nothing outstanding on this account" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th {...th("date")}>Date</Th>
                    <Th {...th("type")}>Type</Th>
                    <Th {...th("docNo")}>Document</Th>
                    <Th {...th("detail")}>Detail</Th>
                    <Th align="right" {...th("originalAmount")}>
                      Original
                    </Th>
                    <Th align="right" {...th("paidAmount")}>
                      Paid
                    </Th>
                    <Th align="right" {...th("outstanding")}>
                      Outstanding
                    </Th>
                    <Th align="right">Allocate</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <Td>{date(item.date)}</Td>
                      <Td>
                        <Badge tone={item.type === "Payment" ? "green" : "slate"}>
                          {text(item.type)}
                        </Badge>
                      </Td>
                      <Td>{text(item.docNo)}</Td>
                      <Td>
                        <span className="block max-w-40 truncate">
                          {text(item.detail)}
                        </span>
                      </Td>
                      <Td align="right">{money(item.originalAmount)}</Td>
                      <Td align="right">{money(item.paidAmount)}</Td>
                      <Td align="right" className="font-medium">
                        {money(item.outstanding)}
                      </Td>
                      <Td align="right">
                        <Input
                          type="number"
                          step="0.01"
                          value={allocations[item.id] ?? ""}
                          placeholder="0.00"
                          onChange={(event) =>
                            setAllocations((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="w-24 text-right"
                        />
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
            <CardHeader title="Payment" />
            <CardBody className="space-y-3">
              <Field label="Amount" required>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>

              <Field
                label="Settlement discount"
                hint="Counts toward debt reduction alongside the amount."
              >
                <Input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>

              <Field label="Payment type">
                <Select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  {PAYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Receipt number">
                  <Input
                    type="number"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                  />
                </Field>
                <Field label="Date">
                  <Input
                    type="date"
                    value={transDate}
                    onChange={(e) => setTransDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Description">
                <Input
                  value={description}
                  maxLength={30}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              {capturesChequeDetails(paymentType) && (
                <>
                  <Field label="Drawer">
                    <Input value={drawer} onChange={(e) => setDrawer(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bank">
                      <Input value={bank} onChange={(e) => setBank(e.target.value)} />
                    </Field>
                    <Field label="Branch">
                      <Input
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}

              {capturesCardDetails(paymentType) && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Card number">
                    <Input value={cardNo} onChange={(e) => setCardNo(e.target.value)} />
                  </Field>
                  <Field label="Expiry">
                    <Input
                      value={expiryDate}
                      placeholder="MM/YY"
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Allocation" />
            <CardBody className="space-y-3">
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Amount + discount">{money(available)}</DetailRow>
                <DetailRow label="Allocated">{money(allocatedTotal)}</DetailRow>
                <DetailRow label="Unallocated">
                  <span
                    className={
                      unallocated < 0
                        ? "text-red-700"
                        : unallocated > 0
                          ? "text-amber-700"
                          : "text-green-700"
                    }
                  >
                    {money(unallocated)}
                  </span>
                </DetailRow>
              </dl>

              {recordMutation.isError && (
                <Notice tone="red" title="Receipt was not recorded">
                  {(recordMutation.error as Error).message}
                </Notice>
              )}

              {problems.length > 0 && (
                <ul className="space-y-0.5 text-xs text-slate-500">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              )}

              <Button
                variant="primary"
                className="w-full"
                loading={recordMutation.isPending}
                disabled={problems.length > 0}
                onClick={submit}
              >
                Record receipt
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
