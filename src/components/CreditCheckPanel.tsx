"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { orders } from "@/lib/endpoints";
import { creditStatusLabel, money } from "@/lib/format";

/**
 * Ageing and credit position for a customer.
 *
 * In the legacy application this arrived as a modal message box partway through order
 * entry (frmOdueMsg1 / frmOdueMsg2). Here it is shown alongside the order before any
 * work is done, so the operator sees the position rather than being interrupted by it.
 */
export function CreditCheckPanel({
  custId,
  compact = false,
}: {
  custId: number;
  compact?: boolean;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["credit-check", custId],
    queryFn: () => orders.creditCheck(custId),
  });

  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        Checking credit position…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        Credit position unavailable.
      </div>
    );
  }

  const { aging, onHold, status, message } = data;

  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        onHold
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        {onHold ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
        ) : (
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              onHold ? "text-red-800" : "text-slate-800"
            }`}
          >
            {onHold ? "Account on credit hold" : "Account within terms"}
          </p>
          <p className="text-xs text-slate-600">
            {creditStatusLabel[status] ?? status}
            {message?.trim() ? ` — ${message.trim()}` : ""}
          </p>
        </div>
      </div>

      {!compact && (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-200/70 pt-2 text-xs sm:grid-cols-5">
          <AgeCell label="Current" value={aging.current} />
          <AgeCell label="30 days" value={aging.month2} />
          <AgeCell label="60 days" value={aging.month3} />
          <AgeCell label="90+ days" value={aging.prior} highlight={aging.prior !== 0} />
          <AgeCell label="Total" value={aging.total} strong />
        </dl>
      )}
    </div>
  );
}

function AgeCell({
  label,
  value,
  highlight,
  strong,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`tabular-nums ${
          highlight ? "font-semibold text-red-700" : strong ? "font-semibold text-slate-900" : "text-slate-700"
        }`}
      >
        {money(value)}
      </dd>
    </div>
  );
}
