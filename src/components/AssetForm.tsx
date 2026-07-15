"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";

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
      <label className="flex flex-col gap-1">
        Name
        <input
          name="name"
          defaultValue={initialValues?.name ?? ""}
          required
          maxLength={200}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Description
        <textarea
          name="description"
          defaultValue={initialValues?.description ?? ""}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
