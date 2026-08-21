"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemeChoice } from "./ThemeProvider";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * A compact segmented control for Light / Dark / System (feature 1). Icon-only by default to fit
 * the sidebar footer; pass `showLabels` for the wider mobile drawer.
 */
export function ThemeToggle({ showLabels = false }: { showLabels?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex w-full items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={clsx(
              "inline-flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500",
              active
                ? "bg-white font-medium text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
