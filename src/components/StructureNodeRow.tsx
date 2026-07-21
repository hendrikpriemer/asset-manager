"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import {
  createStructureNode,
  deleteStructureNode,
  moveStructureNodeDown,
  moveStructureNodeUp,
  updateStructureNode,
  type ActionState,
} from "@/lib/asset-structure-actions";
import { ADDABLE_LEVELS, LEVEL_LABELS } from "@/lib/asset-structure-schema";
import { lookupTimezone } from "@/lib/timezone-actions";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { LevelBadge } from "@/components/LevelBadge";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/ToastProvider";

type Mode = "view" | "rename" | "add";

const FIELD_CLASSES =
  "rounded-xs border border-outline bg-surface px-2 py-1 md-body-medium";

export function StructureNodeRow({
  node,
  expandedIds,
  onToggleExpand,
  isFirstChild,
  isLastChild,
}: {
  node: StructureTreeNode;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  isFirstChild: boolean;
  isLastChild: boolean;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();
  const expanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isRoot = node.parentId === null;

  const [renameAddress, setRenameAddress] = useState(node.address ?? "");
  const [renameTimezone, setRenameTimezone] = useState(node.timezone ?? "");
  const [isLookingUpRenameTimezone, startRenameTimezoneLookup] = useTransition();

  const [addLevel, setAddLevel] = useState<AssetStructureLevel>(
    ADDABLE_LEVELS[0]
  );
  const [addAddress, setAddAddress] = useState("");
  const [addTimezone, setAddTimezone] = useState("");
  const [isLookingUpAddTimezone, startAddTimezoneLookup] = useTransition();

  async function renameAction(
    prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> {
    const result = await updateStructureNode(node.id, prevState, formData);
    if (!result.error) {
      setMode("view");
      showToast("The asset structure was successfully updated.");
    }
    return result;
  }
  const [renameState, renameFormAction, renamePending] = useActionState(
    renameAction,
    { error: null }
  );

  async function addChildAction(
    prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> {
    const result = await createStructureNode(node.id, prevState, formData);
    if (!result.error) {
      setMode("view");
      showToast("Level added.");
    }
    return result;
  }
  const [addState, addFormAction, addPending] = useActionState(
    addChildAction,
    { error: null }
  );

  function openRename() {
    setRenameAddress(node.address ?? "");
    setRenameTimezone(node.timezone ?? "");
    setMode("rename");
  }

  function toggleRename() {
    if (mode === "rename") {
      setMode("view");
    } else {
      openRename();
    }
  }

  function openAdd() {
    setAddLevel(ADDABLE_LEVELS[0]);
    setAddAddress("");
    setAddTimezone("");
    setMode("add");
  }

  function toggleAdd() {
    if (mode === "add") {
      setMode("view");
    } else {
      openAdd();
    }
  }

  function handleRenameAddressBlur(address: string) {
    if (!address.trim()) return;
    startRenameTimezoneLookup(async () => {
      const timezone = await lookupTimezone(address);
      if (timezone) setRenameTimezone(timezone);
    });
  }

  function handleAddAddressBlur(address: string) {
    if (!address.trim()) return;
    startAddTimezoneLookup(async () => {
      const timezone = await lookupTimezone(address);
      if (timezone) setAddTimezone(timezone);
    });
  }

  function handleDelete() {
    const message = isRoot
      ? "Delete the entire asset structure with all its levels? Assigned assets will be moved to 'Unassigned'."
      : `Delete "${node.name}" and everything below it? Assigned assets will be moved to 'Unassigned'.`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      await deleteStructureNode(node.id);
      showToast("The asset structure was successfully updated.");
      if (isRoot) {
        router.push("/asset-structure");
      }
    });
  }

  function handleMoveUp() {
    startTransition(() => moveStructureNodeUp(node.id));
  }

  function handleMoveDown() {
    startTransition(() => moveStructureNodeDown(node.id));
  }

  return (
    <li className="list-none">
      <div className="flex items-center gap-2 rounded-xs px-2 py-2 hover:bg-on-surface/[0.04]">
        {hasChildren ? (
          <Button
            variant="icon"
            onClick={() => onToggleExpand(node.id)}
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="p-1"
          >
            <Icon name={expanded ? "expand_more" : "chevron_right"} />
          </Button>
        ) : (
          <span className="w-8" aria-hidden="true" />
        )}
        <Icon
          name="drag_indicator"
          className="text-on-surface-variant/50"
        />

        {mode === "rename" ? (
          <form
            action={renameFormAction}
            className="flex flex-1 flex-wrap items-center gap-2"
          >
            <label className="sr-only" htmlFor={`name-${node.id}`}>
              Name
            </label>
            <input
              id={`name-${node.id}`}
              name="name"
              defaultValue={node.name}
              required
              maxLength={200}
              className={FIELD_CLASSES}
            />
            <label className="sr-only" htmlFor={`description-${node.id}`}>
              Description
            </label>
            <input
              id={`description-${node.id}`}
              name="description"
              defaultValue={node.description ?? ""}
              placeholder="Description (optional)"
              className={FIELD_CLASSES}
            />
            {node.level === "SITE" && (
              <>
                <label className="sr-only" htmlFor={`address-${node.id}`}>
                  Address
                </label>
                <input
                  id={`address-${node.id}`}
                  name="address"
                  value={renameAddress}
                  onChange={(event) => setRenameAddress(event.target.value)}
                  onBlur={(event) => handleRenameAddressBlur(event.target.value)}
                  placeholder="Address (optional)"
                  className={FIELD_CLASSES}
                />
                <label className="sr-only" htmlFor={`timezone-${node.id}`}>
                  Timezone
                </label>
                <div className="relative">
                  <input
                    id={`timezone-${node.id}`}
                    name="timezone"
                    value={renameTimezone}
                    onChange={(event) => setRenameTimezone(event.target.value)}
                    placeholder={
                      isLookingUpRenameTimezone
                        ? "Detecting timezone…"
                        : "Timezone (optional)"
                    }
                    className={`${FIELD_CLASSES} ${isLookingUpRenameTimezone ? "pr-8" : ""}`}
                  />
                  {isLookingUpRenameTimezone && (
                    <Spinner
                      label="Detecting timezone"
                      className="absolute top-1/2 right-2 -translate-y-1/2"
                    />
                  )}
                </div>
              </>
            )}
            {node.level === "EQUIPMENT" && (
              <>
                <label className="sr-only" htmlFor={`manufacturer-${node.id}`}>
                  Manufacturer
                </label>
                <input
                  id={`manufacturer-${node.id}`}
                  name="manufacturer"
                  defaultValue={node.manufacturer ?? ""}
                  placeholder="Manufacturer (optional)"
                  className={FIELD_CLASSES}
                />
                <label className="sr-only" htmlFor={`serialNumber-${node.id}`}>
                  Serial number
                </label>
                <input
                  id={`serialNumber-${node.id}`}
                  name="serialNumber"
                  defaultValue={node.serialNumber ?? ""}
                  placeholder="Serial number (optional)"
                  className={FIELD_CLASSES}
                />
              </>
            )}
            {renameState.error && (
              <p role="alert" className="md-body-small text-error">
                {renameState.error}
              </p>
            )}
            <Button type="submit" disabled={renamePending} className="px-4 py-1">
              Save
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={() => setMode("view")}
              className="px-4 py-1"
            >
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <span className="md-body-medium text-on-surface">{node.name}</span>
            <LevelBadge level={node.level} />
            {node.description && (
              <span className="md-body-small text-on-surface-variant">
                {node.description}
              </span>
            )}
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="icon"
            onClick={handleMoveUp}
            disabled={isFirstChild || isPending}
            aria-label={`Move ${node.name} up`}
            className="p-1"
          >
            <Icon name="arrow_upward" />
          </Button>
          <Button
            variant="icon"
            onClick={handleMoveDown}
            disabled={isLastChild || isPending}
            aria-label={`Move ${node.name} down`}
            className="p-1"
          >
            <Icon name="arrow_downward" />
          </Button>
          <Button variant="text" onClick={toggleRename}>
            Rename
          </Button>
          <Button variant="text" onClick={toggleAdd}>
            Add child
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      {mode === "add" && (
        <form
          action={addFormAction}
          className="ml-10 flex flex-wrap items-center gap-2 rounded-xs bg-surface-container-low p-3"
        >
          <label className="sr-only" htmlFor={`level-${node.id}`}>
            Level
          </label>
          <select
            id={`level-${node.id}`}
            name="level"
            value={addLevel}
            onChange={(event) =>
              setAddLevel(event.target.value as AssetStructureLevel)
            }
            className={FIELD_CLASSES}
          >
            {ADDABLE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`new-name-${node.id}`}>
            Name
          </label>
          <input
            id={`new-name-${node.id}`}
            name="name"
            placeholder="Name"
            required
            maxLength={200}
            className={FIELD_CLASSES}
          />
          <label className="sr-only" htmlFor={`new-description-${node.id}`}>
            Description
          </label>
          <input
            id={`new-description-${node.id}`}
            name="description"
            placeholder="Description (optional)"
            className={FIELD_CLASSES}
          />
          {addLevel === "SITE" && (
            <>
              <label className="sr-only" htmlFor={`new-address-${node.id}`}>
                Address
              </label>
              <input
                id={`new-address-${node.id}`}
                name="address"
                value={addAddress}
                onChange={(event) => setAddAddress(event.target.value)}
                onBlur={(event) => handleAddAddressBlur(event.target.value)}
                placeholder="Address (optional)"
                className={FIELD_CLASSES}
              />
              <label className="sr-only" htmlFor={`new-timezone-${node.id}`}>
                Timezone
              </label>
              <div className="relative">
                <input
                  id={`new-timezone-${node.id}`}
                  name="timezone"
                  value={addTimezone}
                  onChange={(event) => setAddTimezone(event.target.value)}
                  placeholder={
                    isLookingUpAddTimezone
                      ? "Detecting timezone…"
                      : "Timezone (optional)"
                  }
                  className={`${FIELD_CLASSES} ${isLookingUpAddTimezone ? "pr-8" : ""}`}
                />
                {isLookingUpAddTimezone && (
                  <Spinner
                    label="Detecting timezone"
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                  />
                )}
              </div>
            </>
          )}
          {addLevel === "EQUIPMENT" && (
            <>
              <label className="sr-only" htmlFor={`new-manufacturer-${node.id}`}>
                Manufacturer
              </label>
              <input
                id={`new-manufacturer-${node.id}`}
                name="manufacturer"
                placeholder="Manufacturer (optional)"
                className={FIELD_CLASSES}
              />
              <label className="sr-only" htmlFor={`new-serialNumber-${node.id}`}>
                Serial number
              </label>
              <input
                id={`new-serialNumber-${node.id}`}
                name="serialNumber"
                placeholder="Serial number (optional)"
                className={FIELD_CLASSES}
              />
            </>
          )}
          {addState.error && (
            <p role="alert" className="md-body-small text-error">
              {addState.error}
            </p>
          )}
          <Button type="submit" disabled={addPending} className="px-4 py-1">
            Create
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={() => setMode("view")}
            className="px-4 py-1"
          >
            Cancel
          </Button>
        </form>
      )}

      {expanded && hasChildren && (
        <ul className="ml-6 border-l border-outline-variant pl-2">
          {node.children.map((child, index) => (
            <StructureNodeRow
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              isFirstChild={index === 0}
              isLastChild={index === node.children.length - 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
