"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Notice,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui";
import { settings } from "@/lib/endpoints";
import type { OverdueMessages } from "@/types/api";

/**
 * Overdue message templates — replaces frmOdueMsg1.frm and frmOdueMsg2.frm.
 *
 * These are two columns on the single Control row rather than a table of their own, so the
 * API exposes them through a narrow /api/settings/overdue-messages route. Control also holds
 * the document number sequences and the SMTP password; none of that is reachable from here,
 * and shouldn't become reachable by widening this screen.
 *
 * Both columns are nvarchar(max), so there is no character limit to enforce.
 */
export default function OverdueMessagesPage() {
  const queryClient = useQueryClient();

  const [message1, setMessage1] = useState("");
  const [message2, setMessage2] = useState("");
  /** What the server last confirmed, so the Save button can tell edited from untouched. */
  const [saved, setSaved] = useState<OverdueMessages | null>(null);

  const query = useQuery({
    queryKey: ["settings", "overdue-messages"],
    queryFn: () => settings.overdueMessages(),
  });

  // Seeded from the query rather than rendered straight from it: these are textareas the
  // operator types into, so the fetched values are a starting point, not the value.
  useEffect(() => {
    if (!query.data) return;
    setMessage1(query.data.message1 ?? "");
    setMessage2(query.data.message2 ?? "");
    setSaved(query.data);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      settings.updateOverdueMessages({
        message1: message1.trim() || null,
        message2: message2.trim() || null,
      }),
    onSuccess: (result) => {
      setSaved(result);
      queryClient.setQueryData(["settings", "overdue-messages"], result);
    },
  });

  const isDirty =
    saved === null ||
    (message1.trim() || null) !== (saved.message1 ?? null) ||
    (message2.trim() || null) !== (saved.message2 ?? null);

  const revert = () => {
    setMessage1(saved?.message1 ?? "");
    setMessage2(saved?.message2 ?? "");
    saveMutation.reset();
  };

  return (
    <>
      <PageHeader
        title="Overdue messages"
        description="The two message blocks printed on overdue statements."
      />

      {query.isLoading ? (
        <Card>
          <Spinner />
        </Card>
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Statement messages"
            description="Free text. Both blocks are replaced together when you save."
            actions={
              <>
                <Button size="sm" onClick={revert} disabled={!isDirty || saveMutation.isPending}>
                  Revert
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={saveMutation.isPending}
                  disabled={!isDirty}
                  onClick={() => saveMutation.mutate()}
                >
                  Save messages
                </Button>
              </>
            }
          />

          <CardBody className="space-y-4">
            {saveMutation.isError && (
              <Notice tone="red" title="Messages were not saved">
                {(saveMutation.error as Error).message}
              </Notice>
            )}

            {saveMutation.isSuccess && !isDirty && (
              <Notice tone="green" title="Messages saved" />
            )}

            <Field
              label="Message 1"
              hint="Shown first. Leave blank to print nothing in this block."
            >
              <Textarea
                rows={6}
                value={message1}
                placeholder="e.g. Your account is now overdue. Please arrange payment."
                onChange={(event) => setMessage1(event.target.value)}
              />
            </Field>

            <Field
              label="Message 2"
              hint="Shown second, typically the firmer follow-up."
            >
              <Textarea
                rows={6}
                value={message2}
                placeholder="e.g. Accounts unpaid after 60 days may be placed on hold."
                onChange={(event) => setMessage2(event.target.value)}
              />
            </Field>

            <p className="text-xs text-slate-500">
              These are stored on the Control record. Clearing a box and saving clears the
              stored message.
            </p>
          </CardBody>
        </Card>
      )}
    </>
  );
}
