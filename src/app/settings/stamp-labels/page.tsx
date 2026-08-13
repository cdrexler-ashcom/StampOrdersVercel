"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { stampLabels as labelsApi } from "@/lib/endpoints";
import { text } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useSortableTable } from "@/lib/useSortableTable";
import type { StampLabel } from "@/types/api";

/**
 * Stamp labels maintenance — replaces frmStampLabels.frm.
 *
 * A pure lookup list. The label text is applied to order lines elsewhere (AddLineDialog),
 * so nothing on this screen touches an order.
 *
 * The label code is the key and is immutable once saved: order lines store it as loose text
 * with no foreign key behind it, so renaming would orphan every line already carrying it.
 * Retiring a code means adding the replacement and deleting the old one — deleting only
 * stops it being offered on new lines, it does not rewrite existing ones.
 */

/** Widths of the nvarchar columns, mirrored from StampLabelConfiguration. */
const CODE_MAX = 20;
const TEXT_MAX = 100;

export default function StampLabelsPage() {
  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ labelCode: "", labelText: "" });

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [deleting, setDeleting] = useState<StampLabel | null>(null);

  const query = useQuery({
    queryKey: ["stamp-labels"],
    queryFn: () => labelsApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stamp-labels"] });

  const createMutation = useMutation({
    mutationFn: () =>
      labelsApi.create({
        labelCode: draft.labelCode.trim(),
        labelText: draft.labelText.trim() || null,
      }),
    onSuccess: () => {
      setAdding(false);
      setDraft({ labelCode: "", labelText: "" });
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ labelCode, labelText }: { labelCode: string; labelText: string }) =>
      labelsApi.update(labelCode, { labelText: labelText.trim() || null }),
    onSuccess: () => {
      setEditingCode(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (labelCode: string) => labelsApi.remove(labelCode),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  // Sorted and filtered client-side. GET /api/stamp-labels has no Take() — it returns the
  // whole lookup list — so narrowing the fetched rows in the browser sees the full set and
  // stays correct.
  const { sorted, th } = useSortableTable(
    query.data,
    {
      labelCode: (l) => l.labelCode,
      labelText: (l) => l.labelText,
    },
    "labelCode",
  );

  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(sorted, {
    labelCode: (l: StampLabel) => l.labelCode?.trim() ?? "",
  });

  const all = query.data ?? [];

  const draftCode = draft.labelCode.trim();
  const draftCodeValid = draftCode.length > 0 && draftCode.length <= CODE_MAX;
  // Matched case-insensitively because SQL Server's default collation is, so "GIFT" and
  // "gift" would collide at the database even though they differ here.
  const draftIsDuplicate =
    draftCodeValid &&
    all.some((label) => label.labelCode.trim().toLowerCase() === draftCode.toLowerCase());

  const startAdd = () => {
    setEditingCode(null);
    createMutation.reset();
    setDraft({ labelCode: "", labelText: "" });
    setAdding(true);
  };

  const cancelAdd = () => {
    setAdding(false);
    setDraft({ labelCode: "", labelText: "" });
    createMutation.reset();
  };

  const startEdit = (label: StampLabel) => {
    setAdding(false);
    updateMutation.reset();
    setEditingCode(label.labelCode);
    setEditText(label.labelText ?? "");
  };

  const cancelEdit = () => {
    setEditingCode(null);
    updateMutation.reset();
  };

  return (
    <>
      <PageHeader
        title="Stamp labels"
        description="Reusable label text offered on order lines."
      />

      <Card>
        <CardHeader
          title="Label list"
          description={`${all.length} label${all.length === 1 ? "" : "s"}`}
          actions={
            <>
              {isFiltered && (
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  Clear column filters
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={startAdd} disabled={adding}>
                <Plus className="size-3.5" />
                Add label
              </Button>
            </>
          }
        />

        {(createMutation.isError || updateMutation.isError) && (
          <CardBody className="border-b border-slate-200 py-3">
            <Notice
              tone="red"
              title={createMutation.isError ? "Label was not created" : "Label was not updated"}
            >
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </Notice>
          </CardBody>
        )}

        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : all.length === 0 && !adding ? (
          <EmptyState
            title="No stamp labels on file"
            description="Add a code for each reusable label text."
            action={
              <Button size="sm" variant="primary" onClick={startAdd}>
                <Plus className="size-3.5" />
                Add label
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("labelCode")} filter={colFilter("labelCode")}>
                  Code
                </Th>
                <Th {...th("labelText")}>Label text</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adding && (
                <tr className="bg-sky-50/60">
                  <Td>
                    <Input
                      autoFocus
                      value={draft.labelCode}
                      maxLength={CODE_MAX}
                      placeholder="Code"
                      onChange={(event) =>
                        setDraft({ ...draft, labelCode: event.target.value })
                      }
                      className="w-40"
                    />
                    {draftIsDuplicate && (
                      <span className="mt-1 block text-xs text-red-600">
                        That code already exists.
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Input
                      value={draft.labelText}
                      maxLength={TEXT_MAX}
                      placeholder="Label text"
                      onChange={(event) =>
                        setDraft({ ...draft, labelText: event.target.value })
                      }
                    />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={createMutation.isPending}
                        disabled={!draftCodeValid || draftIsDuplicate}
                        onClick={() => createMutation.mutate()}
                      >
                        <Check className="size-3.5" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelAdd}>
                        Cancel
                      </Button>
                    </div>
                  </Td>
                </tr>
              )}

              {(filtered?.length ?? 0) === 0 && !adding ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8">
                    <EmptyState
                      title="No labels match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered?.map((label) => {
                  if (editingCode === label.labelCode) {
                    return (
                      <tr key={label.labelCode} className="bg-sky-50/60">
                        <Td>
                          <span className="font-medium text-slate-900">{label.labelCode}</span>
                        </Td>
                        <Td>
                          <Input
                            autoFocus
                            value={editText}
                            maxLength={TEXT_MAX}
                            placeholder="Label text"
                            onChange={(event) => setEditText(event.target.value)}
                          />
                        </Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="primary"
                              loading={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({
                                  labelCode: label.labelCode,
                                  labelText: editText,
                                })
                              }
                            >
                              <Check className="size-3.5" />
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="size-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={label.labelCode} className="hover:bg-slate-50">
                      <Td>
                        <span className="font-medium text-slate-900">{label.labelCode}</span>
                      </Td>
                      <Td>{text(label.labelText)}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit label text"
                            onClick={() => startEdit(label)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete label"
                            onClick={() => setDeleting(label)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        )}

        <CardBody className="border-t border-slate-200 py-2">
          <p className="text-xs text-slate-500">
            The code is the key and can&apos;t be changed once saved. Order lines store it as
            text, so deleting a label doesn&apos;t alter lines already carrying it — it only
            stops the code being offered on new ones.
          </p>
        </CardBody>
      </Card>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete label ${deleting.labelCode}?` : "Delete label"}
        description="The code stops being offered on new order lines."
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.labelCode)}
            >
              Delete label
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Notice tone="red" title="Label was not deleted">
            {(deleteMutation.error as Error).message}
          </Notice>
        ) : (
          <p className="text-sm text-slate-600">
            Order lines already saved with {deleting?.labelCode} keep the code they were saved
            with.
          </p>
        )}
      </Modal>
    </>
  );
}
