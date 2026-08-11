"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { ReportFrame } from "@/components/ReportFrame";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Notice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import {
  findReport,
  reportUrl,
  type ReportQueryParams,
  type ReportView,
} from "@/lib/reports";

function ReportViewer() {
  const params = useParams<{ name: string }>();
  const search = useSearchParams();
  const name = decodeURIComponent(params.name);
  const meta = findReport(name);

  const bound = meta?.bound ?? false;
  // Which filters to show. Unknown reports (not in the catalog) get the full set.
  const filters = meta?.filters ?? { dates: true, custId: true, invoiceNo: true };

  const initialView: ReportView =
    search.get("view") === "layout" ? "layout" : bound ? "html" : "layout";

  const [view, setView] = useState<ReportView>(initialView);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [custId, setCustId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");

  // The parameters actually applied to the currently displayed report. Updated on Generate so the
  // iframe doesn't reload on every keystroke.
  const [applied, setApplied] = useState<{ view: ReportView; params: ReportQueryParams }>({
    view: initialView,
    params: {},
  });

  const url = useMemo(
    () => reportUrl(name, applied.view, applied.params),
    [name, applied],
  );

  function generate(nextView: ReportView) {
    setView(nextView);
    setApplied({
      view: nextView,
      params: {
        from: from || undefined,
        to: to || undefined,
        custId: custId || undefined,
        invoiceNo: invoiceNo || undefined,
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={meta?.title ?? name}
        description={meta?.description ?? "Report preview."}
        actions={
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" />
              All reports
            </Button>
          </Link>
        }
      />

      {!bound && (
        <div className="mb-4">
          <Notice tone="amber" title="Layout preview only">
            This report isn&apos;t bound to live data yet
            {meta?.blockedBy ? ` — ${meta.blockedBy}` : "."} The preview below shows the report
            layout with field placeholders.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit">
          <CardHeader title="Options" />
          <CardBody className="space-y-3">
            {filters.dates && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="From">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="To">
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
            )}
            {filters.custId && (
              <Field label="Customer ID" hint="Optional — leave blank for all customers.">
                <Input
                  inputMode="numeric"
                  value={custId}
                  onChange={(e) => setCustId(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 1042"
                />
              </Field>
            )}
            {filters.invoiceNo && (
              <Field label="Invoice no." hint="Optional — exact match.">
                <Input
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="e.g. 100482"
                />
              </Field>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {bound ? (
                <>
                  <Button variant="primary" onClick={() => generate("html")}>
                    Generate with live data
                  </Button>
                  <Button variant="secondary" onClick={() => generate("layout")}>
                    Layout preview
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={() => generate("layout")}>
                  Generate layout preview
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <ReportFrame url={url} title={meta?.title ?? name} view={view} />
      </div>
    </div>
  );
}

/**
 * Report viewer. useSearchParams requires a Suspense boundary in the App Router, so the viewer is
 * wrapped here.
 */
export default function ReportViewerPage() {
  return (
    <Suspense fallback={<Spinner label="Loading report…" />}>
      <ReportViewer />
    </Suspense>
  );
}
