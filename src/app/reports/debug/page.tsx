"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileSearch, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ReportFrame } from "@/components/ReportFrame";
import {
  Badge,
  Button,
  Card,
  CardBody,
  ErrorState,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { text } from "@/lib/format";
import {
  getReportDefinition,
  listReportNames,
  PHYSICAL_REPORTS,
  type ReportView,
} from "@/lib/reports";

type Dialog =
  | { kind: "preview"; name: string; title: string; view: ReportView }
  | { kind: "definition"; name: string; title: string };

export default function ReportDebugPage() {
  const [dialog, setDialog] = useState<Dialog | null>(null);

  // Cross-check the catalog against what the API actually reports, so drift is visible.
  const namesQuery = useQuery({
    queryKey: ["reports", "names"],
    queryFn: () => listReportNames(),
    retry: false,
  });

  const apiNames = namesQuery.data ?? [];
  const apiSet = new Set(apiNames.map((n) => n.toLowerCase()));
  const catalogSet = new Set(PHYSICAL_REPORTS.map((r) => r.name.toLowerCase()));

  const boundCount = PHYSICAL_REPORTS.filter((r) => r.bound).length;
  const total = PHYSICAL_REPORTS.length;
  const pct = Math.round((boundCount / total) * 100);

  const missingFromApi = PHYSICAL_REPORTS.filter((r) => apiNames.length > 0 && !apiSet.has(r.name.toLowerCase()));
  const missingFromCatalog = apiNames.filter((n) => !catalogSet.has(n.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Report debug"
        description="Every report the API knows about — generate a test version and track binding progress."
        actions={
          <Link href="/reports">
            <Button variant="secondary" size="sm">
              All reports
            </Button>
          </Link>
        }
      />

      {/* Progress */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {boundCount} of {total} reports bound to live data
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Unbound reports still generate a faithful layout preview for testing.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-sky-600" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-slate-500">{pct}%</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Drift warnings */}
      {namesQuery.isError && (
        <div className="mb-4">
          <Notice tone="amber" title="Couldn’t reach the API report list">
            The table still works from the built-in catalog, but live/API cross-checking is
            unavailable.
          </Notice>
        </div>
      )}
      {missingFromApi.length > 0 && (
        <div className="mb-4">
          <Notice tone="red" title="In catalog but not returned by the API">
            {missingFromApi.map((r) => r.name).join(", ")}
          </Notice>
        </div>
      )}
      {missingFromCatalog.length > 0 && (
        <div className="mb-4">
          <Notice tone="amber" title="Returned by the API but missing from the catalog">
            {missingFromCatalog.join(", ")} — add these to lib/reports.ts.
          </Notice>
        </div>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Report</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th align="right">Test</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PHYSICAL_REPORTS.map((report) => {
              const onApi = apiNames.length === 0 || apiSet.has(report.name.toLowerCase());
              return (
                <tr key={report.name} className="align-top">
                  <Td>
                    <div className="font-medium text-slate-800">{report.title}</div>
                    <div className="max-w-md text-xs text-slate-500">{report.description}</div>
                    {report.blockedBy && (
                      <div className="mt-1 max-w-md text-xs text-amber-700">
                        Blocked: {report.blockedBy}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                      {report.name}
                    </code>
                    {!onApi && (
                      <div className="mt-1">
                        <Badge tone="red">not on API</Badge>
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-600">{report.category}</Td>
                  <Td>
                    {report.bound ? (
                      <Badge tone="green">Live data</Badge>
                    ) : (
                      <Badge tone="amber">Layout only</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          setDialog({
                            kind: "preview",
                            name: report.name,
                            title: report.title,
                            view: report.bound ? "html" : "layout",
                          })
                        }
                      >
                        <FlaskConical className="size-3.5" />
                        {report.bound ? "Generate" : "Layout"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDialog({ kind: "definition", name: report.name, title: report.title })
                        }
                      >
                        <FileSearch className="size-3.5" />
                        Definition
                      </Button>
                      <Link
                        href={`/reports/${encodeURIComponent(report.name)}?view=${report.bound ? "html" : "layout"}`}
                        title="Open in full viewer"
                      >
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Preview dialog */}
      <Modal
        open={dialog?.kind === "preview"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "preview" ? `Test: ${dialog.title}` : ""}
        description="A generated test version of the report."
        width="xl"
      >
        {dialog?.kind === "preview" && (
          <ReportFrame
            name={dialog.name}
            view={dialog.view}
            params={{}}
            title={dialog.title}
            height={620}
          />
        )}
      </Modal>

      {/* Definition dialog */}
      <Modal
        open={dialog?.kind === "definition"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "definition" ? `Definition: ${dialog.title}` : ""}
        description="Parsed from the extracted Crystal report."
        width="lg"
      >
        {dialog?.kind === "definition" && <DefinitionInspector name={dialog.name} />}
      </Modal>
    </div>
  );
}

function DefinitionInspector({ name }: { name: string }) {
  const query = useQuery({
    queryKey: ["reports", "definition", name],
    queryFn: () => getReportDefinition(name),
    retry: false,
  });

  if (query.isLoading) return <Spinner label="Loading definition…" />;
  if (query.isError) return <ErrorState error={query.error} />;

  const def = query.data;
  if (!def) return null;

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
        <dt className="text-slate-500">Source file</dt>
        <dd className="font-medium text-slate-800">{text(def.sourceFile)}</dd>
        <dt className="text-slate-500">Title</dt>
        <dd className="font-medium text-slate-800">{text(def.title)}</dd>
        {def.recordSelectionFormula && (
          <>
            <dt className="text-slate-500">Record selection</dt>
            <dd className="font-mono text-xs text-slate-700">{def.recordSelectionFormula}</dd>
          </>
        )}
      </dl>

      <DefinitionList
        heading="Tables"
        items={def.tables?.map((t) => t.name) ?? []}
        empty="No tables."
      />
      <DefinitionList
        heading="Parameters"
        items={def.parameters?.map((p) => text(p.promptText, p.name)) ?? []}
        empty="No parameters."
      />
      <DefinitionList
        heading="Formulas"
        items={def.formulas?.map((f) => f.name) ?? []}
        empty="No formula fields."
      />
    </div>
  );
}

function DefinitionList({
  heading,
  items,
  empty,
}: {
  heading: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {heading} {items.length > 0 && <span className="text-slate-400">({items.length})</span>}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
