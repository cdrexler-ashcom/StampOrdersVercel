"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
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
import { invoiceStates as statesApi } from "@/lib/endpoints";
import { text } from "@/lib/format";
import { useSortableTable } from "@/lib/useSortableTable";
import type { CreateInvoiceStateRequest, StateInvoice } from "@/types/api";

/**
 * Invoice states maintenance — replaces InvoiceStates.frm and frmEditInvoiceState.frm.
 *
 * The two legacy forms were a list and an edit dialog; they are one page here, with the
 * dialog kept as a modal because thirteen fields don't fit an inline row.
 *
 * A state invoicing entity is the letterhead and bank block an invoice prints under.
 * Customers select one through their InvoiceComp field, as loose text with no foreign key,
 * which is why the State key is immutable and why deleting one that customers still point
 * at is refused by the API.
 *
 * Widths are load-bearing. State code is three characters and postcode four — narrow enough
 * that SQL Server would truncate a typo silently — so the inputs cap at the column width and
 * the API validates again on the way in.
 */

const MAX = {
  state: 20,
  name: 40,
  address: 40,
  suburb: 30,
  stateCode: 3,
  postCode: 4,
  letterHead: 100,
  bank: 50,
  emailFrom: 50,
} as const;

type FormState = {
  state: string;
  name: string;
  address1: string;
  address2: string;
  address3: string;
  suburb: string;
  stateCode: string;
  postCode: string;
  letterHead: string;
  printBankDetails: boolean;
  bankName: string;
  bankBsb: string;
  bankAcct: string;
  emailFrom: string;
};

const emptyForm: FormState = {
  state: "",
  name: "",
  address1: "",
  address2: "",
  address3: "",
  suburb: "",
  stateCode: "",
  postCode: "",
  letterHead: "",
  printBankDetails: false,
  bankName: "",
  bankBsb: "",
  bankAcct: "",
  emailFrom: "",
};

function toForm(entity: StateInvoice): FormState {
  return {
    state: entity.state ?? "",
    name: entity.name ?? "",
    address1: entity.address1 ?? "",
    address2: entity.address2 ?? "",
    address3: entity.address3 ?? "",
    suburb: entity.suburb ?? "",
    stateCode: entity.stateCode ?? "",
    postCode: entity.postCode ?? "",
    // The column is Letterhead but the property is LetterHead, so the JSON field is
    // letterHead — see StateInvoiceConfiguration.
    letterHead: entity.letterHead ?? "",
    printBankDetails: entity.printBankDetails,
    bankName: entity.bankName ?? "",
    bankBsb: entity.bankBsb ?? "",
    bankAcct: entity.bankAcct ?? "",
    emailFrom: entity.emailFrom ?? "",
  };
}

/** Blank becomes null so a cleared field and an untouched-empty field store the same value. */
const orNull = (value: string) => value.trim() || null;

function toRequest(form: FormState): Omit<CreateInvoiceStateRequest, "state"> {
  return {
    name: orNull(form.name),
    address1: orNull(form.address1),
    address2: orNull(form.address2),
    address3: orNull(form.address3),
    suburb: orNull(form.suburb),
    stateCode: orNull(form.stateCode),
    postCode: orNull(form.postCode),
    letterHead: orNull(form.letterHead),
    printBankDetails: form.printBankDetails,
    bankName: orNull(form.bankName),
    bankBsb: orNull(form.bankBsb),
    bankAcct: orNull(form.bankAcct),
    emailFrom: orNull(form.emailFrom),
  };
}

export default function InvoiceStatesPage() {
  const queryClient = useQueryClient();

  /** null = closed, "" = creating, otherwise the State key being edited. */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<StateInvoice | null>(null);

  const isCreating = editingKey === "";

  const query = useQuery({
    queryKey: ["invoice-states"],
    queryFn: () => statesApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoice-states"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      isCreating
        ? statesApi.create({ state: form.state.trim(), ...toRequest(form) })
        : statesApi.update(editingKey!, toRequest(form)),
    onSuccess: () => {
      setEditingKey(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (state: string) => statesApi.remove(state),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  // Sorted client-side: GET /api/invoice-states has no Take(), it returns one row per
  // trading state, so there is no capped page for a sort to reorder misleadingly.
  const { sorted, th } = useSortableTable(
    query.data,
    {
      state: (s) => s.state,
      name: (s) => s.name,
      suburb: (s) => s.suburb,
      stateCode: (s) => s.stateCode,
      printBankDetails: (s) => s.printBankDetails,
    },
    "state",
  );

  const all = query.data ?? [];

  const draftState = form.state.trim();
  const draftDuplicate =
    isCreating &&
    draftState.length > 0 &&
    all.some((s) => s.state.trim().toLowerCase() === draftState.toLowerCase());
  const canSave = isCreating ? draftState.length > 0 && !draftDuplicate : true;

  const startCreate = () => {
    saveMutation.reset();
    setForm(emptyForm);
    setEditingKey("");
  };

  const startEdit = (entity: StateInvoice) => {
    saveMutation.reset();
    setForm(toForm(entity));
    setEditingKey(entity.state);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageHeader
        title="Invoice states"
        description="The letterhead and bank block each invoice is printed under."
      />

      <Card>
        <CardHeader
          title="State entities"
          description={`${all.length} state${all.length === 1 ? "" : "s"} set up`}
          actions={
            <Button size="sm" variant="primary" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add state
            </Button>
          }
        />

        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : all.length === 0 ? (
          <EmptyState
            title="No invoice states set up"
            description="Each trading state needs one before invoices can be printed with a letterhead."
            action={
              <Button size="sm" variant="primary" onClick={startCreate}>
                <Plus className="size-3.5" />
                Add state
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("state")}>State</Th>
                <Th {...th("name")}>Name</Th>
                <Th {...th("suburb")}>Suburb</Th>
                <Th {...th("stateCode")}>Code</Th>
                <Th>Postcode</Th>
                <Th {...th("printBankDetails")}>Bank block</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted?.map((entity) => (
                <tr key={entity.state} className="hover:bg-slate-50">
                  <Td>
                    <span className="font-medium text-slate-900">{entity.state}</span>
                  </Td>
                  <Td>{text(entity.name)}</Td>
                  <Td>{text(entity.suburb)}</Td>
                  <Td>{text(entity.stateCode)}</Td>
                  <Td>{text(entity.postCode)}</Td>
                  <Td>
                    <Badge tone={entity.printBankDetails ? "green" : "slate"}>
                      {entity.printBankDetails ? "Printed" : "Hidden"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Edit state"
                        onClick={() => startEdit(entity)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Delete state"
                        onClick={() => setDeleting(entity)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <CardBody className="border-t border-slate-200 py-2">
          <p className="text-xs text-slate-500">
            The state key can&apos;t be changed once saved — customers point at it by name with
            nothing enforcing the link, so renaming would silently detach them. A state still in
            use by a customer can&apos;t be deleted.
          </p>
        </CardBody>
      </Card>

      <Modal
        open={editingKey !== null}
        onClose={() => setEditingKey(null)}
        width="lg"
        title={isCreating ? "Add invoice state" : `Edit ${editingKey}`}
        description="Printed at the top of every invoice raised under this state."
        footer={
          <>
            <Button onClick={() => setEditingKey(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
            >
              {isCreating ? "Create state" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {saveMutation.isError && (
            <Notice tone="red" title="State was not saved">
              {(saveMutation.error as Error).message}
            </Notice>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="State"
              required
              hint={isCreating ? "The key. Can't be changed later." : "Immutable."}
              error={draftDuplicate ? "That state is already set up." : undefined}
            >
              <Input
                value={form.state}
                maxLength={MAX.state}
                disabled={!isCreating}
                autoFocus={isCreating}
                onChange={(event) => set("state", event.target.value)}
              />
            </Field>

            <Field label="Name" hint={`Up to ${MAX.name} characters`}>
              <Input
                value={form.name}
                maxLength={MAX.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <Field label="Address line 1">
              <Input
                value={form.address1}
                maxLength={MAX.address}
                onChange={(event) => set("address1", event.target.value)}
              />
            </Field>
            <Field label="Address line 2">
              <Input
                value={form.address2}
                maxLength={MAX.address}
                onChange={(event) => set("address2", event.target.value)}
              />
            </Field>
            <Field label="Address line 3">
              <Input
                value={form.address3}
                maxLength={MAX.address}
                onChange={(event) => set("address3", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Suburb" className="sm:col-span-2">
              <Input
                value={form.suburb}
                maxLength={MAX.suburb}
                onChange={(event) => set("suburb", event.target.value)}
              />
            </Field>
            <Field label="State code" hint={`${MAX.stateCode} chars`}>
              <Input
                value={form.stateCode}
                maxLength={MAX.stateCode}
                placeholder="NSW"
                onChange={(event) => set("stateCode", event.target.value)}
              />
            </Field>
            <Field label="Postcode" hint={`${MAX.postCode} chars`}>
              <Input
                value={form.postCode}
                maxLength={MAX.postCode}
                placeholder="2000"
                onChange={(event) => set("postCode", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Letterhead" hint="Path to the letterhead image used when printing.">
            <Input
              value={form.letterHead}
              maxLength={MAX.letterHead}
              onChange={(event) => set("letterHead", event.target.value)}
            />
          </Field>

          <Field
            label="Email from"
            hint="The From address used when a proof is sent under this company."
          >
            <Input
              type="email"
              value={form.emailFrom}
              maxLength={MAX.emailFrom}
              onChange={(event) => set("emailFrom", event.target.value)}
            />
          </Field>

          <div className="rounded-md border border-slate-200 p-3">
            <Checkbox
              label="Print bank details on the invoice"
              checked={form.printBankDetails}
              onChange={(event) => set("printBankDetails", event.target.checked)}
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Bank name">
                <Input
                  value={form.bankName}
                  maxLength={MAX.bank}
                  disabled={!form.printBankDetails}
                  onChange={(event) => set("bankName", event.target.value)}
                />
              </Field>
              <Field label="BSB">
                <Input
                  value={form.bankBsb}
                  maxLength={MAX.bank}
                  disabled={!form.printBankDetails}
                  onChange={(event) => set("bankBsb", event.target.value)}
                />
              </Field>
              <Field label="Account">
                <Input
                  value={form.bankAcct}
                  maxLength={MAX.bank}
                  disabled={!form.printBankDetails}
                  onChange={(event) => set("bankAcct", event.target.value)}
                />
              </Field>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              The bank fields are still stored when the box is unticked — unticking only stops
              them being printed.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.state}?` : "Delete state"}
        description="Invoices can no longer be raised under this state."
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.state)}
            >
              Delete state
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Notice tone="red" title="State was not deleted">
            {(deleteMutation.error as Error).message}
          </Notice>
        ) : (
          <p className="text-sm text-slate-600">
            {text(deleting?.name, deleting?.state ?? "")} will be removed. This is refused if any
            customer still selects it.
          </p>
        )}
      </Modal>
    </>
  );
}
