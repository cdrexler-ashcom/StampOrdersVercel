"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { CustomerPicker } from "@/components/CustomerPicker";
import { ProductPicker } from "@/components/ProductPicker";
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
import { customers as customersApi, pricing } from "@/lib/endpoints";
import { money, text } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useSortableTable } from "@/lib/useSortableTable";
import type { Customer, PricingRuleRequest, PricingRuleResult, SosetProduct } from "@/types/api";

/**
 * Pricing rule maintenance — replaces Pricing.frm / PriceList.frm.
 *
 * A rule is one of two shapes, and the API enforces the distinction rather than leaving it
 * implicit the way the legacy form did:
 *  - All-customers — one price, carried on the rule itself, no customer lines.
 *  - Customer-specific — no price on the rule; each customer has their own line.
 *
 * That AllCustomers flag decides where the price lives, so it's the first thing asked when
 * creating a rule and it's shown as a badge everywhere a rule appears in the list — getting
 * it wrong isn't a validation error at the edges, it changes the whole shape of the rule.
 *
 * The product code is treated as immutable once a rule is saved, even though the API's
 * PricingRuleRequest technically allows changing it on update: repointing a live pricing
 * rule at a different product is the kind of edit that wants "delete and recreate", not a
 * button that's one click away in an edit form.
 */

/** Width of the nvarchar(12) ProdId column, from PricingMaintenanceService.NormaliseProduct. */
const PROD_ID_MAX = 12;

interface LineDraft {
  accountNo: string;
  price: string;
  /** Present for a line seeded from an existing rule; used only to look up the name. */
  custId?: number;
  /** Known immediately for a line just added via the picker; undefined for a seeded line. */
  title?: string | null;
}

interface FormState {
  prodId: string;
  allCustomers: boolean;
  price: string;
  lines: LineDraft[];
}

const emptyForm: FormState = { prodId: "", allCustomers: true, price: "", lines: [] };

function toForm(rule: PricingRuleResult): FormState {
  return {
    prodId: rule.prodId ?? "",
    allCustomers: rule.allCustomers,
    price: rule.price?.toString() ?? "",
    lines: rule.lines.map((line) => ({
      accountNo: line.customerAccountNo,
      price: line.price.toString(),
      custId: line.custId,
    })),
  };
}

function toRequest(form: FormState): PricingRuleRequest {
  return {
    prodId: form.prodId.trim(),
    allCustomers: form.allCustomers,
    price: form.allCustomers ? Number(form.price) : null,
    lines: form.allCustomers
      ? null
      : form.lines.map((line) => ({
          customerAccountNo: line.accountNo,
          price: Number(line.price),
        })),
  };
}

/** Client-side mirror of PricingMaintenanceService.ValidateShapeAsync, for early feedback. */
function validate(form: FormState): string[] {
  const problems: string[] = [];

  if (!form.prodId.trim()) problems.push("A product code is required.");
  if (form.prodId.trim().length > PROD_ID_MAX) {
    problems.push(`Product code is longer than ${PROD_ID_MAX} characters.`);
  }

  if (form.allCustomers) {
    if (form.price.trim() === "" || Number.isNaN(Number(form.price))) {
      problems.push("An all-customers rule requires a price.");
    }
  } else if (form.lines.length === 0) {
    problems.push("A customer-specific rule requires at least one customer line.");
  }

  return problems;
}

export default function PricingPage() {
  const queryClient = useQueryClient();

  /** null = closed, "" = creating, otherwise the rule id being edited. */
  const [editingId, setEditingId] = useState<number | "" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<PricingRuleResult | null>(null);

  // The picker + price used to stage a new line before it's added to form.lines.
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [pickedPrice, setPickedPrice] = useState("");

  const isCreating = editingId === "";

  const query = useQuery({
    queryKey: ["pricing"],
    queryFn: () => pricing.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pricing"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      isCreating ? pricing.create(toRequest(form)) : pricing.update(editingId as number, toRequest(form)),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pricing.remove(id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  // Sorted and filtered client-side: GET /api/pricing has no Take() when prodId is omitted,
  // it returns every rule, so narrowing the fetched rows in the browser sees the full set.
  const { sorted, th } = useSortableTable(
    query.data,
    {
      prodId: (r) => r.prodId,
      allCustomers: (r) => (r.allCustomers ? 1 : 0),
    },
    "prodId",
  );

  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(sorted, {
    prodId: (r: PricingRuleResult) => r.prodId?.trim() ?? "",
  });

  const all = query.data ?? [];

  const startCreate = () => {
    saveMutation.reset();
    setForm(emptyForm);
    setPickedCustomer(null);
    setPickedPrice("");
    setEditingId("");
  };

  const startEdit = (rule: PricingRuleResult) => {
    saveMutation.reset();
    setForm(toForm(rule));
    setPickedCustomer(null);
    setPickedPrice("");
    setEditingId(rule.id);
  };

  const closeModal = () => {
    setEditingId(null);
    saveMutation.reset();
  };

  const addLine = () => {
    if (!pickedCustomer || pickedPrice.trim() === "") return;

    const account = pickedCustomer.accountNo?.trim() ?? "";
    if (!account) return;

    // Mirrors the server's duplicate-account guard, so the operator sees this before
    // submitting rather than getting it back as a 400.
    const alreadyOnRule = form.lines.some(
      (line) => line.accountNo.trim().toLowerCase() === account.toLowerCase(),
    );
    if (alreadyOnRule) return;

    setForm((current) => ({
      ...current,
      lines: [
        ...current.lines,
        { accountNo: account, price: pickedPrice, title: pickedCustomer.title },
      ],
    }));
    setPickedCustomer(null);
    setPickedPrice("");
  };

  const removeLine = (accountNo: string) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.accountNo !== accountNo),
    }));
  };

  const setLinePrice = (accountNo: string, price: string) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.accountNo === accountNo ? { ...line, price } : line,
      ),
    }));
  };

  const duplicatePicked =
    pickedCustomer &&
    form.lines.some(
      (line) =>
        line.accountNo.trim().toLowerCase() === (pickedCustomer.accountNo ?? "").trim().toLowerCase(),
    );

  const problems = validate(form);

  return (
    <>
      <PageHeader
        title="Pricing rules"
        description="Product prices, either for every customer or per customer."
      />

      <Card>
        <CardHeader
          title="Rules"
          description={`${all.length} rule${all.length === 1 ? "" : "s"}`}
          actions={
            <>
              {isFiltered && (
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  Clear column filters
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={startCreate}>
                <Plus className="size-3.5" />
                Add rule
              </Button>
            </>
          }
        />

        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : all.length === 0 ? (
          <EmptyState
            title="No pricing rules set up"
            description="Products without a rule use their Soset unit price at order entry."
            action={
              <Button size="sm" variant="primary" onClick={startCreate}>
                <Plus className="size-3.5" />
                Add rule
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("prodId")} filter={colFilter("prodId")}>
                  Product
                </Th>
                <Th {...th("allCustomers")}>Type</Th>
                <Th align="right">Price / lines</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8">
                    <EmptyState
                      title="No rules match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered?.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-medium text-slate-900">{text(rule.prodId)}</span>
                    </Td>
                    <Td>
                      <Badge tone={rule.allCustomers ? "sky" : "violet"}>
                        {rule.allCustomers ? "All customers" : "Customer-specific"}
                      </Badge>
                    </Td>
                    <Td align="right">
                      {rule.allCustomers
                        ? money(rule.price)
                        : `${rule.lines.length} line${rule.lines.length === 1 ? "" : "s"}`}
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Edit rule"
                          onClick={() => startEdit(rule)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete rule"
                          onClick={() => setDeleting(rule)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={editingId !== null}
        onClose={closeModal}
        width="xl"
        title={isCreating ? "Add pricing rule" : `Edit rule — ${form.prodId}`}
        description="All-customers rules carry one price. Customer-specific rules carry one price per customer."
        footer={
          <>
            <Button onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              disabled={problems.length > 0}
              onClick={() => saveMutation.mutate()}
            >
              {isCreating ? "Create rule" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {saveMutation.isError && (
            <Notice tone="red" title="Rule was not saved">
              {(saveMutation.error as Error).message}
            </Notice>
          )}

          <Field label="Product" required>
            {isCreating ? (
              <ProductPicker
                value={form.prodId ? ({ prodId: form.prodId, prodName: null } as SosetProduct) : null}
                onChange={(product) =>
                  setForm((current) => ({ ...current, prodId: product?.prodId ?? "" }))
                }
                autoFocus
              />
            ) : (
              <Input value={form.prodId} disabled />
            )}
            {!isCreating && (
              <p className="mt-1 text-xs text-slate-500">
                The product a rule applies to can&apos;t be changed here — delete this rule and
                create a new one on the right product instead.
              </p>
            )}
          </Field>

          <div className="rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-medium text-slate-700">Rule type</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="allCustomers"
                  checked={form.allCustomers}
                  onChange={() => setForm((current) => ({ ...current, allCustomers: true }))}
                  className="size-4 border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                All customers — one price
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="allCustomers"
                  checked={!form.allCustomers}
                  onChange={() => setForm((current) => ({ ...current, allCustomers: false }))}
                  className="size-4 border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                Customer-specific — one price per customer
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Switching this discards whatever was entered on the other side — a rule is one
              shape or the other, never both.
            </p>
          </div>

          {form.allCustomers ? (
            <Field label="Price" required hint="Applies to every customer buying this product.">
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))}
                className="max-w-40"
              />
            </Field>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-700">Customer lines</p>

              {form.lines.length === 0 ? (
                <p className="text-sm text-slate-500">No customer lines added yet.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Customer</Th>
                      <Th align="right">Price</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.lines.map((line) => (
                      <tr key={line.accountNo}>
                        <Td>
                          <PricingLineCustomer line={line} />
                        </Td>
                        <Td align="right">
                          <Input
                            type="number"
                            step="0.01"
                            value={line.price}
                            onChange={(e) => setLinePrice(line.accountNo, e.target.value)}
                            className="w-28 text-right"
                          />
                        </Td>
                        <Td align="right">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Remove line"
                            onClick={() => removeLine(line.accountNo)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <div className="flex items-end gap-2 rounded-md border border-slate-200 p-3">
                <Field label="Add customer" className="flex-1">
                  <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} />
                  {duplicatePicked && (
                    <span className="mt-1 block text-xs text-red-600">
                      Already on this rule.
                    </span>
                  )}
                </Field>
                <Field label="Price" className="w-28">
                  <Input
                    type="number"
                    step="0.01"
                    value={pickedPrice}
                    onChange={(e) => setPickedPrice(e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  onClick={addLine}
                  disabled={!pickedCustomer || !pickedPrice.trim() || Boolean(duplicatePicked)}
                >
                  Add line
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete rule for ${deleting.prodId}?` : "Delete rule"}
        description="Orders for this product fall back to the Soset unit price."
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Delete rule
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Notice tone="red" title="Rule was not deleted">
            {(deleteMutation.error as Error).message}
          </Notice>
        ) : (
          <p className="text-sm text-slate-600">
            {deleting?.allCustomers
              ? "The all-customers price is removed."
              : `All ${deleting?.lines.length ?? 0} customer line(s) on this rule are removed.`}
          </p>
        )}
      </Modal>
    </>
  );
}

/**
 * Shows a customer line's account number, with the name alongside once known. A line just
 * added via the picker already has the title; a line seeded from an existing rule only has
 * the account number and custId, so it's looked up once here.
 */
function PricingLineCustomer({ line }: { line: LineDraft }) {
  const needsLookup = line.title === undefined && line.custId !== undefined;

  const query = useQuery({
    queryKey: ["customer", line.custId],
    queryFn: () => customersApi.get(line.custId as number),
    enabled: needsLookup,
  });

  const title = needsLookup ? query.data?.title : line.title;

  return (
    <span>
      <span className="font-medium text-slate-900">{line.accountNo}</span>
      {title?.trim() && <span className="text-slate-500"> — {title}</span>}
    </span>
  );
}
