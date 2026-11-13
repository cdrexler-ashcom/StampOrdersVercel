"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseZap, Download, Pencil, Plus, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { priceList } from "@/lib/endpoints";
import { money } from "@/lib/format";
import type {
  PriceListImportResult,
  PriceListSeedResult,
  ProductPrice,
  ProductPriceRequest,
} from "@/types/api";

/**
 * Price list — product prices kept in the Orders database and maintained from Excel
 * (customer feedback, Nov 2026, meeting items M31–M33; paper item 32).
 *
 * The flow the customer asked for: export the list, edit it in Excel, import the file back. An
 * import is checked first (nothing saved) and shows exactly what would change; it is applied only
 * when the person confirms, and not at all if any row has a problem. Single products can also be
 * edited here directly, for a quick change.
 *
 * Until the API's Pricing:UseSqlPrices switch is on, orders are still priced from Soset, so the
 * page says which it is. A blank price means "not set here": orders use Soset's price for that code.
 */

const CODES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** How many rows to draw at once; the full list is about a thousand products. */
const ROW_LIMIT = 300;

const PROD_ID_MAX = 20;
const DESCRIPTION_MAX = 100;
const PRICE_MAX = 1_000_000;

type PriceKey = `price${(typeof CODES)[number]}`;
const priceKey = (code: (typeof CODES)[number]): PriceKey => `price${code}`;

export default function PriceListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductPrice | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);

  const listQuery = useQuery({ queryKey: ["price-list"], queryFn: () => priceList.list() });
  const statusQuery = useQuery({
    queryKey: ["price-list", "status"],
    queryFn: () => priceList.status(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["price-list"] });

  const exportMutation = useMutation({
    mutationFn: () => priceList.exportCsv(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `price-list-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  const rows = listQuery.data ?? [];
  const term = search.trim().toUpperCase();
  const filtered = useMemo(
    () =>
      term === ""
        ? rows
        : rows.filter(
            (row) =>
              row.prodId.includes(term) || (row.description ?? "").toUpperCase().includes(term),
          ),
    [rows, term],
  );
  const shown = filtered.slice(0, ROW_LIMIT);

  return (
    <>
      <PageHeader
        title="Price list"
        description="Product prices kept in the Orders database. Export to Excel, edit, and import the file back."
        actions={
          <>
            <Button
              variant="secondary"
              loading={exportMutation.isPending}
              disabled={rows.length === 0}
              onClick={() => exportMutation.mutate()}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="size-3.5" />
              Import CSV
            </Button>
            <Button variant="secondary" onClick={() => setSeedOpen(true)}>
              <DatabaseZap className="size-3.5" />
              Copy from Soset
            </Button>
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus className="size-3.5" />
              Add product
            </Button>
          </>
        }
      />

      {statusQuery.data && (
        <div className="mb-4">
          {statusQuery.data.useSqlPrices ? (
            <Notice tone="green" title="Orders are using this price list">
              A price set here is used before Soset&rsquo;s. A blank price falls back to Soset&rsquo;s price
              for that code.
            </Notice>
          ) : (
            <Notice tone="amber" title="Orders are still priced from Soset">
              This list is not used on orders yet. Fill it first (Copy from Soset, or import a file), check
              some prices, then switch it on with the API setting <code>Pricing:UseSqlPrices</code>.
            </Notice>
          )}
        </div>
      )}

      {exportMutation.isError && (
        <div className="mb-4">
          <Notice tone="red" title="The export did not run">
            {(exportMutation.error as Error).message}
          </Notice>
        </div>
      )}

      <Card>
        <CardHeader
          title="Products"
          description={
            listQuery.data
              ? term
                ? `${filtered.length} of ${rows.length} products`
                : `${rows.length} products`
              : undefined
          }
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 size-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or description"
                aria-label="Search the price list"
                className="w-64 pl-8"
              />
            </div>
          }
        />

        {listQuery.isLoading ? (
          <Spinner label="Loading the price list…" />
        ) : listQuery.isError ? (
          <ErrorState error={listQuery.error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="The price list is empty"
            description="Copy the prices Soset holds, or import a file, to fill it."
            action={
              <Button variant="primary" onClick={() => setSeedOpen(true)}>
                <DatabaseZap className="size-3.5" />
                Copy from Soset
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Description</Th>
                  <Th align="right">Cost</Th>
                  {CODES.map((code) => (
                    <Th key={code} align="right">
                      Code {code}
                    </Th>
                  ))}
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={CODES.length + 4} className="px-4 py-8">
                      <EmptyState title="No product matches that search" />
                    </td>
                  </tr>
                ) : (
                  shown.map((row) => (
                    <tr key={row.prodId}>
                      <Td className="font-medium text-slate-900">{row.prodId}</Td>
                      <Td>{row.description ?? "—"}</Td>
                      <Td align="right">{money(row.cost)}</Td>
                      {CODES.map((code) => (
                        <Td key={code} align="right">
                          {money(row[priceKey(code)])}
                        </Td>
                      ))}
                      <Td align="right">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${row.prodId}`}
                          onClick={() => setEditing(row)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
            {filtered.length > shown.length && (
              <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                Showing the first {shown.length} of {filtered.length}. Search to narrow the list.
              </p>
            )}
          </>
        )}
      </Card>

      {editing && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          existingIds={rows.map((row) => row.prodId)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onApplied={refresh}
        />
      )}

      {seedOpen && <SeedDialog onClose={() => setSeedOpen(false)} onApplied={refresh} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------
// One product
// ---------------------------------------------------------------------------------------

interface ProductForm {
  prodId: string;
  description: string;
  cost: string;
  prices: Record<PriceKey, string>;
}

function toForm(product: ProductPrice | null): ProductForm {
  const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
  return {
    prodId: product?.prodId ?? "",
    description: product?.description ?? "",
    cost: text(product?.cost),
    prices: Object.fromEntries(CODES.map((code) => [priceKey(code), text(product?.[priceKey(code)])])) as Record<
      PriceKey,
      string
    >,
  };
}

/** A blank is "no price" (null). Otherwise a number, or NaN so validation can say so. */
function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return Number(trimmed);
}

function priceProblem(label: string, value: string): string | null {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  if (Number.isNaN(parsed)) return `${label} is not a number.`;
  if (parsed < 0) return `${label} cannot be negative.`;
  if (parsed > PRICE_MAX) return `${label} is over ${PRICE_MAX.toLocaleString()}. Check the decimal point.`;
  if (Math.abs(parsed * 10000 - Math.round(parsed * 10000)) > 1e-6) return `${label} has more than 4 decimal places.`;
  return null;
}

function validate(form: ProductForm, isNew: boolean, existingIds: string[]): string[] {
  const problems: string[] = [];
  const id = form.prodId.trim().toUpperCase();

  if (!id) problems.push("A product code is required.");
  if (id.length > PROD_ID_MAX) problems.push(`The product code is longer than ${PROD_ID_MAX} characters.`);
  if (isNew && id && existingIds.includes(id)) problems.push(`${id} is already in the price list. Edit it instead.`);
  if (form.description.trim().length > DESCRIPTION_MAX) {
    problems.push(`The description is longer than ${DESCRIPTION_MAX} characters.`);
  }

  const cost = priceProblem("Cost", form.cost);
  if (cost) problems.push(cost);
  for (const code of CODES) {
    const problem = priceProblem(`Code ${code}`, form.prices[priceKey(code)]);
    if (problem) problems.push(problem);
  }
  return problems;
}

function ProductDialog({
  product,
  existingIds,
  onClose,
  onSaved,
}: {
  /** Null to add a new product. */
  product: ProductPrice | null;
  existingIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = product === null;
  const [form, setForm] = useState<ProductForm>(() => toForm(product));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const problems = validate(form, isNew, existingIds);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        description: form.description.trim() || null,
        cost: toNumber(form.cost),
        ...Object.fromEntries(CODES.map((code) => [priceKey(code), toNumber(form.prices[priceKey(code)])])),
      } as ProductPriceRequest;
      return priceList.save(form.prodId.trim().toUpperCase(), body);
    },
    onSuccess: onSaved,
  });

  const deleteMutation = useMutation({
    mutationFn: () => priceList.remove(product!.prodId),
    onSuccess: onSaved,
  });

  const busy = saveMutation.isPending || deleteMutation.isPending;
  const save = () => {
    if (problems.length === 0 && !busy) saveMutation.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="lg"
      title={isNew ? "Add product" : `Edit ${product.prodId}`}
      description="Leave a price blank to have orders use Soset's price for that code."
      footer={
        <>
          {!isNew && (
            <Button
              variant={confirmDelete ? "danger" : "secondary"}
              className="mr-auto"
              disabled={busy}
              loading={deleteMutation.isPending}
              onClick={() => (confirmDelete ? deleteMutation.mutate() : setConfirmDelete(true))}
            >
              {confirmDelete ? "Click again to remove" : "Remove from list"}
            </Button>
          )}
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={saveMutation.isPending} disabled={problems.length > 0 || busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        {(saveMutation.isError || deleteMutation.isError) && (
          <Notice tone="red" title="Not saved">
            {((saveMutation.error ?? deleteMutation.error) as Error).message}
          </Notice>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Product code" required>
            <Input
              value={form.prodId}
              maxLength={PROD_ID_MAX}
              disabled={!isNew}
              autoFocus={isNew}
              onChange={(e) => setForm({ ...form, prodId: e.target.value })}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input
              value={form.description}
              maxLength={DESCRIPTION_MAX}
              autoFocus={!isNew}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="Cost" hint="Not used to price an order.">
            <Input
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Field>
          {CODES.map((code) => (
            <Field key={code} label={`Code ${code}`}>
              <Input
                inputMode="decimal"
                value={form.prices[priceKey(code)]}
                onChange={(e) =>
                  setForm({ ...form, prices: { ...form.prices, [priceKey(code)]: e.target.value } })
                }
              />
            </Field>
          ))}
        </div>

        {problems.length > 0 && (
          <ul className="space-y-0.5 text-xs text-slate-500">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------------------

function ImportDialog({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Checking and applying read the same file; only the second saves.
  const checkMutation = useMutation({
    mutationFn: (selected: File) => priceList.importCsv(selected, false),
  });
  const applyMutation = useMutation({
    mutationFn: (selected: File) => priceList.importCsv(selected, true),
    onSuccess: onApplied,
  });

  const checked = checkMutation.data;
  const applied = applyMutation.data?.applied ? applyMutation.data : null;
  const result: PriceListImportResult | undefined = applied ?? applyMutation.data ?? checked;

  const canApply =
    !!file && !!checked && checked.errors.length === 0 && checked.added + checked.updated > 0 && !applied;

  const choose = (selected: File | null) => {
    setFile(selected);
    checkMutation.reset();
    applyMutation.reset();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="xl"
      title="Import a price list"
      description="Choose the CSV you edited. It is checked first; nothing is saved until you apply it."
      footer={
        <>
          <Button onClick={onClose} disabled={applyMutation.isPending}>
            {applied ? "Close" : "Cancel"}
          </Button>
          {!applied && (
            <>
              <Button
                loading={checkMutation.isPending}
                disabled={!file || applyMutation.isPending}
                onClick={() => file && checkMutation.mutate(file)}
              >
                Check file
              </Button>
              <Button
                variant="primary"
                loading={applyMutation.isPending}
                disabled={!canApply}
                onClick={() => file && applyMutation.mutate(file)}
              >
                Apply changes
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="CSV file"
          hint="Columns: Prod ID, Product Description, Cost, Code 1 to Code 9. A column that is missing is left alone; a blank cell in a column that is there clears that price. Products are never deleted."
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </Field>

        {(checkMutation.isError || applyMutation.isError) && (
          <Notice tone="red" title="The import did not run">
            {((applyMutation.error ?? checkMutation.error) as Error).message}
          </Notice>
        )}

        {applied && (
          <Notice tone="green" title="Prices imported">
            {applied.added} added, {applied.updated} updated, {applied.unchanged} unchanged.
          </Notice>
        )}

        {result && !applied && <ImportSummary result={result} />}
      </div>
    </Modal>
  );
}

function ImportSummary({ result }: { result: PriceListImportResult }) {
  const hasErrors = result.errors.length > 0;

  return (
    <div className="space-y-3">
      {hasErrors ? (
        <Notice tone="red" title="The file has problems, so nothing can be imported yet">
          Fix these in the file and check it again.
        </Notice>
      ) : result.added + result.updated === 0 ? (
        <Notice tone="slate" title="Nothing would change">
          Every product in the file already has these prices ({result.unchanged} unchanged).
        </Notice>
      ) : (
        <Notice tone="sky" title="Ready to apply">
          Nothing is saved yet. This is what applying the file would do.
        </Notice>
      )}

      {!hasErrors && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="green">{result.added} to add</Badge>
          <Badge tone="sky">{result.updated} to update</Badge>
          <Badge>{result.unchanged} unchanged</Badge>
          {result.pricesCleared > 0 && (
            <Badge tone="amber">{result.pricesCleared} price(s) will be cleared</Badge>
          )}
        </div>
      )}

      {result.errors.length > 0 && <IssueList tone="red" title="Errors" issues={result.errors} />}
      {result.warnings.length > 0 && <IssueList tone="amber" title="Warnings" issues={result.warnings} />}

      {!hasErrors && result.changes.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-700">Changes</p>
          <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>What</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.changes.map((change) => (
                  <tr key={change.prodId}>
                    <Td className="font-medium text-slate-900">{change.prodId}</Td>
                    <Td>
                      <Badge tone={change.kind === "Added" ? "green" : "sky"}>{change.kind}</Badge>
                    </Td>
                    <Td className="text-xs">{change.details.join("; ") || "New product, no prices"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {result.changesTruncated && (
            <p className="mt-1 text-xs text-slate-500">
              Only the first {result.changes.length} changes are listed. The counts above cover them all.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function IssueList({
  tone,
  title,
  issues,
}: {
  tone: "red" | "amber";
  title: string;
  issues: PriceListImportResult["errors"];
}) {
  const shown = issues.slice(0, 50);
  return (
    <Notice tone={tone} title={`${title} (${issues.length})`}>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
        {shown.map((issue, index) => (
          <li key={index}>
            {issue.line > 0 && <span className="font-medium">Line {issue.line}</span>}
            {issue.prodId && <span> ({issue.prodId})</span>}
            {issue.line > 0 || issue.prodId ? ": " : ""}
            {issue.message}
          </li>
        ))}
      </ul>
      {issues.length > shown.length && (
        <p className="mt-1 text-xs">…and {issues.length - shown.length} more.</p>
      )}
    </Notice>
  );
}

// ---------------------------------------------------------------------------------------
// Copy from Soset
// ---------------------------------------------------------------------------------------

function SeedDialog({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  // Opening the dialog counts what would be copied; nothing is saved until Copy is pressed.
  const check = useQuery({
    queryKey: ["price-list-seed-preview"],
    queryFn: () => priceList.seedFromSoset(false),
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const apply = useMutation({
    mutationFn: () => priceList.seedFromSoset(true),
    onSuccess: onApplied,
  });

  const preview: PriceListSeedResult | undefined = check.data;
  const done = apply.data?.applied ? apply.data : null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Copy prices from Soset"
      description="A one-off copy of the prices Soset holds, to start the list from."
      footer={
        <>
          <Button onClick={onClose} disabled={apply.isPending}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && (
            <Button
              variant="primary"
              loading={apply.isPending}
              disabled={!preview || preview.added === 0 || check.isFetching}
              onClick={() => apply.mutate()}
            >
              Copy {preview?.added ?? 0} products
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        {(check.isError || apply.isError) && (
          <Notice tone="red" title="The copy did not run">
            {((apply.error ?? check.error) as Error).message}
          </Notice>
        )}

        {check.isLoading && <Spinner label="Reading Soset…" />}

        {done && (
          <Notice tone="green" title="Prices copied">
            {done.added} products were added to the price list.
          </Notice>
        )}

        {preview && !done && (
          <>
            <p>
              Soset has <strong>{preview.sosetProducts}</strong> products.{" "}
              <strong>{preview.added}</strong> are not in the price list yet and would be added.{" "}
              {preview.alreadyInList > 0 && (
                <>
                  <strong>{preview.alreadyInList}</strong> are already in the list and are left exactly as
                  they are.{" "}
                </>
              )}
              {preview.skipped > 0 && <>{preview.skipped} were skipped.</>}
            </p>
            <p className="text-xs text-slate-500">
              Price codes 1 to 5 come from Soset&rsquo;s unit prices 1 to 5, and codes 6 to 9 from its Cat 1 to
              Cat 4. Running this again never overwrites a price you have edited.
            </p>
            {preview.warnings.length > 0 && (
              <Notice tone="amber" title={`Warnings (${preview.warnings.length})`}>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {preview.warnings.slice(0, 20).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </Notice>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
