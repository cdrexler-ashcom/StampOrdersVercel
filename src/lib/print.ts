/**
 * Client-side print / "Save as PDF" for reports.
 *
 * The API renders each report as a self-contained, print-ready HTML document (the same layout the
 * legacy Crystal viewer produced, positioned in points). Rather than convert that to PDF on the
 * server, we drive the browser's own print pipeline: load the report into a hidden, same-origin
 * iframe and call print() on it. The browser's print dialog then offers "Save as PDF", which
 * downloads the file to the user's computer with the report layout preserved exactly.
 *
 * Same-origin is what makes contentWindow.print() permissible — next.config.ts proxies /api/* to
 * the API under this app's origin, so the report document is same-origin.
 */

const FRAME_ID = "report-print-frame";

export function printReportUrl(url: string): void {
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

    // Clean the frame up once the dialog closes, so repeated prints don't stack frames.
    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    win.addEventListener?.("afterprint", cleanup);

    win.focus();
    win.print();

    // Fallback cleanup for browsers that don't fire afterprint.
    window.setTimeout(() => document.getElementById(FRAME_ID)?.remove(), 60_000);
  };

  frame.src = url;
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
