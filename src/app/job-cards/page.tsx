"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { jobCards, orders } from "@/lib/endpoints";
import { qty as formatQty, text } from "@/lib/format";
import { buildJobCardBatchPrintHtml, buildJobCardPrintHtml } from "@/lib/jobCardPrint";
import { printReportHtml } from "@/lib/print";

/** A whole number from a text box, or null when it is blank or not a non-negative integer. */
function parseRun(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/**
 * Job cards for a run — batch printing, with a reprint for one order.
 *
 * Customer feedback, Nov 2026: job cards are printed for the batch, at the same cut-off the run is
 * invoiced, with a reprint kept for the odd single job. (Before this, a job card could only be
 * printed from one order's page.) Pick the run, check what will print, and print the lot; the
 * order screen's own Print job card button still covers one order.
 *
 * The API compares runs as numbers (the run is text on the order, so "10" comes after "2") and
 * answers with the cards plus how many orders matched, so an order with no stamp job to print
 * shows up as a gap rather than silently missing.
 */
export default function JobCardsPage() {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [applied, setApplied] = useState<{ start: number; end: number } | null>(null);

  const start = parseRun(startInput);
  const end = endInput.trim() === "" ? start : parseRun(endInput);
  const startError =
    startInput.trim() !== "" && start === null ? "Enter a run number, e.g. 1." : undefined;
  const endError =
    endInput.trim() !== "" && end === null
      ? "Enter a run number, or leave blank for the same run."
      : start !== null && end !== null && end < start
        ? "The last run can't be before the first."
        : undefined;
  const canLoad = start !== null && end !== null && end >= start;

  const query = useQuery({
    queryKey: ["job-cards", "run", applied],
    queryFn: () => jobCards.forRuns(applied!.start, applied!.end),
    enabled: applied !== null,
    // A print screen should show what is true now, not a cached list from a minute ago.
    staleTime: 0,
  });

  const load = () => {
    if (!canLoad) return;
    setApplied({ start: start!, end: end! });
  };

  const runLabel = applied
    ? applied.start === applied.end
      ? `run ${applied.start}`
      : `runs ${applied.start}–${applied.end}`
    : "";

  const cards = query.data?.cards ?? [];
  const orderCount = query.data?.orderCount ?? 0;
  const ordersWithCards = new Set(cards.map((c) => c.orderId)).size;
  const ordersWithoutCards = Math.max(0, orderCount - ordersWithCards);

  const printBatch = () =>
    printReportHtml(buildJobCardBatchPrintHtml(`Job cards — ${runLabel}`, cards));

  // --- Reprint one order -------------------------------------------------------------------
  const [orderInput, setOrderInput] = useState("");
  const orderId = /^\d+$/.test(orderInput.trim()) ? Number(orderInput.trim()) : null;

  const reprint = useMutation({
    mutationFn: async (id: number) => {
      const found = await orders.jobCard(id);
      return { id, found };
    },
    onSuccess: ({ id, found }) => {
      if (found.length > 0) printReportHtml(buildJobCardPrintHtml(id, found));
    },
  });

  return (
    <>
      <PageHeader
        title="Job cards"
        description="Print the job cards for a run, or reprint one order's."
      />

      <Card className="mb-4">
        <CardHeader title="Print a run" />
        <CardBody>
          <form
            className="grid gap-3 sm:grid-cols-[10rem_10rem_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
            <Field label="First run" required error={startError}>
              <Input
                value={startInput}
                inputMode="numeric"
                placeholder="e.g. 1"
                autoFocus
                onFocus={(event) => event.target.select()}
                onChange={(event) => setStartInput(event.target.value)}
              />
            </Field>

            <Field label="Last run" error={endError} hint="Blank is the same run.">
              <Input
                value={endInput}
                inputMode="numeric"
                placeholder={startInput.trim() || "same"}
                onFocus={(event) => event.target.select()}
                onChange={(event) => setEndInput(event.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" disabled={!canLoad} loading={query.isFetching}>
              <Search className="size-3.5" />
              Show job cards
            </Button>
          </form>
        </CardBody>
      </Card>

      {applied && (
        <Card className="mb-4">
          <CardHeader
            title={`Job cards for ${runLabel}`}
            actions={
              <Button
                variant="primary"
                disabled={cards.length === 0 || query.isFetching}
                onClick={printBatch}
              >
                <Printer className="size-3.5" />
                Print {cards.length > 0 ? `${cards.length} job card${cards.length === 1 ? "" : "s"}` : ""}
              </Button>
            }
          />

          {query.isLoading ? (
            <Spinner label="Loading job cards…" />
          ) : query.isError ? (
            <CardBody>
              <ErrorState error={query.error} />
            </CardBody>
          ) : (
            <>
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-600">
                  {orderCount} order{orderCount === 1 ? "" : "s"} in {runLabel};{" "}
                  {cards.length} job card{cards.length === 1 ? "" : "s"} to print.
                </p>

                {ordersWithoutCards > 0 && (
                  <Notice tone="amber" title="Some orders have no job card">
                    {ordersWithoutCards} order{ordersWithoutCards === 1 ? " has" : "s have"} no
                    stamp job in Soset to print, for example because the product doesn&apos;t make a
                    stamp job, or Soset writes are disabled.
                  </Notice>
                )}
              </CardBody>

              {cards.length === 0 ? (
                <EmptyState
                  title="Nothing to print"
                  description={
                    orderCount === 0
                      ? `There are no orders in ${runLabel}.`
                      : "None of those orders has a job card."
                  }
                />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Order</Th>
                      <Th>Job no.</Th>
                      <Th>Customer</Th>
                      <Th>Product</Th>
                      <Th>Colour</Th>
                      <Th align="right">Qty</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cards.map((card) => (
                      <tr key={`${card.orderId}-${card.jobNo}`}>
                        <Td>
                          <Link
                            href={`/orders/${card.orderId}`}
                            className="text-sky-700 hover:text-sky-900"
                          >
                            {card.orderId}
                          </Link>
                        </Td>
                        <Td>{card.jobNo}</Td>
                        <Td>{text(card.custInfo?.split("\n")[0])}</Td>
                        <Td>{text(card.prodName ?? card.prodId)}</Td>
                        <Td>{text(card.colour)}</Td>
                        <Td align="right">{formatQty(card.quantity)}</Td>
                        <Td>{card.rush && <Badge tone="amber">Rush</Badge>}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="max-w-xl">
        <CardHeader title="Reprint one order" />
        <CardBody>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (orderId !== null) reprint.mutate(orderId);
            }}
          >
            <Field label="Order number" className="flex-1">
              <Input
                value={orderInput}
                inputMode="numeric"
                placeholder="e.g. 255425"
                onFocus={(event) => event.target.select()}
                onChange={(event) => {
                  setOrderInput(event.target.value);
                  reprint.reset();
                }}
              />
            </Field>
            <Button type="submit" disabled={orderId === null} loading={reprint.isPending}>
              <Printer className="size-3.5" />
              Reprint
            </Button>
          </form>

          {reprint.isError && (
            <div className="mt-3">
              <ErrorState error={reprint.error} />
            </div>
          )}
          {reprint.isSuccess && reprint.data.found.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">
              Order {reprint.data.id} has no job cards to print (it may not exist, or none of its
              lines has a stamp job).
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
