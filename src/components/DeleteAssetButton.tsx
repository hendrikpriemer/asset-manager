"use client";

import { useTransition } from "react";
import { Button } from "@/components/Button";

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
    <Button
      type="button"
      variant="text"
      color="error"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}
