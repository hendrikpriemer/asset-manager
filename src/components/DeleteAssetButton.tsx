"use client";

import { useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

export function DeleteAssetButton({
  assetId,
  assetName,
  deleteAssetAction,
}: {
  assetId: string;
  assetName: string;
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
      variant="icon"
      color="error"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Delete ${assetName}`}
    >
      <Icon name="delete" />
    </Button>
  );
}
