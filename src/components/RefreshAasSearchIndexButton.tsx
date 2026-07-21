"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshAasSearchIndex } from "@/lib/actions";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";

export function RefreshAasSearchIndexButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mirrorWarning, setMirrorWarning] = useState<string | null>(null);

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshAasSearchIndex(assetId);
      setError(result.error);
      setMirrorWarning(result.mirrorWarning);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="text"
        onClick={handleRefresh}
        disabled={isPending}
        className="w-fit"
      >
        <span className="flex items-center gap-2">
          {isPending && <Spinner label="Refreshing search index" />}
          {isPending ? "Refreshing…" : "Refresh search index"}
        </span>
      </Button>
      {error && (
        <p role="alert" className="md-body-small text-error">
          {error}
        </p>
      )}
      {mirrorWarning && (
        <p role="alert" className="md-body-small text-error">
          {mirrorWarning}
        </p>
      )}
    </div>
  );
}
