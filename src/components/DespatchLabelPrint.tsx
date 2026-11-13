"use client";

import { useEffect } from "react";

import type { DespatchLabels } from "@/types/api";

/**
 * Prints the two despatch labels the legacy Scan Tracking screen (TrackAdd.frm) printed: a
 * small return label, then a large delivery label, each on its own page.
 *
 * The legacy app sent them to two named printers. A browser can't choose a printer, so the
 * print dialog's destination decides that; the labels are separate pages so a label printer
 * can cut between them.
 *
 * Colours are explicit (not theme tokens) so the labels stay black on white in dark mode.
 */
export function DespatchLabelPrint({
  labels,
  onDone,
}: {
  labels: DespatchLabels | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!labels) return;
    // Let the labels render before the print dialog opens; print() blocks until it closes.
    const handle = window.setTimeout(() => {
      window.print();
      onDone();
    }, 50);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels]);

  if (!labels) return null;

  return (
    <>
      <style>{`
        @media screen { #despatch-labels { display: none; } }
        @media print {
          body * { visibility: hidden; }
          #despatch-labels, #despatch-labels * { visibility: visible; }
          #despatch-labels { position: absolute; left: 0; top: 0; width: 100%; }
          .despatch-label { page-break-after: always; break-after: page; }
          .despatch-label:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>
      <div id="despatch-labels" style={{ background: "#fff", color: "#000" }}>
        <div className="despatch-label" style={{ fontSize: "10pt", fontFamily: "Arial, sans-serif" }}>
          {labels.returnLabel.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div
          className="despatch-label"
          style={{
            fontSize: "16pt",
            fontWeight: 700,
            fontFamily: '"Arial Narrow", Arial, sans-serif',
          }}
        >
          {labels.deliveryLabel.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </>
  );
}
