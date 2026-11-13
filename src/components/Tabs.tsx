"use client";

import { useRef } from "react";

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
}

/**
 * A row of tabs. Arrow keys, Home and End move between them (the tab strip is one tab stop, as
 * the ARIA tabs pattern asks), so the customer screen stays usable without a mouse.
 *
 * This only draws the strip; the caller shows the panel for the active tab and gives it
 * `role="tabpanel"` with `id={tabPanelId(id)}`.
 */
export function Tabs<Id extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabItem<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-4 flex flex-wrap gap-1 border-b border-slate-200"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                move(index + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                move(index - 1);
              } else if (e.key === "Home") {
                e.preventDefault();
                move(0);
              } else if (e.key === "End") {
                e.preventDefault();
                move(tabs.length - 1);
              }
            }}
            className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium ${
              selected
                ? "border-sky-700 text-sky-800"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export const tabPanelId = (id: string) => `tabpanel-${id}`;
