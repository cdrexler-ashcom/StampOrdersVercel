"use client";

import { useParams } from "next/navigation";

import { OrderWorkspace } from "@/components/OrderWorkspace";

/**
 * Order workspace — the web replacement for Form2 (invoice.Frm). The whole life of an order
 * (view, header edit, and lines) is handled here on one mounted surface; OrderWorkspace also
 * backs /orders/new, so creating an order flows into working it without a page change.
 */
export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  return <OrderWorkspace initialOrderId={Number(params.orderId)} />;
}
