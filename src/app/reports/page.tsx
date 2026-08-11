"use client";

import { ArrowRight, Bug, FileBarChart2 } from "lucide-react";
import Link from "next/link";

import { Badge, Button, Card, CardBody, PageHeader } from "@/components/ui";
import {
  BOUND_REPORTS,
  REPORT_CATEGORIES,
  type ReportCategory,
} from "@/lib/reports";

/**
 * Reports index.
 *
 * Lists the reports the API renders with live data, grouped by category. Each opens in the report
 * viewer, where it can be filtered, previewed and saved as PDF. The full set of reports —
 * including those not yet bound — lives on the debug screen.
 */
export default function ReportsPage() {
  const byCategory = REPORT_CATEGORIES.map((category) => ({
    category,
    reports: BOUND_REPORTS.filter((r) => r.category === category),
  })).filter((group) => group.reports.length > 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate a report, filter it, and download it as a PDF."
        actions={
          <Link href="/reports/debug">
            <Button variant="secondary" size="sm">
              <Bug className="size-3.5" />
              Report debug
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        {byCategory.map(({ category, reports }) => (
          <section key={category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {category as ReportCategory}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                <Link
                  key={report.name}
                  href={`/reports/${encodeURIComponent(report.name)}`}
                  className="group block"
                >
                  <Card className="h-full transition-colors group-hover:border-sky-300">
                    <CardBody className="flex h-full flex-col">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <FileBarChart2 className="size-5 shrink-0 text-sky-700" />
                        <Badge tone="green">Live data</Badge>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                      <p className="mt-1 flex-1 text-xs text-slate-500">{report.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                        Open report
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
