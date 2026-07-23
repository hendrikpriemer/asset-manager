import Link from "next/link";
import { deleteAasRepository } from "@/lib/aas-repository-actions";
import { AasRepositoryStatusIndicator } from "@/components/AasRepositoryStatusIndicator";
import { BackLink } from "@/components/BackLink";
import { DeleteAasRepositoryButton } from "@/components/DeleteAasRepositoryButton";
import { Icon } from "@/components/Icon";
import { Tooltip } from "@/components/Tooltip";

type AasRepositoryListItem = {
  id: string;
  name: string;
  baseUrl: string;
  isLocalMirror: boolean;
};

export function AasRepositoriesSection({
  repositories,
}: {
  repositories: AasRepositoryListItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/settings" label="Settings" />
      <div className="flex items-start justify-between gap-4">
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
        <Tooltip label="Add repository">
          <Link
            href="/settings/aas-repositories/new"
            aria-label="Add repository"
            className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-on-primary lg:px-6"
          >
            <Icon name="add" />
            <span className="hidden md-label-large lg:inline">
              Add repository
            </span>
          </Link>
        </Tooltip>
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
                <span className="flex items-center gap-2 md-label-large text-on-surface">
                  {repository.name}
                  {repository.isLocalMirror && (
                    <span className="rounded-full bg-primary-container px-2 py-0.5 md-label-small text-on-primary-container">
                      Local mirror
                    </span>
                  )}
                </span>
                <span className="md-body-small text-on-surface-variant">
                  {repository.baseUrl}
                </span>
                <AasRepositoryStatusIndicator baseUrl={repository.baseUrl} />
              </div>
              {!repository.isLocalMirror && (
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip label="Edit">
                    <Link
                      href={`/settings/aas-repositories/edit/${repository.id}`}
                      aria-label={`Edit ${repository.name}`}
                      className="inline-flex items-center justify-center rounded-full p-2 text-on-surface-variant hover:bg-on-surface/8"
                    >
                      <Icon name="edit" />
                    </Link>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <DeleteAasRepositoryButton
                      repositoryId={repository.id}
                      repositoryName={repository.name}
                      deleteAasRepositoryAction={deleteAasRepository}
                    />
                  </Tooltip>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
