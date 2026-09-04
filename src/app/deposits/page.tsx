"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DetailRow,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { deposits } from "@/lib/endpoints";
import { date, money, text, todayInput } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useSortableTable } from "@/lib/useSortableTable";
import { PAYMENT_TYPES } from "@/types/api";
import type { BankableReceipt, PostDepositRequest } from "@/types/api";

/**
 * Bank deposits.
 *
 * Replaces Deposit.frm and ReprintDeposit.frm. The five payment-type checkboxes from the
 * original are kept, because they are how the counter separates a cash banking from a
 * cheque banking, but they filter the list rather than reloading it.
 *
 * Select All / Clear All are carried across as-is.
 */
export default function DepositsPage() {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [depositDate, setDepositDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(
    () => new Set(PAYMENT_TYPES),
  );

  // Seeded on the client: the server and browser evaluate "today" at different moments,
  // and in different time zones, which React reports as a hydration mismatch.
  useEffect(() => {
    setDepositDate(todayInput());
  }, []);

  const bankable = useQuery({
    queryKey: ["deposits", "bankable"],
    queryFn: () => deposits.bankable(),
  });

  const history = useQuery({
    queryKey: ["deposits", "list"],
    queryFn: () => deposits.list(),
  });

  const visible = useMemo(
    () =>
      (bankable.data ?? []).filter((receipt) =>
        typeFilter.has(receipt.paymentType?.trim() ?? ""),
      ),
    [bankable.data, typeFilter],
  );

  // Sorted client-side: /api/deposits/bankable has no cap, it always returns every
  // unbanked receipt, so there's no full-dataset-vs-capped-page correctness issue to work
  // around by pushing sorting to the server (unlike customers/products/orders/invoices).
  const { sorted, th } = useSortableTable(visible, {
    receiptNo: (r) => r.receiptNo ?? r.id,
    transDate: (r) => (r.transDate ? new Date(r.transDate).getTime() : null),
    customer: (r) => r.customerTitle ?? String(r.custId ?? ""),
    paymentType: (r) => r.paymentType,
    description: (r) => r.description,
    amount: (r) => r.amount,
  });

  // Only Customer gets a column filter here — Type already has its own dedicated
  // checkbox row above the table (carried over from the legacy screen's five payment-type
  // checkboxes), so a second, overlapping funnel filter on the same column would be
  // redundant. Description is free text per receipt, so a value list wouldn't narrow much.
  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(sorted, {
    receiptNo: (r: BankableReceipt) => String(r.receiptNo ?? r.id),
    transDate: (r: BankableReceipt) => r.transDate ? date(r.transDate) : "",
    customer: (r: BankableReceipt) => r.customerTitle?.trim() ?? String(r.custId ?? ""),
    paymentType: (r: BankableReceipt) => r.paymentType?.trim() ?? "",
    description: (r: BankableReceipt) => r.description?.trim() ?? "",
  });

  const selectedReceipts = visible.filter((receipt) => selected.has(receipt.id));
  const selectedTotal = selectedReceipts.reduce(
    (sum, receipt) => sum + (receipt.amount ?? 0),
    0,
  );

  const postMutation = useMutation({
    mutationFn: (body: PostDepositRequest) => deposits.post(body),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
  });

  const toggleType = (type: string) => {
    setTypeFilter((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Bank deposits"
        description="Processed receipts that have not yet been banked."
      />

      {postMutation.isSuccess && postMutation.data && (
        <div className="mb-4">
          <Notice
            tone="green"
            title={`Deposit ${postMutation.data.depositNo} posted`}
          >
            {postMutation.data.receiptCount} receipt(s), total{" "}
            {money(postMutation.data.totalAmount)} on{" "}
            {date(postMutation.data.depositDate)}.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Receipts to bank"
              description={`${filtered?.length ?? 0} of ${bankable.data?.length ?? 0} shown`}
              actions={
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      setSelected(new Set((filtered ?? []).map((receipt) => receipt.id)))
                    }
                  >
                    Select all
                  </Button>
                  <Button size="sm" onClick={() => setSelected(new Set())}>
                    Clear all
                  </Button>
                  {isFiltered && (
                    <Button size="sm" variant="ghost" onClick={clearAll}>
                      Clear column filters
                    </Button>
                  )}
                </>
              }
            />

            <CardBody className="border-b border-slate-200 py-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {PAYMENT_TYPES.map((type) => (
                  <Checkbox
                    key={type}
                    label={type}
                    checked={typeFilter.has(type)}
                    onChange={() => toggleType(type)}
                    className="text-xs"
                  />
                ))}
              </div>
            </CardBody>

            {bankable.isLoading ? (
              <Spinner />
            ) : bankable.isError ? (
              <ErrorState error={bankable.error} />
            ) : visible.length === 0 ? (
              <EmptyState
                title="Nothing to bank"
                description="Receipts appear here once they have been processed."
              />
            ) : (
              // Capped height so a long list scrolls within its own pane instead of
              // pushing the Deposit history card far down the page. Header stays pinned.
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <thead className="sticky top-0 z-10 [&_th]:bg-white">
                    <tr>
                      <Th />
                      <Th {...th("receiptNo")} filter={colFilter("receiptNo")}>
                        Receipt
                      </Th>
                      <Th {...th("transDate")} filter={colFilter("transDate")}>
                        Date
                      </Th>
                      <Th {...th("customer")} filter={colFilter("customer")}>
                        Customer
                      </Th>
                      <Th {...th("paymentType")} filter={colFilter("paymentType")}>
                        Type
                      </Th>
                      <Th {...th("description")} filter={colFilter("description")}>
                        Description
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(filtered?.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8">
                          <EmptyState
                            title="No receipts match the selected filters"
                            action={
                              <Button size="sm" variant="secondary" onClick={clearAll}>
                                Clear column filters
                              </Button>
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      filtered?.map((receipt) => (
                        <tr
                          key={receipt.id}
                          className={selected.has(receipt.id) ? "bg-sky-50" : "hover:bg-slate-50"}
                        >
                          <Td>
                            <input
                              type="checkbox"
                              checked={selected.has(receipt.id)}
                              onChange={() => toggle(receipt.id)}
                              className="size-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                            />
                          </Td>
                          <Td>{receipt.receiptNo ?? receipt.id}</Td>
                          <Td>{date(receipt.transDate)}</Td>
                          <Td>{text(receipt.customerTitle ?? String(receipt.custId ?? ""))}</Td>
                          <Td>
                            <Badge tone="slate">{text(receipt.paymentType)}</Badge>
                          </Td>
                          <Td>
                            <span className="block max-w-48 truncate">
                              {text(receipt.description)}
                            </span>
                          </Td>
                          <Td align="right" className="font-medium">
                            {money(receipt.amount)}
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Deposit history" />

            {history.isLoading ? (
              <Spinner />
            ) : (history.data?.length ?? 0) === 0 ? (
              <EmptyState title="No deposits recorded yet" />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <thead className="sticky top-0 z-10 [&_th]:bg-white">
                    <tr>
                      <Th>Deposit</Th>
                      <Th>Date</Th>
                      <Th align="right">Receipts</Th>
                      <Th align="right">Total</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.data?.map((deposit) => (
                      <tr key={deposit.depositNo} className="hover:bg-slate-50">
                        <Td>
                          <span className="font-medium text-slate-900">
                            {deposit.depositNo}
                          </span>
                        </Td>
                        <Td>{date(deposit.depositDate)}</Td>
                        <Td align="right">{deposit.receiptCount}</Td>
                        <Td align="right">{money(deposit.totalAmount)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Post deposit" />
            <CardBody className="space-y-3">
              <Field label="Deposit date">
                <Input
                  type="date"
                  value={depositDate}
                  onChange={(event) => setDepositDate(event.target.value)}
                />
              </Field>

              <dl className="divide-y divide-slate-100">
                <DetailRow label="Selected">{selectedReceipts.length}</DetailRow>
                <DetailRow label="Total">
                  <span className="text-base">{money(selectedTotal)}</span>
                </DetailRow>
              </dl>

              {postMutation.isError && (
                <Notice tone="red" title="Deposit was not posted">
                  {(postMutation.error as Error).message}
                </Notice>
              )}

              <Button
                variant="primary"
                className="w-full"
                loading={postMutation.isPending}
                disabled={selectedReceipts.length === 0}
                onClick={() =>
                  postMutation.mutate({
                    receiptHistoryIds: selectedReceipts.map((receipt) => receipt.id),
                    depositDate: depositDate
                      ? new Date(depositDate).toISOString()
                      : null,
                  })
                }
              >
                Bank {selectedReceipts.length} receipt(s)
              </Button>

              <p className="text-xs text-slate-500">
                A new deposit number is allocated when you post.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
