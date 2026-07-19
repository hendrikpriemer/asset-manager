"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createAsset, updateAsset } from "@/lib/actions";
import type { StructureOption } from "@/lib/asset-structure";
import { Button } from "@/components/Button";
import { ImageCaptureField } from "@/components/ImageCaptureField";

const STEPS = [
  "Identify",
  "Photos",
  "Assign to asset structure",
  "Summary",
] as const;

const FIELD_CLASSES =
  "rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

type AssetWizardProps = {
  structureOptions: StructureOption[];
  successHref?: string;
} & (
  | { mode: "create" }
  | {
      mode: "edit";
      assetId: string;
      initialName: string;
      initialDescription: string;
      initialStructureNodeId: string;
      existingAssetImageUrl: string | null;
      existingNameplateImageUrl: string | null;
    }
);

export function AssetWizard(props: AssetWizardProps) {
  const isEdit = props.mode === "edit";
  const { structureOptions, successHref } = props;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(isEdit ? props.initialName : "");
  const [description, setDescription] = useState(
    isEdit ? props.initialDescription : ""
  );
  const [structureNodeId, setStructureNodeId] = useState(
    isEdit ? props.initialStructureNodeId : ""
  );
  const [assetImageFile, setAssetImageFile] = useState<File | null>(null);
  const [assetImageRemoved, setAssetImageRemoved] = useState(false);
  const [nameplateImageFile, setNameplateImageFile] = useState<File | null>(
    null
  );
  const [nameplateImageRemoved, setNameplateImageRemoved] = useState(false);

  const action = isEdit ? updateAsset.bind(null, props.assetId) : createAsset;
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      if (successHref) {
        router.push(successHref);
      } else {
        router.back();
      }
    }
    wasPending.current = pending;
  }, [pending, state, successHref, router]);

  const hasStructure = structureOptions.length > 0;
  const selectedOption = structureOptions.find(
    (option) => option.id === structureNodeId
  );
  const canLeaveIdentifyStep =
    name.trim().length > 0 && description.trim().length > 0;
  const isLastStep = step === STEPS.length - 1;

  const existingAssetImageUrl = isEdit ? props.existingAssetImageUrl : null;
  const existingNameplateImageUrl = isEdit
    ? props.existingNameplateImageUrl
    : null;

  function goNext() {
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleAssetImageChange(file: File | null) {
    setAssetImageFile(file);
    setAssetImageRemoved(file === null);
  }

  function handleNameplateImageChange(file: File | null) {
    setNameplateImageFile(file);
    setNameplateImageRemoved(file === null);
  }

  function handleApply() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("structureNodeId", structureNodeId);
    if (assetImageFile) {
      formData.set("assetImage", assetImageFile);
    } else if (isEdit && assetImageRemoved) {
      formData.set("assetImageRemoved", "true");
    }
    if (nameplateImageFile) {
      formData.set("nameplateImage", nameplateImageFile);
    } else if (isEdit && nameplateImageRemoved) {
      formData.set("nameplateImageRemoved", "true");
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  const heading = isEdit ? "Edit asset" : "Add new asset";
  const introText = isEdit
    ? "Edit the asset's details, update its photos, and reassign it to a level in the asset structure."
    : "Add a new asset, enter the required details, and assign it to a level in the asset structure.";
  const applyLabel = isEdit ? "Save" : "Apply";
  const applyPendingLabel = isEdit ? "Saving…" : "Applying…";

  return (
    <div className="flex w-full flex-col gap-6 lg:w-[42rem] lg:flex-row lg:gap-8">
      <div className="flex shrink-0 flex-col gap-4 border-b border-outline-variant pb-4 lg:w-64 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
        <div className="flex flex-col gap-1">
          <h1 className="md-title-large text-on-surface">{heading}</h1>
          <p className="md-body-medium text-on-surface-variant">
            {introText}
          </p>
        </div>
        <ol className="flex flex-col gap-4">
          {STEPS.map((label, index) => {
            const isActive = index <= step;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full md-label-large ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`md-label-large ${
                    isActive ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="w-fit rounded-full bg-secondary-container px-3 py-1 md-label-medium text-on-secondary-container">
            Step {step + 1} of {STEPS.length}
          </span>
          {step > 0 && name && (
            <span className="md-body-medium text-on-surface-variant">
              {name}
            </span>
          )}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="md-title-medium text-on-surface">Identify</h2>
              <p className="md-body-medium text-on-surface-variant">
                Enter a name and a description for the asset.
              </p>
            </div>
            <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                className={FIELD_CLASSES}
              />
            </label>
            <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={FIELD_CLASSES}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="md-title-medium text-on-surface">Photos</h2>
              <p className="md-body-medium text-on-surface-variant">
                Optionally add a photo of the asset and a photo of its
                nameplate. You can skip this step.
              </p>
            </div>
            <ImageCaptureField
              label="Asset photo"
              file={assetImageFile}
              existingImageUrl={assetImageRemoved ? null : existingAssetImageUrl}
              onChange={handleAssetImageChange}
            />
            <ImageCaptureField
              label="Nameplate photo"
              file={nameplateImageFile}
              existingImageUrl={
                nameplateImageRemoved ? null : existingNameplateImageUrl
              }
              onChange={handleNameplateImageChange}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="md-title-medium text-on-surface">
                Assign to asset structure
              </h2>
              <p className="md-body-medium text-on-surface-variant">
                {hasStructure
                  ? "Assign the asset to a level in the asset structure, or leave it unassigned."
                  : "No asset structure exists yet, so the asset will be added to Unassigned Assets."}
              </p>
            </div>
            {hasStructure && (
              <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
                Structure
                <select
                  value={structureNodeId}
                  onChange={(event) => setStructureNodeId(event.target.value)}
                  className={FIELD_CLASSES}
                >
                  <option value="">Unassigned</option>
                  {structureOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="md-title-medium text-on-surface">Summary</h2>
              <p className="md-body-medium text-on-surface-variant">
                Review the details, then select {applyLabel} to{" "}
                {isEdit ? "update the asset" : "create the asset"}.
              </p>
            </div>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="md-label-large text-on-surface">Name</dt>
                <dd className="md-body-medium text-on-surface-variant">
                  {name}
                </dd>
              </div>
              <div>
                <dt className="md-label-large text-on-surface">
                  Description
                </dt>
                <dd className="md-body-medium text-on-surface-variant">
                  {description}
                </dd>
              </div>
              <div>
                <dt className="md-label-large text-on-surface">Structure</dt>
                <dd className="md-body-medium text-on-surface-variant">
                  {selectedOption?.label ?? "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="md-label-large text-on-surface">
                  Asset photo
                </dt>
                <dd className="md-body-medium text-on-surface-variant">
                  {assetImageFile || (!assetImageRemoved && existingAssetImageUrl)
                    ? "Provided"
                    : "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="md-label-large text-on-surface">
                  Nameplate photo
                </dt>
                <dd className="md-body-medium text-on-surface-variant">
                  {nameplateImageFile ||
                  (!nameplateImageRemoved && existingNameplateImageUrl)
                    ? "Provided"
                    : "Not provided"}
                </dd>
              </div>
            </dl>
            {state.error && (
              <p role="alert" className="md-body-small text-error">
                {state.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
          {step > 0 && (
            <Button
              type="button"
              variant="text"
              onClick={goBack}
              disabled={pending}
            >
              Go back
            </Button>
          )}
          {isLastStep ? (
            <Button type="button" onClick={handleApply} disabled={pending}>
              {pending ? applyPendingLabel : applyLabel}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={step === 0 && !canLeaveIdentifyStep}
            >
              Next step
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
