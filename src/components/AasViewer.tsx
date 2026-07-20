"use client";

import { useState } from "react";
import type { AasData, AasElementGroup, AasSubmodelData } from "@/lib/aas";
import { Icon } from "@/components/Icon";

function submodelTitle(submodel: AasSubmodelData): string {
  return submodel.displayName || submodel.templateName || submodel.idShort || submodel.id;
}

function groupTitle(group: AasElementGroup): string {
  return group.displayName || group.idShort;
}

function ElementGroupView({
  group,
  depth,
}: {
  group: AasElementGroup;
  depth: number;
}) {
  const indent = { paddingLeft: `${depth * 16}px` };

  return (
    <>
      {(group.properties.length > 0 || group.files.length > 0) && (
        <dl className="grid grid-cols-[max-content_1fr]">
          {group.properties.map((property, index) => (
            <div
              key={`${property.idShort}-${index}`}
              className="contents odd:bg-surface-container-low"
            >
              <dt
                style={indent}
                className="py-2 pr-4 md-body-small text-on-surface-variant"
              >
                {property.idShort}
              </dt>
              <dd className="py-2 pr-2 md-body-small text-on-surface">
                {property.value ?? "—"}
              </dd>
            </div>
          ))}
          {group.files.map((file, index) => (
            <div
              key={`${file.idShort}-${index}`}
              className="contents odd:bg-surface-container-low"
            >
              <dt
                style={indent}
                className="py-2 pr-4 md-body-small text-on-surface-variant"
              >
                {file.idShort || "File"}
              </dt>
              <dd className="py-2 pr-2 md-body-small">
                {file.value ? (
                  <a
                    href={file.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {file.contentType ?? "Download"}
                  </a>
                ) : (
                  <span className="text-on-surface-variant">
                    {file.contentType ?? "—"}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {group.groups.map((child) => (
        <div key={child.idShort}>
          <div
            style={indent}
            className="flex items-center gap-2 border-t border-outline-variant bg-surface-container-low py-2"
          >
            <Icon name="folder" className="text-on-surface-variant" />
            <span className="md-title-small text-on-surface">
              {groupTitle(child)}
            </span>
          </div>
          <ElementGroupView group={child} depth={depth + 1} />
        </div>
      ))}
    </>
  );
}

export function AasViewer({ aasData }: { aasData: AasData }) {
  const [selectedId, setSelectedId] = useState(
    aasData.submodels[0]?.id ?? null
  );

  if (aasData.submodels.length === 0) {
    return (
      <p className="md-body-small text-on-surface-variant">
        This AAS has no submodels.
      </p>
    );
  }

  const selected =
    aasData.submodels.find((submodel) => submodel.id === selectedId) ?? null;

  return (
    <div className="flex gap-4">
      <ul className="flex w-56 shrink-0 flex-col gap-2">
        {aasData.submodels.map((submodel) => {
          const isSelected = submodel.id === selectedId;
          return (
            <li key={submodel.id}>
              <button
                type="button"
                onClick={() => setSelectedId(submodel.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`flex w-full items-center gap-2 rounded-xs border px-3 py-2 text-left ${
                  isSelected
                    ? "border-primary bg-primary-container/40"
                    : "border-outline-variant hover:bg-on-surface/8"
                }`}
              >
                <span className="rounded-xs bg-secondary-container px-1.5 py-0.5 md-label-small text-on-secondary-container">
                  SM
                </span>
                <span
                  className={`flex-1 truncate md-body-small ${
                    isSelected ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {submodelTitle(submodel)}
                </span>
                {submodel.version && (
                  <span className="md-label-small text-on-surface-variant">
                    v{submodel.version}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="min-w-0 flex-1 rounded-xs border border-outline-variant">
          <div className="border-b border-outline-variant p-4">
            <h3 className="md-title-medium text-on-surface">
              {submodelTitle(selected)}
            </h3>
            {selected.description && (
              <p className="md-body-small text-on-surface-variant">
                {selected.description}
              </p>
            )}
          </div>
          <div className="overflow-x-auto px-4">
            <ElementGroupView group={selected} depth={0} />
          </div>
        </div>
      )}
    </div>
  );
}
