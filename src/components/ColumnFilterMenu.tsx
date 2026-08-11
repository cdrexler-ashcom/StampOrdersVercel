"use client";

import clsx from "clsx";
import { Filter, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Column header filter popup, opened from the funnel icon `Th` renders when given a
 * `filter` prop. Lists every distinct value present in the column (supplied by the
 * caller, typically `useFilterableTable`) as checkboxes. Ticking a value filters the grid
 * immediately — there's no separate "Apply" step, matching how the sort headers also act
 * on click rather than needing confirmation.
 *
 * The panel is rendered through a portal into `document.body` and positioned with fixed
 * pixel coordinates taken from the trigger button, rather than being an absolutely
 * positioned child of the header cell. `Table` wraps the grid in `overflow-x-auto` for
 * horizontal scrolling on wide grids, and a `position: absolute` popover living inside
 * that wrapper gets clipped by it — it "opens" but its content is cut off, which looks
 * like an empty popup. Portalling out of that DOM subtree avoids the clipping entirely.
 * React still bubbles events from portaled content up through the component tree (not
 * the DOM tree), so the Escape handler below keeps working without extra plumbing.
 */
export function ColumnFilterMenu({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const active = selected.length > 0;

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, left: rect.left });
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // Containment now has to be checked against both the trigger button and the
      // portaled panel separately, since the panel is no longer a DOM descendant of a
      // single wrapping element the way it was before it was portaled out.
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    // capture: true so a scroll happening anywhere (including inside the table's own
    // overflow-x-auto wrapper) still repositions the panel rather than leaving it
    // floating over the wrong cell.
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const visible = useMemo(() => {
    if (!search.trim()) return options;
    const needle = search.trim().toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, search]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  };

  return (
    <div
      className="relative inline-block normal-case"
      // Escape closes just this popover. Without stopPropagation the keydown still
      // bubbles to window, where an ancestor Modal's own Escape handler (see Modal in
      // ui/index.tsx) would also fire and close the whole dialog underneath it. This
      // still works for the portaled panel below since React bubbles portal events
      // through the component tree, not the DOM tree.
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label={`Filter ${label}`}
        aria-expanded={open}
        aria-haspopup="true"
        className={clsx(
          "rounded p-0.5 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400",
          active ? "text-sky-700" : "text-slate-400",
        )}
      >
        <Filter className={clsx("size-3.5", active && "fill-sky-100")} />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 w-56 rounded-md bg-white py-1 text-left text-xs font-normal normal-case text-slate-700 shadow-lg ring-1 ring-slate-200"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {options.length > 8 && (
              <div className="relative px-2 pb-1.5 pt-0.5">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  autoFocus
                  placeholder="Search values…"
                  onChange={(event) => setSearch(event.target.value)}
                  className="block w-full rounded border-0 bg-slate-50 py-1 pl-7 pr-2 text-xs text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 pb-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => onChange(options)}
                className="text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={!active}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
              >
                Clear
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {visible.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-slate-500">No matching values.</p>
              ) : (
                visible.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => toggle(option)}
                      className="size-3.5 shrink-0 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                    />
                    <span className="truncate">{option}</span>
                  </label>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
