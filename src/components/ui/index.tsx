"use client";

import clsx from "clsx";
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { ColumnFilterMenu } from "@/components/ColumnFilterMenu";

// ---------------------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-700 text-white hover:bg-sky-800 focus-visible:outline-sky-700 disabled:bg-sky-700/50",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
  danger:
    "bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50 focus-visible:outline-red-500",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("p-4", className)}>{children}</div>;
}

// ---------------------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 flex items-baseline gap-1 text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

const controlClass =
  "block w-full rounded-md border-0 bg-white px-2.5 py-1.5 text-sm text-slate-900 " +
  "ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 " +
  "focus:ring-2 focus:ring-inset focus:ring-sky-600 disabled:bg-slate-50 disabled:text-slate-500";

/**
 * `ref` is declared explicitly rather than forwarded: React 19 passes ref to function
 * components as an ordinary prop, and the despatch screen needs to drive focus between
 * the scan fields.
 */
export function Input({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return <input {...props} ref={ref} className={clsx(controlClass, className)} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(controlClass, "pr-8", className)}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(controlClass, className)} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={clsx("flex items-center gap-2 text-sm text-slate-700", className)}>
      <input
        type="checkbox"
        {...props}
        className="size-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------------------

type BadgeTone = "slate" | "green" | "amber" | "red" | "sky" | "violet";

const badgeTones: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------------------

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

/**
 * `sortDirection` is `null`/`undefined` when this column isn't the active sort key, and
 * `"asc" | "desc"` when it is. Passing `onSort` turns the header into a clickable button
 * with a sort indicator; omit it for plain, non-sortable columns.
 */
/** Options accepted by `Th`'s `filter` prop — spread `colFilter("key")` from `useFilterableTable`. */
type ThFilter = {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

export function Th({
  children,
  align = "left",
  className,
  onSort,
  sortDirection,
  filter,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  onSort?: () => void;
  sortDirection?: "asc" | "desc" | null;
  /** Adds a funnel icon that opens a checkbox popup of the column's distinct values. */
  filter?: ThFilter;
}) {
  const filterMenu = filter && (
    <ColumnFilterMenu
      label={typeof children === "string" ? children : "column"}
      options={filter.options}
      selected={filter.selected}
      onChange={filter.onChange}
    />
  );

  if (!onSort) {
    return (
      <th
        scope="col"
        className={clsx(
          "whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-600",
          align === "right" && "text-right",
          align === "center" && "text-center",
          align === "left" && "text-left",
          className,
        )}
      >
        <span
          className={clsx(
            "inline-flex items-center gap-1",
            align === "right" && "flex-row-reverse",
          )}
        >
          {children}
          {filterMenu}
        </span>
      </th>
    );
  }

  const Icon =
    sortDirection === "asc" ? ChevronUp : sortDirection === "desc" ? ChevronDown : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={
        sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none"
      }
      className={clsx(
        "whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-600",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      <span
        className={clsx("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}
      >
        <button
          type="button"
          onClick={onSort}
          className={clsx(
            "inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
            align === "right" && "flex-row-reverse",
          )}
        >
          {children}
          <Icon
            className={clsx("size-3.5", sortDirection ? "text-slate-700" : "text-slate-400")}
          />
        </button>
        {filterMenu}
      </span>
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={clsx(
        "px-3 py-2 text-slate-700",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" />
      {label ?? "Loading…"}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";

  return (
    <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </div>
  );
}

export function Notice({
  tone = "sky",
  title,
  children,
}: {
  tone?: BadgeTone;
  title?: ReactNode;
  children?: ReactNode;
}) {
  const tones: Record<BadgeTone, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-800",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  };

  return (
    <div className={clsx("rounded-md border px-3 py-2 text-sm", tones[tone])}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={clsx(title && "mt-0.5", "text-xs")}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  description,
  width = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div
        className={clsx(
          "w-full rounded-lg bg-white shadow-xl ring-1 ring-slate-200",
          widths[width],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Label/value pair for read-only detail panels. */
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}
