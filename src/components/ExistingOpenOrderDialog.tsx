"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Modal } from "@/components/ui";
import { orders } from "@/lib/endpoints";

/**
 * "This customer already has an open order" prompt on the new-order page.
 *
 * Replicates the check `invoice.Frm` ran from `Customer_LostFocus`: once a customer was
 * chosen it called `GetOrdByCust`, and if a live order already existed it raised
 *
 *   "An order already exists for this customer. Are you sure you want to create a new order?"
 *
 * Here the same check runs the moment a customer is selected (this component mounts, and
 * re-runs whenever `custId` changes). The wording is turned around to offer the more
 * useful action first: answering yes opens the existing job to add to, answering no falls
 * through to creating a new order exactly as before.
 */
export function ExistingOpenOrderDialog({ custId }: { custId: number }) {
  const router = useRouter();

  // Whether the operator has answered for the current customer. Reset when the customer
  // changes so re-selecting a different account re-prompts — invoice.Frm re-ran the check
  // on every Customer_LostFocus where the customer had changed.
  const [answered, setAnswered] = useState(false);
  useEffect(() => setAnswered(false), [custId]);

  const { data } = useQuery({
    queryKey: ["open-order-check", custId],
    queryFn: () => orders.openOrderCheck(custId),
  });

  const open = !answered && !!data?.hasOpenOrder && data.orderId != null;

  return (
    <Modal
      open={open}
      onClose={() => setAnswered(true)}
      title="This customer already has an open order"
      footer={
        <>
          <Button type="button" onClick={() => setAnswered(true)}>
            No, start a new order
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (data?.orderId != null) router.push(`/orders/${data.orderId}`);
            }}
          >
            Yes, open the existing order
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {data?.orderCount === 1
          ? `Order ${data?.orderId} is still open for this customer. You can add these stamps to that job instead of raising a new order.`
          : `${data?.orderCount ?? 0} orders are still open for this customer. The most recent is order ${data?.orderId}, which you can add to instead of raising a new order.`}
      </p>
    </Modal>
  );
}
