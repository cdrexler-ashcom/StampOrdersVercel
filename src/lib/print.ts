/**
 * Client-side print / "Save as PDF" / open-in-new-tab for reports.
 *
 * The API renders each report as a self-contained, print-ready HTML document. Since auth (H1/H2)
 * the report HTML is fetched through the authenticated api client (ReportFrame does this) and
 * passed here as a STRING — we no longer point a frame/window at the API URL, because a browser
 * navigation wouldn't carry the bearer token and would 401.
 *
 * Print drives the browser's own print pipeline via a hidden iframe (its "Save as PDF" preserves
 * the layout). Both helpers use a blob URL of the fetched HTML, so nothing re-hits the API.
 */

const FRAME_ID = "report-print-frame";

/** Prints (Save as PDF) a report from its already-fetched HTML. */
export function printReportHtml(html: string): void {
  if (typeof document === "undefined") return;

  document.getElementById(FRAME_ID)?.remove();

  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));

  const frame = document.createElement("iframe");
  frame.id = FRAME_ID;
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  });

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;

    const cleanup = () =>
      window.setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(blobUrl);
      }, 500);
    win.addEventListener?.("afterprint", cleanup);

    win.focus();
    win.print();

    // Fallback cleanup for browsers that don't fire afterprint.
    window.setTimeout(() => {
      document.getElementById(FRAME_ID)?.remove();
      URL.revokeObjectURL(blobUrl);
    }, 60_000);
  };

  frame.src = blobUrl;
  document.body.appendChild(frame);
}

/**
 * As printReportUrl, but for a document already held as an HTML string rather than a URL —
 * the proof preview, which is POSTed and rendered client-side rather than fetched by GET.
 * srcdoc content shares the parent's origin, so contentWindow.print() is permitted exactly
 * as it is for the same-origin iframe src case above.
 */
export function printHtml(html: string): void {
  if (typeof document === "undefined") return;

  document.getElementById(FRAME_ID)?.remove();

  const frame = document.createElement("iframe");
  frame.id = FRAME_ID;
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  });

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;

    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    win.addEventListener?.("afterprint", cleanup);

    win.focus();
    win.print();

    window.setTimeout(() => document.getElementById(FRAME_ID)?.remove(), 60_000);
  };

  frame.srcdoc = html;
  document.body.appendChild(frame);
}

/** Opens a report's already-fetched HTML in a new tab (for viewing / the browser's own print). */
export function openReportHtml(html: string): void {
  if (typeof window === "undefined") return;

  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");

  // If a popup blocker stopped it, fall back to a same-tab navigation.
  if (!win) {
    window.location.assign(blobUrl);
    return;
  }

  // Revoke once the new tab has had time to load; revoking too early would blank it.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
