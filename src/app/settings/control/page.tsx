"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Input,
  Notice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { settings } from "@/lib/endpoints";
import type { ControlSettings } from "@/types/api";

/**
 * System control — the port of the legacy `Ctrl.frm` ("Control Information") screen.
 *
 * These are the operator-maintained columns of the single Control row, exposed through the
 * narrow `/api/settings/control` route. Two things on the legacy form are deliberately absent:
 *
 *  * the document number sequences (Next Sales Invoice/Credit, Next Receipt, Next Deposit,
 *    Next Delivery Job No) — the API does not expose them so a screen cannot move one by
 *    accident; they advance only as documents are raised;
 *  * the SMTP password — it never leaves the server and is changed in the database directly.
 *
 * Every field is replace-semantics: clearing a box and saving clears the stored value.
 */

/** The columns that are numbers rather than text. */
const NUMERIC_KEYS = new Set<keyof ControlSettings>([
  "freightAmt",
  "gstTaxCode",
  "gstRate",
  "smtpPort",
]);

type FormState = Record<keyof ControlSettings, string>;

const FIELD_KEYS = [
  "prodAcct",
  "freightProd",
  "freightAcct",
  "freightAmt",
  "freightChargeCode",
  "freightDesc",
  "gstTaxCode",
  "gstRate",
  "defImportCust",
  "bankName",
  "bankBsb",
  "bankAcct",
  "smtpSrvr",
  "smtpPort",
  "smtpUserName",
  "emailFrom",
  "emailBcc",
  "sosetDir",
  "stampImageDir",
  "proofDir",
  "proofImageDir",
  "statDir",
] as const satisfies readonly (keyof ControlSettings)[];

const EMPTY_FORM: FormState = Object.fromEntries(
  FIELD_KEYS.map((key) => [key, ""]),
) as FormState;

function toForm(data: ControlSettings): FormState {
  const next = { ...EMPTY_FORM };
  for (const key of FIELD_KEYS) {
    const value = data[key];
    next[key] = value === null || value === undefined ? "" : String(value);
  }
  return next;
}

function toBody(form: FormState): ControlSettings {
  const body: Record<string, string | number | null> = {};
  for (const key of FIELD_KEYS) {
    const raw = form[key].trim();
    if (NUMERIC_KEYS.has(key)) {
      const parsed = raw === "" ? null : Number(raw);
      body[key] = parsed === null || Number.isNaN(parsed) ? null : parsed;
    } else {
      body[key] = raw === "" ? null : raw;
    }
  }
  return body as unknown as ControlSettings;
}

type FieldSpec = {
  key: keyof ControlSettings;
  label: string;
  hint?: string;
  numeric?: boolean;
  wide?: boolean;
  /**
   * The API stores this column but no application code reads it back yet (accounting /
   * consignment exports not yet ported; the directory paths are now resolved from server
   * configuration instead). Shown greyed with a "Not currently used" badge so operators
   * don't expect it to do anything.
   *
   * TODO: hard-coded per the API's ControlSettings `[STORED ONLY]` markers. Drop this and
   * drive it off field metadata once `/api/settings/control` exposes per-field status.
   */
  inactive?: boolean;
};

/** Shared explanation shown under every inactive field. */
const INACTIVE_HINT =
  "Saved to the Control record, but nothing reads it yet. Safe to leave blank.";

type Group = { title: string; description: string; fields: FieldSpec[] };

const GROUPS: Group[] = [
  {
    title: "Freight & GL",
    description: "Accounts and product codes freight and sales lines post to.",
    fields: [
      { key: "prodAcct", label: "Product GL account", inactive: true },
      { key: "freightProd", label: "Freight product code" },
      { key: "freightAcct", label: "Freight GL account", inactive: true },
      { key: "freightAmt", label: "Freight amount", numeric: true },
      { key: "freightChargeCode", label: "eParcel charge code", inactive: true },
      {
        key: "freightDesc",
        label: "eParcel freight description",
        wide: true,
        inactive: true,
      },
    ],
  },
  {
    title: "GST",
    description: "Applied to every non-exempt order line.",
    fields: [
      {
        key: "gstTaxCode",
        label: "GST tax code",
        numeric: true,
        hint: "A numeric code from the accounting system.",
        inactive: true,
      },
      {
        key: "gstRate",
        label: "GST rate (%)",
        numeric: true,
        hint: "A percentage, e.g. 10. Rejected outside 0–100.",
      },
    ],
  },
  {
    title: "Web order import",
    description: "Defaults used when importing web-storefront orders.",
    fields: [{ key: "defImportCust", label: "Default import customer code" }],
  },
  {
    title: "Banking",
    description:
      "Legacy remittance fields. The bank details printed on statements and invoices now come from each invoice's own record, not from here.",
    fields: [
      { key: "bankName", label: "Bank account name", inactive: true },
      { key: "bankBsb", label: "BSB", inactive: true },
      { key: "bankAcct", label: "Account number", inactive: true },
    ],
  },
  {
    title: "Email",
    description:
      "Outgoing mail settings for emailed invoices and notifications. The SMTP password is set on the server, not here.",
    fields: [
      { key: "smtpSrvr", label: "SMTP server", wide: true },
      { key: "smtpPort", label: "SMTP port", numeric: true },
      { key: "smtpUserName", label: "SMTP username", wide: true },
      { key: "emailFrom", label: "From address", wide: true },
      { key: "emailBcc", label: "BCC address", wide: true },
    ],
  },
  {
    title: "Directories",
    description:
      "Legacy network paths. The application now resolves these from server configuration (Soset:DataPath, Proof:ImageDir), so edits here have no effect.",
    fields: [
      {
        key: "sosetDir",
        label: "Sybiz Vision (Soset) directory",
        wide: true,
        inactive: true,
      },
      {
        key: "stampImageDir",
        label: "Stamp image directory",
        wide: true,
        inactive: true,
      },
      { key: "proofDir", label: "Proof directory", wide: true, inactive: true },
      {
        key: "proofImageDir",
        label: "Proof image directory",
        wide: true,
        inactive: true,
      },
      {
        key: "statDir",
        label: "Statement directory",
        wide: true,
        inactive: true,
      },
    ],
  },
];

export default function SystemControlPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  /** What the server last confirmed, so Save can tell edited from untouched. */
  const [saved, setSaved] = useState<FormState | null>(null);

  const query = useQuery({
    queryKey: ["settings", "control"],
    queryFn: () => settings.control(),
  });

  useEffect(() => {
    if (!query.data) return;
    const next = toForm(query.data);
    setForm(next);
    setSaved(next);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () => settings.updateControl(toBody(form)),
    onSuccess: (result) => {
      const next = toForm(result);
      setForm(next);
      setSaved(next);
      queryClient.setQueryData(["settings", "control"], result);
    },
  });

  const isDirty = useMemo(() => {
    if (!saved) return false;
    return FIELD_KEYS.some((key) => form[key].trim() !== saved[key].trim());
  }, [form, saved]);

  const set = (key: keyof ControlSettings, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const revert = () => {
    if (saved) setForm(saved);
    saveMutation.reset();
  };

  return (
    <>
      <PageHeader
        title="System control"
        description="System-wide configuration, backed by the single Control record."
      />

      {query.isLoading ? (
        <Card>
          <Spinner />
        </Card>
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Control information"
              description="Number sequences and the SMTP password are maintained elsewhere and are not shown here."
              actions={
                <>
                  <Button
                    size="sm"
                    onClick={revert}
                    disabled={!isDirty || saveMutation.isPending}
                  >
                    Revert
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={saveMutation.isPending}
                    disabled={!isDirty}
                    onClick={() => saveMutation.mutate()}
                  >
                    Save changes
                  </Button>
                </>
              }
            />
            <CardBody className="space-y-3">
              {saveMutation.isError && (
                <Notice tone="red" title="Changes were not saved">
                  {(saveMutation.error as Error).message}
                </Notice>
              )}
              {saveMutation.isSuccess && !isDirty && (
                <Notice tone="green" title="Changes saved" />
              )}
              <p className="text-xs text-slate-500">
                Clearing a box and saving clears the stored value.
              </p>
            </CardBody>
          </Card>

          {GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader title={group.title} description={group.description} />
              <CardBody>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {group.fields.map((spec) => (
                    <Field
                      key={spec.key}
                      label={spec.label}
                      hint={
                        spec.inactive ? (
                          <span className="flex flex-wrap items-center gap-1">
                            <Badge tone="amber">Not currently used</Badge>
                            <span>{spec.hint ?? INACTIVE_HINT}</span>
                          </span>
                        ) : (
                          spec.hint
                        )
                      }
                      className={[
                        spec.wide ? "sm:col-span-2" : "",
                        spec.inactive ? "opacity-60" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                    >
                      <Input
                        value={form[spec.key]}
                        type={spec.numeric ? "number" : "text"}
                        inputMode={spec.numeric ? "decimal" : undefined}
                        step={spec.numeric ? "any" : undefined}
                        min={spec.numeric ? "0" : undefined}
                        onChange={(event) => set(spec.key, event.target.value)}
                      />
                    </Field>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
