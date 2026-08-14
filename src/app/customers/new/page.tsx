"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { CustomerForm } from "@/components/CustomerForm";
import { customers } from "@/lib/endpoints";
import type { CustomerRequest } from "@/types/api";

/**
 * Customer creation (task C2). Reproduces the field set of CustEdit.frm on a new record.
 *
 * CustomerForm carries the ~30 fields and the widths CustomerService enforces; this page is
 * just the create-mode wiring around it.
 */
export default function NewCustomerPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (body: CustomerRequest) => customers.create(body),
    onSuccess: (customer) => router.push(`/customers/${customer.uniqueId}`),
  });

  return (
    <CustomerForm
      heading={{
        title: "New customer",
        description: "Account number is required; everything else can be filled in later.",
      }}
      submitLabel="Create customer"
      onSubmit={(body) => mutation.mutate(body)}
      onCancel={() => router.back()}
      pending={mutation.isPending}
      error={mutation.error as Error | null}
    />
  );
}
