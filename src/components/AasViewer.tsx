"use client";

import { useState } from "react";
import type { AasData, AasSubmodelData } from "@/lib/aas";
import { extractNameplateData } from "@/lib/aas-nameplate";
import { AasElementGroupView } from "@/components/AasElementGroupView";
import { NameplateVisualization } from "@/components/NameplateVisualization";

type ViewMode = "overview" | "technical";

function submodelTitle(submodel: AasSubmodelData): string {
  return submodel.displayName || submodel.templateName || submodel.idShort || submodel.id;
}

export function AasViewer({ aasData }: { aasData: AasData }) {
  const [selectedId, setSelectedId] = useState(
    aasData.submodels[0]?.id ?? null
  );
  const [mode, setMode] = useState<ViewMode>("overview");

  if (aasData.submodels.length === 0) {
    return (
      <p className="md-body-small text-on-surface-variant">
        This AAS has no submodels.
      </p>
    );
  }

  const selected =
    aasData.submodels.find((submodel) => submodel.id === selectedId) ?? null;
  const nameplate = selected ? extractNameplateData(selected) : null;

  function selectSubmodel(id: string) {
    setSelectedId(id);
    setMode("overview");
  }

  return (
    <div className="flex gap-4">
      <ul className="flex w-56 shrink-0 flex-col gap-2">
        {aasData.submodels.map((submodel) => {
          const isSelected = submodel.id === selectedId;
          return (
            <li key={submodel.id}>
              <button
                type="button"
                onClick={() => selectSubmodel(submodel.id)}
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
          <div className="flex items-start justify-between gap-4 border-b border-outline-variant p-4">
            <div>
              <h3 className="md-title-medium text-on-surface">
                {submodelTitle(selected)}
              </h3>
              {selected.description && (
                <p className="md-body-small text-on-surface-variant">
                  {selected.description}
                </p>
              )}
            </div>
            {nameplate && (
              <div className="flex shrink-0 gap-1 rounded-full border border-outline-variant p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("overview")}
                  aria-pressed={mode === "overview"}
                  className={`rounded-full px-3 py-1 md-label-small ${
                    mode === "overview"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-on-surface/8"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setMode("technical")}
                  aria-pressed={mode === "technical"}
                  className={`rounded-full px-3 py-1 md-label-small ${
                    mode === "technical"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-on-surface/8"
                  }`}
                >
                  Technical
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto px-4">
            {nameplate && mode === "overview" ? (
              <NameplateVisualization nameplate={nameplate} />
            ) : (
              <AasElementGroupView group={selected} depth={0} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
