"use client";

import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge, Button } from "@/components/ui";
import { printReportUrl } from "@/lib/print";

/**
 * Renders a report document (HTML from the API) in an iframe, with a toolbar to refresh, open in a
 * new tab, and save as PDF. The iframe is same-origin (the API is proxied under this app), so the
 * "Save as PDF" button can drive the browser's print pipeline directly.
 */
export function ReportFrame({
  url,
  title,
  view,
  height = 780,
}: {
  url: string;
  title: string;
  /** "html" = live data, "layout" = placeholder preview. Shown as a badge. */
  view: "html" | "layout";
  height?: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  // Bumping this forces the iframe to reload even when the url is unchanged.
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setLoading(true);
  }, [url, nonce]);

  const src = nonce === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}_r=${nonce}`;

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
          <a href={src} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="secondary" type="button">
              <ExternalLink className="size-3.5" />
              Open in new tab
            </Button>
          </a>
          <Button size="sm" variant="primary" onClick={() => printReportUrl(src)}>
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
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          className="h-full w-full"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
