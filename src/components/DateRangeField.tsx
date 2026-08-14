"use client";

import { useMemo } from "react";

import { Field, Input, Select } from "@/components/ui";

/**
 * A from/to date range with quick presets, for reports and any other date-bounded query.
 *
 * The two native date inputs stay the source of truth — there's no calendar-picker
 * dependency in this project, and a native `<input type="date">` already gets a
 * platform-appropriate picker for free. What this adds is the preset dropdown: reports are
 * overwhelmingly asked for over "this month" or "this quarter" rather than an arbitrary
 * pair of dates, and computing that by hand in two date fields is exactly the kind of
 * friction a reusable control should remove.
 *
 * The preset shown is derived from the current from/to values on every render, not stored
 * as separate state — so typing a date directly into either field naturally falls back to
 * "Custom range" the moment it no longer matches a preset's computed bounds, with nothing
 * to keep in sync.
 */

export interface DateRange {
  from: string;
  to: string;
}

type PresetKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear";

const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  thisMonth: "This month",
  lastMonth: "Last month",
  thisQuarter: "This quarter",
  thisYear: "This year",
};

function isoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function computePreset(key: PresetKey, today: Date): DateRange {
  switch (key) {
    case "today":
      return { from: isoDate(today), to: isoDate(today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: isoDate(y), to: isoDate(y) };
    }
    case "thisWeek": {
      // Monday-to-date, matching how the invoice register reports are normally read
      // ("this week so far"), not a full Mon–Sun window that reaches into the future.
      const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday
      return { from: isoDate(addDays(today, -dayOfWeek)), to: isoDate(today) };
    }
    case "thisMonth":
      return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDate(today) };
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: isoDate(start), to: isoDate(end) };
    }
    case "thisQuarter": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      return {
        from: isoDate(new Date(today.getFullYear(), quarterStartMonth, 1)),
        to: isoDate(today),
      };
    }
    case "thisYear":
      return { from: isoDate(new Date(today.getFullYear(), 0, 1)), to: isoDate(today) };
  }
}

export function DateRangeField({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
}) {
  const today = useMemo(() => new Date(), []);

  const presets = useMemo(
    () =>
      (Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => ({
        key,
        label: PRESET_LABELS[key],
        range: computePreset(key, today),
      })),
    [today],
  );

  const matchedPreset = presets.find(
    (p) => p.range.from === value.from && p.range.to === value.to,
  );

  return (
    <div className="space-y-2">
      <Select
        value={matchedPreset?.key ?? "custom"}
        onChange={(e) => {
          if (e.target.value === "custom") return;
          const preset = presets.find((p) => p.key === e.target.value);
          if (preset) onChange(preset.range);
        }}
      >
        <option value="custom">Custom range</option>
        {presets.map((preset) => (
          <option key={preset.key} value={preset.key}>
            {preset.label}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <Input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
