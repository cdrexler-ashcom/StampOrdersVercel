"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { imports } from "@/lib/endpoints";
import type { ImportResult, ImportRowResult, ImportRowStatus } from "@/types/api";

/**
 * Web order import — replaces ImportWebOrders.frm (D2). It is a CSV upload that creates one
 * order with a line per row. (The Soset stamp import, ImportOrders.frm / D1, was dropped at the
 * customer's request.)
 *
 * The endpoint always returns 200 with a row-by-row ImportResult, never a per-row HTTP
 * error: a bad product code or an unrecognised colour on one row doesn't stop the run, it's
 * reported alongside the rows that succeeded. That's rendered here as a summary line plus a
 * table where "Failed" and "Skipped" are shown as warnings, not as the page having failed —
 * the run itself succeeded even when individual rows didn't.
 */
export default function ImportsPage() {
  return (
    <>
      <PageHeader
        title="Import web orders"
        description="Bring a web-order CSV into the system as a new order."
      />

      <WebOrderImportPanel />
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Web order CSV
// ---------------------------------------------------------------------------------------

function WebOrderImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (selected: File) => imports.webOrders(selected),
  });

  const submit = () => {
    if (!file) return;
    mutation.mutate(file);
  };

  const reset = () => {
    setFile(null);
    mutation.reset();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Import web orders"
          description="Creates one order from the CSV, with a line — and a Soset stamp job — per row."
        />
        <CardBody className="space-y-3">
          <Field label="CSV file">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                mutation.reset();
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </Field>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              loading={mutation.isPending}
              disabled={!file}
              onClick={submit}
            >
              <Upload className="size-3.5" />
              Upload and import
            </Button>
            {(file || mutation.data) && (
              <Button onClick={reset} disabled={mutation.isPending}>
                Clear
              </Button>
            )}
          </div>

          {mutation.isError && (
            <Notice tone="red" title="Import did not run">
              {(mutation.error as Error).message}
            </Notice>
          )}
        </CardBody>
      </Card>

      {mutation.data && <ImportResultView result={mutation.data} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Shared result rendering
// ---------------------------------------------------------------------------------------

function ImportResultView({ result }: { result: ImportResult }) {
  const hasProblems = result.failed > 0 || result.skipped > 0;

  return (
    <Card className="mt-4">
      <CardHeader
        title="Result"
        description={
          result.summary ??
          `${result.totalRows} row${result.totalRows === 1 ? "" : "s"} processed`
        }
        actions={
          result.orderId && (
            <Link href={`/orders/${result.orderId}`}>
              <Button size="sm" variant="primary">
                Open order {result.orderId}
              </Button>
            </Link>
          )
        }
      />

      <CardBody className="space-y-4">
        {/* The run succeeding is what put this on screen at all — the tone here reflects
            whether every row also succeeded, not whether the import itself worked. */}
        <Notice tone={hasProblems ? "amber" : "green"} title="Summary">
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              {result.imported} imported
            </span>
            {result.skipped > 0 && <span>{result.skipped} skipped</span>}
            {result.failed > 0 && (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="size-3.5" />
                {result.failed} error{result.failed === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </Notice>

        {result.rows.length === 0 ? (
          <EmptyState title="No rows to report" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Row</Th>
                <Th>Status</Th>
                <Th>Job / order</Th>
                <Th>Message</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.rows.map((row) => (
                <ImportRow key={row.row} row={row} />
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

const ROW_STATUS_TONE: Record<ImportRowStatus, "green" | "slate" | "amber"> = {
  Imported: "green",
  Skipped: "slate",
  // Row-level failures are surfaced as warnings, not errors — the import run itself still
  // succeeded, matching the legacy forms which continued past a bad row rather than aborting.
  Failed: "amber",
};

function ImportRow({ row }: { row: ImportRowResult }) {
  const tone = ROW_STATUS_TONE[row.status];

  return (
    <tr className="align-top hover:bg-slate-50">
      <Td>{row.row}</Td>
      <Td>
        <Badge tone={tone}>{row.status}</Badge>
      </Td>
      <Td>{row.jobNo ?? "—"}</Td>
      <Td className="max-w-md whitespace-normal text-slate-600">{row.message ?? "—"}</Td>
    </tr>
  );
}
