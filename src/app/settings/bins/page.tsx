"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
  Badge,
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
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { bins as binsApi } from "@/lib/endpoints";
import { text } from "@/lib/format";
import { useFilterableTable } from "@/lib/useFilterableTable";
import { useSortableTable } from "@/lib/useSortableTable";
import type { Bin, BinStatus, CreateBinRequest, UpdateBinRequest } from "@/types/api";

/**
 * Bins maintenance — the reference table behind bin allocation.
 *
 * Replaces the legacy File -> Bins list. A bin is a physical tray on the factory floor;
 * order entry claims the lowest-numbered Free bin and releases it on invoice or delete,
 * so nothing here allocates. This screen only maintains the tray list itself.
 *
 * Two rules are the API's, mirrored in the UI so the operator isn't led into a guaranteed
 * error:
 *  - BinNo is typed by hand, not generated, and must be unique. The table has no unique
 *    index in the database, so the API's duplicate check is the only guard — the local
 *    check below is for immediate feedback, not correctness.
 *  - An Occupied bin can't be deleted. To retire one that's stuck Occupied with no live
 *    order behind it, mark it free first, then delete.
 */

/** Width of the nvarchar(20) Description column. */
const DESCRIPTION_MAX = 20;

interface DraftBin {
  binNo: string;
  description: string;
  status: BinStatus;
}

const emptyDraft: DraftBin = { binNo: "", description: "", status: "Free" };

export default function BinsPage() {
  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftBin>(emptyDraft);

  const [editingBinNo, setEditingBinNo] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ description: string; status: BinStatus }>({
    description: "",
    status: "Free",
  });
  /** The status as loaded, so an unchanged status is left out of the PUT entirely. */
  const [editOriginalStatus, setEditOriginalStatus] = useState<BinStatus>("Free");

  const [deleting, setDeleting] = useState<Bin | null>(null);

  const query = useQuery({
    queryKey: ["bins"],
    queryFn: () => binsApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bins"] });

  const createMutation = useMutation({
    mutationFn: (body: CreateBinRequest) => binsApi.create(body),
    onSuccess: () => {
      setAdding(false);
      setDraft(emptyDraft);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ binNo, body }: { binNo: number; body: UpdateBinRequest }) =>
      binsApi.update(binNo, body),
    onSuccess: () => {
      setEditingBinNo(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (binNo: number) => binsApi.remove(binNo),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  // Sorted and filtered client-side. Unlike customers/products/orders/invoices there's no
  // Take() on GET /api/bins — it always returns every tray — so narrowing the fetched rows
  // in the browser sees the full set and stays correct.
  const { sorted, th } = useSortableTable(query.data, {
    binNo: (b) => b.binNo,
    description: (b) => b.description,
    status: (b) => b.status,
  }, "binNo");

  const { filtered, isFiltered, clearAll, colFilter } = useFilterableTable(sorted, {
    description: (b: Bin) => b.description?.trim() ?? "",
    status: (b: Bin) => b.status,
  });

  const all = query.data ?? [];
  const freeCount = all.filter((bin) => bin.status === "Free").length;

  const draftBinNo = Number(draft.binNo);
  const draftBinNoValid = draft.binNo.trim() !== "" && Number.isInteger(draftBinNo) && draftBinNo >= 1;
  const draftIsDuplicate = draftBinNoValid && all.some((bin) => bin.binNo === draftBinNo);

  const startAdd = () => {
    setEditingBinNo(null);
    createMutation.reset();
    setDraft(emptyDraft);
    setAdding(true);
  };

  const cancelAdd = () => {
    setAdding(false);
    setDraft(emptyDraft);
    createMutation.reset();
  };

  const submitAdd = () => {
    if (!draftBinNoValid || draftIsDuplicate) return;
    createMutation.mutate({
      binNo: draftBinNo,
      description: draft.description.trim() || null,
      status: draft.status,
    });
  };

  const startEdit = (bin: Bin) => {
    setAdding(false);
    updateMutation.reset();
    setEditingBinNo(bin.binNo);
    setEdit({ description: bin.description ?? "", status: bin.status });
    setEditOriginalStatus(bin.status);
  };

  const cancelEdit = () => {
    setEditingBinNo(null);
    updateMutation.reset();
  };

  const submitEdit = (binNo: number) => {
    // Description is replace-semantics; status is sent only when the operator actually
    // changed it, so editing a description can't clobber an occupancy flag that moved
    // under us since the list was fetched.
    const body: UpdateBinRequest = { description: edit.description.trim() || null };
    if (edit.status !== editOriginalStatus) body.status = edit.status;

    updateMutation.mutate({ binNo, body });
  };

  const columnCount = 4;

  return (
    <>
      <PageHeader
        title="Bins"
        description="Physical trays on the factory floor. Order entry claims the lowest free bin."
      />

      <Card>
        <CardHeader
          title="Bin list"
          description={`${all.length} bin${all.length === 1 ? "" : "s"} — ${freeCount} free, ${
            all.length - freeCount
          } occupied`}
          actions={
            <>
              {isFiltered && (
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  Clear column filters
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={startAdd} disabled={adding}>
                <Plus className="size-3.5" />
                Add bin
              </Button>
            </>
          }
        />

        {(createMutation.isError || updateMutation.isError) && (
          <CardBody className="border-b border-slate-200 py-3">
            <Notice
              tone="red"
              title={createMutation.isError ? "Bin was not created" : "Bin was not updated"}
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
            title="No bins on file"
            description="Add a bin for each tray on the floor. Order entry can't allocate until at least one is free."
            action={
              <Button size="sm" variant="primary" onClick={startAdd}>
                <Plus className="size-3.5" />
                Add bin
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th {...th("binNo")}>Bin</Th>
                <Th {...th("description")} filter={colFilter("description")}>
                  Description
                </Th>
                <Th {...th("status")} filter={colFilter("status")}>
                  Status
                </Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adding && (
                <tr className="bg-sky-50/60">
                  <Td>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      autoFocus
                      value={draft.binNo}
                      placeholder="No."
                      onChange={(event) =>
                        setDraft({ ...draft, binNo: event.target.value })
                      }
                      className="w-24"
                    />
                    {draftIsDuplicate && (
                      <span className="mt-1 block text-xs text-red-600">
                        Bin {draftBinNo} already exists.
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Input
                      value={draft.description}
                      maxLength={DESCRIPTION_MAX}
                      placeholder="Description"
                      onChange={(event) =>
                        setDraft({ ...draft, description: event.target.value })
                      }
                    />
                  </Td>
                  <Td>
                    <Select
                      value={draft.status}
                      onChange={(event) =>
                        setDraft({ ...draft, status: event.target.value as BinStatus })
                      }
                      className="w-32"
                    >
                      <option value="Free">Free</option>
                      <option value="Occupied">Occupied</option>
                    </Select>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={createMutation.isPending}
                        disabled={!draftBinNoValid || draftIsDuplicate}
                        onClick={submitAdd}
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
                  <td colSpan={columnCount} className="px-4 py-8">
                    <EmptyState
                      title="No bins match the selected filters"
                      action={
                        <Button size="sm" variant="secondary" onClick={clearAll}>
                          Clear column filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered?.map((bin) => {
                  const isEditing = editingBinNo === bin.binNo;
                  const occupied = bin.status === "Occupied";

                  if (isEditing) {
                    return (
                      <tr key={bin.binNo} className="bg-sky-50/60">
                        <Td>
                          <span className="font-medium text-slate-900">{bin.binNo}</span>
                        </Td>
                        <Td>
                          <Input
                            autoFocus
                            value={edit.description}
                            maxLength={DESCRIPTION_MAX}
                            placeholder="Description"
                            onChange={(event) =>
                              setEdit({ ...edit, description: event.target.value })
                            }
                          />
                        </Td>
                        <Td>
                          <Select
                            value={edit.status}
                            onChange={(event) =>
                              setEdit({ ...edit, status: event.target.value as BinStatus })
                            }
                            className="w-32"
                          >
                            <option value="Free">Free</option>
                            <option value="Occupied">Occupied</option>
                          </Select>
                        </Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="primary"
                              loading={updateMutation.isPending}
                              onClick={() => submitEdit(bin.binNo)}
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
                    <tr key={bin.binNo} className="hover:bg-slate-50">
                      <Td>
                        <span className="font-medium text-slate-900">{bin.binNo}</span>
                      </Td>
                      <Td>{text(bin.description)}</Td>
                      <Td>
                        <Badge tone={occupied ? "amber" : "green"}>{bin.status}</Badge>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit bin"
                            onClick={() => startEdit(bin)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={occupied}
                            title={
                              occupied
                                ? "Bin is occupied by a live order — mark it free first"
                                : "Delete bin"
                            }
                            onClick={() => setDeleting(bin)}
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
            Bin numbers are typed by hand and must be unique. An occupied bin can&apos;t be
            deleted — if a bin is stuck occupied with no live order behind it, mark it free
            first, then delete.
          </p>
        </CardBody>
      </Card>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete bin ${deleting.binNo}?` : "Delete bin"}
        description="The tray is removed from the allocation list. This cannot be undone."
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.binNo)}
            >
              Delete bin
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Notice tone="red" title="Bin was not deleted">
            {(deleteMutation.error as Error).message}
          </Notice>
        ) : (
          <p className="text-sm text-slate-600">
            Bin {deleting?.binNo}
            {deleting?.description?.trim() ? ` (${deleting.description.trim()})` : ""} will no
            longer be offered to order entry.
          </p>
        )}
      </Modal>
    </>
  );
}
