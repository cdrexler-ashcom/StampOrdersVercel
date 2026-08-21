"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";

import { ProofDialog } from "@/components/ProofDialog";
import { Button, Card, CardBody, Field, Input, PageHeader } from "@/components/ui";

/**
 * Proofs — the web equivalent of ProofSQL's frmSelect (task E4).
 *
 * The legacy form had exactly one entry point: type a job number into txJobNo and tab or
 * click off it (txJobNo_Validate looks the job up in Soset and populates the rest of the
 * screen, or shows a message box if it can't). This page is that same entry point — a job
 * number field, submitted here rather than driven by a Validate event — handed straight to
 * ProofDialog, which already does the lookup, editing and preview/print (see its doc comment).
 *
 * This is a second way in to the exact same dialog the order line's Proof button opens
 * (OrderDetailPage) — neither depends on the other, both just supply a job number.
 */
export default function ProofsPage() {
  const [jobNoInput, setJobNoInput] = useState("");
  const [searchedJobNo, setSearchedJobNo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = () => {
    const jobNo = jobNoInput.trim();
    if (!jobNo) return;
    setSearchedJobNo(jobNo);
  };

  return (
    <>
      <PageHeader
        title="Proofs"
        description="Look up a job by number to view, edit and print its proof."
      />

      <Card className="max-w-md">
        <CardBody>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <Field label="Job number" className="flex-1">
              <Input
                ref={inputRef}
                value={jobNoInput}
                onChange={(e) => setJobNoInput(e.target.value)}
                placeholder="e.g. 100757"
                autoFocus
              />
            </Field>
            <Button type="submit" variant="primary" disabled={!jobNoInput.trim()}>
              <Search className="size-3.5" />
              View proof
            </Button>
          </form>
        </CardBody>
      </Card>

      <ProofDialog
        jobNo={searchedJobNo}
        onClose={() => {
          setSearchedJobNo(null);
          // Legacy behaviour: the field keeps the job number after Validate, ready to be
          // re-entered or corrected. Refocus it so the next lookup doesn't need a click.
          inputRef.current?.focus();
        }}
      />
    </>
  );
}
