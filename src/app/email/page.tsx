"use client";

import { useState } from "react";

import { DespatchEmailPanel } from "@/components/DespatchEmailPanel";
import { ReprintInvoicePanel } from "@/components/ReprintInvoicePanel";
import { Tabs, tabPanelId, type TabItem } from "@/components/Tabs";
import { PageHeader } from "@/components/ui";

type TabId = "despatch" | "reprint";

const TABS: TabItem<TabId>[] = [
  { id: "despatch", label: "Send despatch emails" },
  { id: "reprint", label: "Reprint invoice" },
];

/**
 * Email invoices. Two of the legacy main-menu screens live here as separate tabs, so only one is in
 * use at a time:
 *
 *  * Send despatch emails  EmailInvoices.frm: email every invoice that is ready, in one go.
 *  * Reprint invoice       Reprint.frm: print, preview or email ONE invoice by number.
 */
export default function EmailInvoicesPage() {
  const [tab, setTab] = useState<TabId>("despatch");

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Email invoices"
          description="Send the despatch emails in one go, or reprint and email a single invoice."
        />
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Email invoices" />
      </div>

      <div role="tabpanel" id={tabPanelId(tab)} aria-labelledby={`tab-${tab}`}>
        {tab === "despatch" ? <DespatchEmailPanel /> : <ReprintInvoicePanel />}
      </div>
    </>
  );
}