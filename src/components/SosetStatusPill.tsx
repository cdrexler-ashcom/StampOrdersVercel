"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleCheck, CircleSlash } from "lucide-react";
import Link from "next/link";

import { soset } from "@/lib/endpoints";

/**
 * Soset is the least observable part of the system, and "the stamp job did not appear"
 * is the recurring support question. Surfacing write mode and reachability permanently
 * means the answer is already on screen.
 */
export function SosetStatusPill() {
  const { data, isError } = useQuery({
    queryKey: ["soset", "status"],
    queryFn: () => soset.status(),
    refetchInterval: 60_000,
  });

  if (isError) {
    return (
      <Link
        href="/system"
        className="flex items-center gap-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 ring-1 ring-inset ring-red-200"
      >
        <AlertTriangle className="size-3.5 shrink-0" />
        Soset unreachable
      </Link>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
        Checking Soset…
      </div>
    );
  }

  const writesDisabled = data.writeMode === "Disabled";
  const pathMissing = !data.dataPathExists;

  const tone = pathMissing
    ? "bg-red-50 text-red-800 ring-red-200"
    : writesDisabled
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : "bg-green-50 text-green-800 ring-green-200";

  const Icon = pathMissing ? AlertTriangle : writesDisabled ? CircleSlash : CircleCheck;

  const label = pathMissing
    ? "Soset path missing"
    : writesDisabled
      ? "Soset writes disabled"
      : "Soset writes enabled";

  return (
    <Link
      href="/system"
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ring-1 ring-inset ${tone}`}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Link>
  );
}
