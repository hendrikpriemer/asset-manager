"use client";

import { useActionState } from "react";
import { createAssetStructureRoot } from "@/lib/asset-structure-actions";
import { Button } from "@/components/Button";

export function CreateAssetStructureSection() {
  const [state, formAction, pending] = useActionState(
    createAssetStructureRoot,
    { error: null }
  );

  return (
    <>
      <h1 className="md-headline-small text-on-surface">
        Create asset structure
      </h1>
      <form action={formAction} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
          Name
          <input
            name="name"
            required
            maxLength={200}
            placeholder="e.g. Acme Corporation"
            className="rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
          Description
          <textarea
            name="description"
            className="rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        {state.error && (
          <p role="alert" className="md-body-small text-error">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Creating…" : "Create"}
        </Button>
      </form>
    </>
  );
}
