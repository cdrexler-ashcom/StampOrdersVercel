"use client";

import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Button, Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { openReportHtml, printReportHtml } from "@/lib/print";
import { fetchReportHtml, type ReportQueryParams, type ReportView } from "@/lib/reports";

/**
 * Renders a report document in an iframe.
 *
 * Since auth (H1/H2) the report HTML CANNOT be loaded by pointing the iframe at the API URL — a
 * browser navigation doesn't carry the bearer token and the API returns 401. Instead we fetch the
 * HTML through the authenticated api client and render it with the iframe's `srcDoc`. "Open in new
 * tab" and "Save as PDF" likewise operate on the already-fetched HTML (via a blob), so they carry
 * the auth too.
 */
export function ReportFrame({
  name,
  view,
  params,
  title,
  height = 780,
}: {
  name: string;
  view: ReportView;
  params: ReportQueryParams;
  title: string;
  height?: number;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this forces a re-fetch even when the inputs are unchanged (the Refresh button).
  const [nonce, setNonce] = useState(0);

  // Serialise params so the effect re-runs when any filter changes.
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchReportHtml(name, view, params, controller.signal)
      .then((doc) => setHtml(doc))
      .catch((err) => {
        if (controller.signal.aborted) return;
        // A 401 is handled globally (api.ts redirects to /login); show a message for anything else.
        if (!(err instanceof ApiError && err.status === 401)) {
          setError(err instanceof Error ? err.message : "The report could not be generated.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // paramsKey stands in for `params`; name/view/nonce are primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, view, paramsKey, nonce]);

  const onPrint = useCallback(() => {
    if (html) printReportHtml(html);
  }, [html]);

  const onOpen = useCallback(() => {
    if (html) openReportHtml(html);
  }, [html]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{title}</span>
          {view === "layout" ? (
            <Badge tone="amber">Layout preview</Badge>
          ) : (
            <Badge tone="green">Live data</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={onOpen}
            disabled={!html}
          >
            <ExternalLink className="size-3.5" />
            Open in new tab
          </Button>
          <Button size="sm" variant="primary" onClick={onPrint} disabled={!html}>
            <Download className="size-3.5" />
            Save as PDF
          </Button>
        </div>
      </div>

      <div className="relative bg-white" style={{ height }}>
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Loading report…
          </div>
        )}

        {error ? (
          <div className="p-4">
            <Notice tone="red" title="Could not generate the report">
              {error}
            </Notice>
          </div>
        ) : (
          <iframe
            // srcDoc renders the fetched HTML directly — no navigation to the API, so the token
            // isn't needed at load time (it was already sent by the authenticated fetch).
            srcDoc={html ?? ""}
            title={title}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}
