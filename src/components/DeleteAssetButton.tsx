"use client";

import { useTransition } from "react";

export function DeleteAssetButton({
  assetId,
  deleteAssetAction,
}: {
  assetId: string;
  deleteAssetAction: (id: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this asset?")) {
      return;
    }
    startTransition(() => deleteAssetAction(assetId));
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
