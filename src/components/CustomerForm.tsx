"use client";

import { useEffect, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import type { Customer, CustomerRequest } from "@/types/api";

/**
 * Customer create/edit form. Reproduces the field set of CustEdit.frm (~1,050 lines), not
 * its logic — one shape, matching CustomerService's CustomerRequest exactly, used for both
 * POST (create) and PUT (update) so the two paths can't drift.
 *
 * Widths below are copied from CustomerService.Validate, not from the schema doc directly:
 * that method is what the server actually enforces, so matching it here means a value that
 * passes the client also passes the server. Only AccountNo is required — the server doesn't
 * require Title either, so neither does this form, even though every real customer has one.
 */

const MAX = {
  accountNo: 16,
  title: 35,
  address1: 40,
  address2: 40,
  address3: 30,
  postCode: 15,
  delivery1: 40,
  delivery2: 40,
  delivery3: 40,
  delPostCode: 4,
  delState: 3,
  phoneNo: 15,
  defDelCode: 12,
  runNo: 2,
  webRunNo: 2,
  accountsEmail: 45,
  invoiceComp: 20,
  orderNote: 60,
  drawerName: 35,
  bankName: 40,
  bankBranch: 30,
  cardNumber: 20,
  expiryDate: 10,
  email: 45,
  faxNo: 15,
  proofHeader: 100,
  sendFromEmail: 50,
} as const;

/** PriceCode is stored as smallint; CustomerService rejects anything outside this range. */
const PRICE_CODE_MIN = -32768;
const PRICE_CODE_MAX = 32767;

/**
 * The only spellings CreditStatusExtensions.Parse recognises. Anything else the server sees
 * — including a value never sent — is normalised to "" (no hold), so this select can't
 * produce an invalid value.
 */
const CREDIT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No hold" },
  { value: "30 Days", label: "30 Days" },
  { value: "60 Days", label: "60 Days" },
  { value: "90 Days", label: "90 Days" },
  { value: "Always", label: "Always" },
];

interface FormState {
  accountNo: string;
  title: string;
  address1: string;
  address2: string;
  address3: string;
  postCode: string;
  delivery1: string;
  delivery2: string;
  delivery3: string;
  delPostCode: string;
  delState: string;
  phoneNo: string;
  priceCode: string;
  discPct: string;
  gstExempt: boolean;
  priceIncGst: boolean;
  freight: boolean;
  freightAmt: string;
  deliveryThreshold: string;
  defDelCode: string;
  runNo: string;
  creditStatus: string;
  creditMsg: string;
  emailInvoice: boolean;
  accountsEmail: string;
  deliveryDocket: boolean;
  invoiceComp: string;
  orderNote: string;
  dealerReturnAddress: boolean;
  webEmail: boolean;
  webFreightApplies: boolean;
  webDeliveryDocket: boolean;
  webRunNo: string;
  drawerName: string;
  bankName: string;
  bankBranch: string;
  cardNumber: string;
  expiryDate: string;
  paidDefault: boolean;
  email: string;
  faxNo: string;
  proofHeader: string;
  sendFromEmail: string;
  altPricing: boolean;
  noProofHeader: boolean;
}

const emptyForm: FormState = {
  accountNo: "",
  title: "",
  address1: "",
  address2: "",
  address3: "",
  postCode: "",
  delivery1: "",
  delivery2: "",
  delivery3: "",
  delPostCode: "",
  delState: "",
  phoneNo: "",
  priceCode: "",
  discPct: "",
  gstExempt: false,
  priceIncGst: false,
  freight: false,
  freightAmt: "",
  deliveryThreshold: "",
  defDelCode: "",
  runNo: "",
  creditStatus: "",
  creditMsg: "",
  emailInvoice: false,
  accountsEmail: "",
  deliveryDocket: false,
  invoiceComp: "",
  orderNote: "",
  dealerReturnAddress: false,
  webEmail: false,
  webFreightApplies: false,
  webDeliveryDocket: false,
  webRunNo: "",
  drawerName: "",
  bankName: "",
  bankBranch: "",
  cardNumber: "",
  expiryDate: "",
  paidDefault: false,
  email: "",
  faxNo: "",
  proofHeader: "",
  sendFromEmail: "",
  altPricing: false,
  noProofHeader: false,
};

function toForm(customer: Customer): FormState {
  return {
    accountNo: customer.accountNo ?? "",
    title: customer.title ?? "",
    address1: customer.address1 ?? "",
    address2: customer.address2 ?? "",
    address3: customer.address3 ?? "",
    postCode: customer.postCode ?? "",
    delivery1: customer.delivery1 ?? "",
    delivery2: customer.delivery2 ?? "",
    delivery3: customer.delivery3 ?? "",
    delPostCode: customer.delPostCode ?? "",
    delState: customer.delState ?? "",
    phoneNo: customer.phoneNo ?? "",
    priceCode: customer.priceCode?.toString() ?? "",
    discPct: customer.discPct?.toString() ?? "",
    gstExempt: customer.gstExempt,
    priceIncGst: customer.priceIncGst,
    freight: customer.freight,
    freightAmt: customer.freightAmt?.toString() ?? "",
    deliveryThreshold: customer.deliveryThreshold?.toString() ?? "",
    defDelCode: customer.defDelCode ?? "",
    runNo: customer.runNo ?? "",
    creditStatus: customer.creditStatus ?? "",
    creditMsg: customer.creditMsg ?? "",
    emailInvoice: customer.emailInvoice,
    accountsEmail: customer.accountsEmail ?? "",
    deliveryDocket: customer.deliveryDocket,
    invoiceComp: customer.invoiceComp ?? "",
    orderNote: customer.orderNote ?? "",
    dealerReturnAddress: customer.dealerReturnAddress,
    webEmail: customer.webEmail,
    webFreightApplies: customer.webFreightApplies,
    webDeliveryDocket: customer.webDeliveryDocket,
    webRunNo: customer.webRunNo ?? "",
    drawerName: customer.drawerName ?? "",
    bankName: customer.bankName ?? "",
    bankBranch: customer.bankBranch ?? "",
    cardNumber: customer.cardNumber ?? "",
    expiryDate: customer.expiryDate ?? "",
    paidDefault: customer.paidDefault,
    email: customer.email ?? "",
    faxNo: customer.faxNo ?? "",
    proofHeader: customer.proofHeader ?? "",
    sendFromEmail: customer.sendFromEmail ?? "",
    altPricing: customer.altPricing,
    noProofHeader: customer.noProofHeader,
  };
}

/** Blank becomes null so a cleared field and an untouched-empty field store the same value. */
const orNull = (value: string) => value.trim() || null;

/** Blank becomes null; otherwise parsed as a number. Used for every nullable numeric field. */
function orNullNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRequest(form: FormState): CustomerRequest {
  return {
    accountNo: form.accountNo.trim(),
    title: orNull(form.title),
    address1: orNull(form.address1),
    address2: orNull(form.address2),
    address3: orNull(form.address3),
    postCode: orNull(form.postCode),
    delivery1: orNull(form.delivery1),
    delivery2: orNull(form.delivery2),
    delivery3: orNull(form.delivery3),
    delPostCode: orNull(form.delPostCode),
    delState: orNull(form.delState),
    phoneNo: orNull(form.phoneNo),
    priceCode: orNullNumber(form.priceCode),
    discPct: orNullNumber(form.discPct),
    gstExempt: form.gstExempt,
    priceIncGst: form.priceIncGst,
    freight: form.freight,
    freightAmt: orNullNumber(form.freightAmt),
    deliveryThreshold: orNullNumber(form.deliveryThreshold),
    defDelCode: orNull(form.defDelCode),
    runNo: orNull(form.runNo),
    // The select is constrained to the recognised spellings, so this always round-trips —
    // no normalisation needed on the way out.
    creditStatus: form.creditStatus,
    creditMsg: orNull(form.creditMsg),
    emailInvoice: form.emailInvoice,
    accountsEmail: orNull(form.accountsEmail),
    deliveryDocket: form.deliveryDocket,
    invoiceComp: orNull(form.invoiceComp),
    orderNote: orNull(form.orderNote),
    dealerReturnAddress: form.dealerReturnAddress,
    webEmail: form.webEmail,
    webFreightApplies: form.webFreightApplies,
    webDeliveryDocket: form.webDeliveryDocket,
    webRunNo: orNull(form.webRunNo),
    drawerName: orNull(form.drawerName),
    bankName: orNull(form.bankName),
    bankBranch: orNull(form.bankBranch),
    cardNumber: orNull(form.cardNumber),
    expiryDate: orNull(form.expiryDate),
    paidDefault: form.paidDefault,
    email: orNull(form.email),
    faxNo: orNull(form.faxNo),
    proofHeader: orNull(form.proofHeader),
    sendFromEmail: orNull(form.sendFromEmail),
    altPricing: form.altPricing,
    noProofHeader: form.noProofHeader,
  };
}

/**
 * Width and range checks, mirrored from CustomerService.Validate so a value accepted here is
 * accepted there. This is a convenience for the operator, not the source of truth — the
 * server validates again regardless, and its message is what's shown if the two ever drift.
 */
function validate(form: FormState): string[] {
  const problems: string[] = [];

  if (!form.accountNo.trim()) problems.push("Account number is required.");

  const widths: [string, string, number][] = [
    ["Account number", form.accountNo, MAX.accountNo],
    ["Title", form.title, MAX.title],
    ["Address line 1", form.address1, MAX.address1],
    ["Address line 2", form.address2, MAX.address2],
    ["Address line 3", form.address3, MAX.address3],
    ["Post code", form.postCode, MAX.postCode],
    ["Delivery line 1", form.delivery1, MAX.delivery1],
    ["Delivery line 2", form.delivery2, MAX.delivery2],
    ["Delivery line 3", form.delivery3, MAX.delivery3],
    ["Delivery post code", form.delPostCode, MAX.delPostCode],
    ["Delivery state", form.delState, MAX.delState],
    ["Phone number", form.phoneNo, MAX.phoneNo],
    ["Default delivery code", form.defDelCode, MAX.defDelCode],
    ["Run number", form.runNo, MAX.runNo],
    ["Web run number", form.webRunNo, MAX.webRunNo],
    ["Accounts email", form.accountsEmail, MAX.accountsEmail],
    ["Invoice entity", form.invoiceComp, MAX.invoiceComp],
    ["Order note", form.orderNote, MAX.orderNote],
    ["Drawer name", form.drawerName, MAX.drawerName],
    ["Bank name", form.bankName, MAX.bankName],
    ["Bank branch", form.bankBranch, MAX.bankBranch],
    ["Card number", form.cardNumber, MAX.cardNumber],
    ["Expiry date", form.expiryDate, MAX.expiryDate],
    ["Contact email", form.email, MAX.email],
    ["Fax number", form.faxNo, MAX.faxNo],
    ["Letterhead image path", form.proofHeader, MAX.proofHeader],
    ["Proof email “from” address", form.sendFromEmail, MAX.sendFromEmail],
  ];

  for (const [field, value, max] of widths) {
    if (value.trim().length > max) {
      problems.push(`${field} is ${value.trim().length} characters. The limit is ${max}.`);
    }
  }

  if (form.priceCode.trim() !== "") {
    const code = Number(form.priceCode);
    if (!Number.isFinite(code) || !Number.isInteger(code)) {
      problems.push("Price code must be a whole number.");
    } else if (code < PRICE_CODE_MIN || code > PRICE_CODE_MAX) {
      problems.push(`Price code must be between ${PRICE_CODE_MIN} and ${PRICE_CODE_MAX}.`);
    }
  }

  return problems;
}

export function CustomerForm({
  initial,
  heading,
  submitLabel,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  /** Omit for create; pass the loaded customer for edit. */
  initial?: Customer | null;
  heading: { title: string; description?: string };
  submitLabel: string;
  onSubmit: (request: CustomerRequest) => void;
  onCancel: () => void;
  pending: boolean;
  error?: Error | null;
}) {
  const [form, setForm] = useState<FormState>(() => (initial ? toForm(initial) : emptyForm));

  // Re-seeds if a different customer is passed in (defends against the same mounted
  // component being reused across customers; harmless when it's the same one twice).
  useEffect(() => {
    if (initial) setForm(toForm(initial));
  }, [initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const problems = validate(form);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (problems.length > 0) return;
    onSubmit(toRequest(form));
  };

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={heading.title}
        description={heading.description}
        actions={
          <>
            <Button type="button" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={pending}
              disabled={problems.length > 0}
            >
              {submitLabel}
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="red" title="Customer was not saved">
            {error.message}
          </Notice>
        </div>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Account number" required hint={`Up to ${MAX.accountNo} characters. The business key.`}>
              <Input
                value={form.accountNo}
                maxLength={MAX.accountNo}
                autoFocus
                onChange={(e) => set("accountNo", e.target.value)}
              />
            </Field>
            <Field label="Title" hint="Customer name.">
              <Input
                value={form.title}
                maxLength={MAX.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Invoice address" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Address line 1" className="sm:col-span-2">
              <Input
                value={form.address1}
                maxLength={MAX.address1}
                onChange={(e) => set("address1", e.target.value)}
              />
            </Field>
            <Field label="Address line 2" className="sm:col-span-2">
              <Input
                value={form.address2}
                maxLength={MAX.address2}
                onChange={(e) => set("address2", e.target.value)}
              />
            </Field>
            <Field label="Suburb (address line 3)">
              <Input
                value={form.address3}
                maxLength={MAX.address3}
                onChange={(e) => set("address3", e.target.value)}
              />
            </Field>
            <Field label="Post code">
              <Input
                value={form.postCode}
                maxLength={MAX.postCode}
                onChange={(e) => set("postCode", e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Delivery address" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Address line 1" className="sm:col-span-2">
              <Input
                value={form.delivery1}
                maxLength={MAX.delivery1}
                onChange={(e) => set("delivery1", e.target.value)}
              />
            </Field>
            <Field label="Address line 2" className="sm:col-span-2">
              <Input
                value={form.delivery2}
                maxLength={MAX.delivery2}
                onChange={(e) => set("delivery2", e.target.value)}
              />
            </Field>
            <Field label="Suburb (address line 3)">
              <Input
                value={form.delivery3}
                maxLength={MAX.delivery3}
                onChange={(e) => set("delivery3", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="State" hint={`${MAX.delState} chars`}>
                <Input
                  value={form.delState}
                  maxLength={MAX.delState}
                  onChange={(e) => set("delState", e.target.value)}
                />
              </Field>
              <Field label="Post code" hint={`${MAX.delPostCode} chars`}>
                <Input
                  value={form.delPostCode}
                  maxLength={MAX.delPostCode}
                  onChange={(e) => set("delPostCode", e.target.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone number">
              <Input
                value={form.phoneNo}
                maxLength={MAX.phoneNo}
                onChange={(e) => set("phoneNo", e.target.value)}
              />
            </Field>
            <Field label="Fax number">
              <Input
                value={form.faxNo}
                maxLength={MAX.faxNo}
                onChange={(e) => set("faxNo", e.target.value)}
              />
            </Field>
            <Field label="Accounts email" hint="Used for invoice delivery.">
              <Input
                type="email"
                value={form.accountsEmail}
                maxLength={MAX.accountsEmail}
                onChange={(e) => set("accountsEmail", e.target.value)}
              />
            </Field>
            <Field label="Contact email" hint="Ordering contact; used when sending proofs.">
              <Input
                type="email"
                value={form.email}
                maxLength={MAX.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pricing & GST" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Price code"
              hint={`Whole number, ${PRICE_CODE_MIN} to ${PRICE_CODE_MAX}.`}
            >
              <Input
                type="number"
                step="1"
                value={form.priceCode}
                onChange={(e) => set("priceCode", e.target.value)}
              />
            </Field>
            <Field label="Discount %" hint="e.g. 5 for 5%.">
              <Input
                type="number"
                step="0.01"
                value={form.discPct}
                onChange={(e) => set("discPct", e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <Checkbox
                label="GST exempt"
                checked={form.gstExempt}
                onChange={(e) => set("gstExempt", e.target.checked)}
              />
              <Checkbox
                label="Prices include GST"
                checked={form.priceIncGst}
                onChange={(e) => set("priceIncGst", e.target.checked)}
              />
              <Checkbox
                label="Alternative pricing (catalogue columns)"
                checked={form.altPricing}
                onChange={(e) => set("altPricing", e.target.checked)}
              />
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Alternative pricing makes price codes read the product&rsquo;s catalogue columns
              instead of its unit prices.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Freight & delivery" />
          <CardBody className="space-y-3">
            <Checkbox
              label="Freight applies"
              checked={form.freight}
              onChange={(e) => set("freight", e.target.checked)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Freight amount" hint="Flat amount charged when freight applies.">
                <Input
                  type="number"
                  step="0.01"
                  disabled={!form.freight}
                  value={form.freightAmt}
                  onChange={(e) => set("freightAmt", e.target.value)}
                />
              </Field>
              <Field label="Delivery threshold" hint="Order value above which freight is waived.">
                <Input
                  type="number"
                  step="0.01"
                  value={form.deliveryThreshold}
                  onChange={(e) => set("deliveryThreshold", e.target.value)}
                />
              </Field>
              <Field label="Default delivery code" hint={`${MAX.defDelCode} chars`}>
                <Input
                  value={form.defDelCode}
                  maxLength={MAX.defDelCode}
                  onChange={(e) => set("defDelCode", e.target.value)}
                />
              </Field>
              <Field label="Run number" hint={`${MAX.runNo} chars, text not a number.`}>
                <Input
                  value={form.runNo}
                  maxLength={MAX.runNo}
                  onChange={(e) => set("runNo", e.target.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Credit" />
          <CardBody className="space-y-3">
            <Field label="Credit status">
              <Select
                value={form.creditStatus}
                onChange={(e) => set("creditStatus", e.target.value)}
                className="max-w-48"
              >
                {CREDIT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Credit message" hint="Shown wherever this account's credit is checked.">
              <Textarea
                rows={3}
                value={form.creditMsg}
                onChange={(e) => set("creditMsg", e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Invoicing & documents" />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <Checkbox
                label="Email invoices"
                checked={form.emailInvoice}
                onChange={(e) => set("emailInvoice", e.target.checked)}
              />
              <Checkbox
                label="Delivery docket"
                checked={form.deliveryDocket}
                onChange={(e) => set("deliveryDocket", e.target.checked)}
              />
              <Checkbox
                label="Dealer return address"
                checked={form.dealerReturnAddress}
                onChange={(e) => set("dealerReturnAddress", e.target.checked)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Invoice entity"
                hint="The invoicing state entity used for this account's letterhead."
              >
                <Input
                  value={form.invoiceComp}
                  maxLength={MAX.invoiceComp}
                  onChange={(e) => set("invoiceComp", e.target.value)}
                />
              </Field>
              <Field label="Order note" hint="Shown whenever a new order is raised for this account.">
                <Input
                  value={form.orderNote}
                  maxLength={MAX.orderNote}
                  onChange={(e) => set("orderNote", e.target.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Proofs"
            description="Per-customer overrides used when a stamp proof is emailed or faxed."
          />
          <CardBody className="space-y-3">
            <Checkbox
              label="Plain proof (no letterhead)"
              checked={form.noProofHeader}
              onChange={(e) => set("noProofHeader", e.target.checked)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Letterhead image"
                hint="Path to this customer's own letterhead, overriding the invoice entity's."
                className="sm:col-span-2"
              >
                <Input
                  value={form.proofHeader}
                  maxLength={MAX.proofHeader}
                  onChange={(e) => set("proofHeader", e.target.value)}
                />
              </Field>
              <Field
                label="Proof email “from”"
                hint="Overrides the default sender address for this customer's proof emails."
              >
                <Input
                  type="email"
                  value={form.sendFromEmail}
                  maxLength={MAX.sendFromEmail}
                  onChange={(e) => set("sendFromEmail", e.target.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Web order defaults" />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <Checkbox
                label="Email dealer"
                checked={form.webEmail}
                onChange={(e) => set("webEmail", e.target.checked)}
              />
              <Checkbox
                label="Freight applies"
                checked={form.webFreightApplies}
                onChange={(e) => set("webFreightApplies", e.target.checked)}
              />
              <Checkbox
                label="Delivery docket"
                checked={form.webDeliveryDocket}
                onChange={(e) => set("webDeliveryDocket", e.target.checked)}
              />
            </div>
            <Field label="Run number" hint={`${MAX.webRunNo} chars, text not a number.`} className="max-w-40">
              <Input
                value={form.webRunNo}
                maxLength={MAX.webRunNo}
                onChange={(e) => set("webRunNo", e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Remembered payment details"
            description="Written back by the receipt screen; editable here for correction."
          />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Drawer name" hint={`${MAX.drawerName} chars`}>
                <Input
                  value={form.drawerName}
                  maxLength={MAX.drawerName}
                  onChange={(e) => set("drawerName", e.target.value)}
                />
              </Field>
              <Field label="Bank name" hint={`${MAX.bankName} chars`}>
                <Input
                  value={form.bankName}
                  maxLength={MAX.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                />
              </Field>
              <Field label="Bank branch" hint={`${MAX.bankBranch} chars`}>
                <Input
                  value={form.bankBranch}
                  maxLength={MAX.bankBranch}
                  onChange={(e) => set("bankBranch", e.target.value)}
                />
              </Field>
              <Field label="Card number" hint={`${MAX.cardNumber} chars`}>
                <Input
                  value={form.cardNumber}
                  maxLength={MAX.cardNumber}
                  onChange={(e) => set("cardNumber", e.target.value)}
                />
              </Field>
              <Field label="Expiry date" hint={`${MAX.expiryDate} chars`}>
                <Input
                  value={form.expiryDate}
                  maxLength={MAX.expiryDate}
                  onChange={(e) => set("expiryDate", e.target.value)}
                />
              </Field>
            </div>
            <Checkbox
              label="Paid by default"
              checked={form.paidDefault}
              onChange={(e) => set("paidDefault", e.target.checked)}
            />
          </CardBody>
        </Card>

        {problems.length > 0 && (
          <ul className="space-y-0.5 text-xs text-slate-500">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
