"use client";

import { useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

export function DeleteVisionProviderButton({
  deleteVisionProviderAction,
}: {
  deleteVisionProviderAction: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm("Disable the vision-API fallback and remove the stored API key?")
    ) {
      return;
    }
    startTransition(() => deleteVisionProviderAction());
  }

  return (
    <Button
      type="button"
      variant="icon"
      color="error"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete vision provider"
    >
      <Icon name="delete" />
    </Button>
  );
}
