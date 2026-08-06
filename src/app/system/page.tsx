"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailRow,
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
import { health, soset } from "@/lib/endpoints";
import { text } from "@/lib/format";

/**
 * System and Soset diagnostics.
 *
 * The legacy equivalents were scattered across the File menu: Control, Bins, Version,
 * Set Debug On, Change Stamp Status. Only the Soset side has API support, and it is the
 * part that actually generates support calls, so that is what this page covers.
 *
 * Ctrl.frm (28 control fields), Bins, Invoice States, Stamp Labels and the overdue
 * message editors have no endpoints; they are listed in DESIGN-NOTES.md.
 */
export default function SystemPage() {
  const [jobNo, setJobNo] = useState("");
  const [lookupJobNo, setLookupJobNo] = useState("");

  const statusQuery = useQuery({
    queryKey: ["soset", "status"],
    queryFn: () => soset.status(),
  });

  const tablesQuery = useQuery({
    queryKey: ["soset", "tables"],
    queryFn: () => soset.tables(),
    retry: false,
  });

  const nextNumberQuery = useQuery({
    queryKey: ["soset", "next-order-number"],
    queryFn: () => soset.nextOrderNumber(),
    retry: false,
  });

  const readyQuery = useQuery({
    queryKey: ["health", "ready"],
    queryFn: () => health.ready(),
    refetchInterval: 30_000,
  });

  const stampQuery = useQuery({
    queryKey: ["soset", "stamp", lookupJobNo],
    queryFn: () => soset.stamp(lookupJobNo),
    enabled: lookupJobNo.length > 0,
    retry: false,
  });

  const status = statusQuery.data;

  return (
    <>
      <PageHeader
        title="System"
        description="Connection health and Soset diagnostics."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Soset configuration" />
            <CardBody>
              {statusQuery.isLoading ? (
                <Spinner />
              ) : statusQuery.isError ? (
                <ErrorState error={statusQuery.error} />
              ) : status ? (
                <>
                  <dl className="divide-y divide-slate-100">
                    <DetailRow label="Data path">
                      <code className="text-xs">{status.dataPath}</code>
                    </DetailRow>
                    <DetailRow label="Path reachable">
                      <Badge tone={status.dataPathExists ? "green" : "red"}>
                        {status.dataPathExists ? "Yes" : "No"}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Write mode">
                      <Badge
                        tone={status.writeMode === "Disabled" ? "amber" : "green"}
                      >
                        {status.writeMode}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Reference cache">
                      {status.referenceCacheMinutes} minute(s)
                    </DetailRow>
                  </dl>

                  <div className="mt-3">
                    <Notice
                      tone={status.writeMode === "Disabled" ? "amber" : "sky"}
                      title="What this means"
                    >
                      {status.note}
                    </Notice>
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Soset tables"
              description="Structure of each table as the DBF reader sees it."
            />

            {tablesQuery.isLoading ? (
              <Spinner />
            ) : tablesQuery.isError ? (
              <ErrorState error={tablesQuery.error} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Table</Th>
                    <Th>File</Th>
                    <Th>Version</Th>
                    <Th align="right">Records</Th>
                    <Th align="right">Columns</Th>
                    <Th align="right">Record length</Th>
                    <Th>Encoding</Th>
                    <Th>Memo</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tablesQuery.data?.map((table) => (
                    <tr key={table.table}>
                      <Td>
                        <span className="font-medium text-slate-900">
                          {table.table}
                        </span>
                      </Td>
                      <Td>
                        {table.found ? (
                          <code className="text-xs">{table.file}</code>
                        ) : (
                          <Badge tone="red">Not found</Badge>
                        )}
                      </Td>
                      <Td>{table.version ?? "—"}</Td>
                      <Td align="right">{table.records ?? "—"}</Td>
                      <Td align="right">{table.columns ?? "—"}</Td>
                      <Td align="right">{table.recordLength ?? "—"}</Td>
                      <Td>{table.encoding ?? "—"}</Td>
                      <Td>
                        {table.found ? (table.hasMemo ? "Yes" : "No") : "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Stamp job lookup"
              description="Check whether Soset holds a stamp record for a job number."
            />
            <CardBody className="space-y-3">
              <div className="flex items-end gap-2">
                <Field label="Job number" className="max-w-40">
                  <Input
                    value={jobNo}
                    maxLength={6}
                    onChange={(event) => setJobNo(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setLookupJobNo(jobNo.trim());
                    }}
                  />
                </Field>
                <Button
                  variant="primary"
                  onClick={() => setLookupJobNo(jobNo.trim())}
                  disabled={!jobNo.trim()}
                >
                  Look up
                </Button>
              </div>

              {lookupJobNo && stampQuery.isLoading && <Spinner />}

              {lookupJobNo && stampQuery.isError && (
                <Notice
                  tone={
                    (stampQuery.error as { status?: number }).status === 404
                      ? "slate"
                      : "red"
                  }
                  title={
                    (stampQuery.error as { status?: number }).status === 404
                      ? "No stamp record"
                      : "Lookup failed"
                  }
                >
                  {(stampQuery.error as { status?: number }).status === 404
                    ? `Soset holds no stamp with SEARCHKEY1 = ${lookupJobNo}.`
                    : (stampQuery.error as Error).message}
                </Notice>
              )}

              {stampQuery.data && (
                <dl className="divide-y divide-slate-100 rounded-md border border-slate-200 px-3">
                  <DetailRow label="Soset order number">
                    {text(stampQuery.data.orderNo)}
                  </DetailRow>
                  <DetailRow label="Job (SEARCHKEY1)">
                    {text(stampQuery.data.searchKey1)}
                  </DetailRow>
                  <DetailRow label="Bin (SEARCHKEY2)">
                    {text(stampQuery.data.searchKey2)}
                  </DetailRow>
                  <DetailRow label="Product">
                    {text(stampQuery.data.prodId)}
                  </DetailRow>
                  <DetailRow label="Colour">
                    {text(stampQuery.data.colourId)}
                  </DetailRow>
                  <DetailRow label="Quantity">
                    {stampQuery.data.quantity ?? "—"}
                  </DetailRow>
                  <DetailRow label="Status">
                    {text(stampQuery.data.statusId)}
                  </DetailRow>
                </dl>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="API" />
            <CardBody>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Readiness">
                  {readyQuery.isLoading ? (
                    "Checking…"
                  ) : (
                    <Badge tone={readyQuery.data ? "green" : "red"}>
                      {readyQuery.data ? "Ready" : "Not ready"}
                    </Badge>
                  )}
                </DetailRow>
                <DetailRow label="Next Soset order no.">
                  {nextNumberQuery.isLoading
                    ? "…"
                    : nextNumberQuery.isError
                      ? "Unavailable"
                      : text(nextNumberQuery.data?.value)}
                </DetailRow>
              </dl>
            </CardBody>
          </Card>

          <Notice tone="slate" title="Not yet available through the API">
            Control record, bins, invoice states, stamp labels, overdue messages, order
            imports and the reporting suite have no endpoints in the current API. They
            are listed with their legacy sources in DESIGN-NOTES.md.
          </Notice>
        </div>
      </div>
    </>
  );
}
