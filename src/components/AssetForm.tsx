"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { Button } from "@/components/Button";

export function AssetForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: { name: string; description: string | null };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        Name
        <input
          name="name"
          defaultValue={initialValues?.name ?? ""}
          required
          maxLength={200}
          className="rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        Description
        <textarea
          name="description"
          defaultValue={initialValues?.description ?? ""}
          className="rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      {state.error && (
        <p role="alert" className="md-body-small text-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
