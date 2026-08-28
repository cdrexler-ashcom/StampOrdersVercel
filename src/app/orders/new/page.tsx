"use client";

import { OrderWorkspace } from "@/components/OrderWorkspace";

/**
 * New order. This is the same surface as /orders/[orderId]: OrderWorkspace opens in create
 * mode, and the moment the order is started it swaps the URL to the real order id in place
 * (no navigation), so entering an order and working it read as one continuous screen — the
 * way the legacy Form2 (invoice.Frm) behaved.
 */
export default function NewOrderPage() {
  return <OrderWorkspace />;
}
