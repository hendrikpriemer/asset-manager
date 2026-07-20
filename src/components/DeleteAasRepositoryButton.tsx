"use client";

import { useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

export function DeleteAasRepositoryButton({
  repositoryId,
  repositoryName,
  deleteAasRepositoryAction,
}: {
  repositoryId: string;
  repositoryName: string;
  deleteAasRepositoryAction: (id: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete the "${repositoryName}" repository?`)) {
      return;
    }
    startTransition(() => deleteAasRepositoryAction(repositoryId));
  }

  return (
    <Button
      type="button"
      variant="icon"
      color="error"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Delete ${repositoryName}`}
    >
      <Icon name="delete" />
    </Button>
  );
}
