"use client";

import { useActionState } from "react";
import {
  createAasRepository,
  deleteAasRepository,
} from "@/lib/aas-repository-actions";
import { Button } from "@/components/Button";
import { DeleteAasRepositoryButton } from "@/components/DeleteAasRepositoryButton";
import { Tooltip } from "@/components/Tooltip";

const FIELD_CLASSES =
  "rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

type AasRepositoryListItem = { id: string; name: string; baseUrl: string };

export function AasRepositoriesSection({
  repositories,
}: {
  repositories: AasRepositoryListItem[];
}) {
  const [state, formAction, pending] = useActionState(createAasRepository, {
    error: null,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="md-headline-small text-on-surface">
          AAS Repositories
        </h1>
        <p className="md-body-medium text-on-surface-variant">
          When an asset is linked by global asset ID, every repository
          configured here is searched in turn until one of them has a
          matching shell.
        </p>
      </div>

      {repositories.length === 0 ? (
        <p className="md-body-medium text-on-surface-variant">
          No repositories configured yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {repositories.map((repository) => (
            <li
              key={repository.id}
              className="flex items-center justify-between gap-4 rounded-xs border border-outline-variant px-4 py-3"
            >
              <div className="flex flex-col">
                <span className="md-label-large text-on-surface">
                  {repository.name}
                </span>
                <span className="md-body-small text-on-surface-variant">
                  {repository.baseUrl}
                </span>
              </div>
              <Tooltip label="Delete">
                <DeleteAasRepositoryButton
                  repositoryId={repository.id}
                  repositoryName={repository.name}
                  deleteAasRepositoryAction={deleteAasRepository}
                />
              </Tooltip>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex max-w-md flex-col gap-4">
        <h2 className="md-title-medium text-on-surface">Add repository</h2>
        <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
          Name
          <input
            name="name"
            required
            maxLength={200}
            placeholder="e.g. WAGO"
            className={FIELD_CLASSES}
          />
        </label>
        <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
          Base URL
          <input
            name="baseUrl"
            required
            placeholder="https://c1.api.wago.com/smartdata-aas-env"
            className={FIELD_CLASSES}
          />
        </label>
        {state.error && (
          <p role="alert" className="md-body-small text-error">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Adding…" : "Add repository"}
        </Button>
      </form>
    </div>
  );
}
