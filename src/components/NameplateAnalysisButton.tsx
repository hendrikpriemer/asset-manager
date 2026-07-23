"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeNameplatePhoto,
  linkAssetToMatchedAas,
  publishManualNameplate,
  type NameplateAnalysisResult,
} from "@/lib/nameplate-generation-actions";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";

type ManualFormState = {
  manufacturerName: string;
  productDesignation: string;
  orderCode: string;
  serialNumber: string;
  yearOfConstruction: string;
  street: string;
  zipcode: string;
  cityTown: string;
  nationalCode: string;
};

const EMPTY_MANUAL_FORM: ManualFormState = {
  manufacturerName: "",
  productDesignation: "",
  orderCode: "",
  serialNumber: "",
  yearOfConstruction: "",
  street: "",
  zipcode: "",
  cityTown: "",
  nationalCode: "",
};

function manualFormFromGuess(
  result: Extract<NameplateAnalysisResult, { status: "no-match" }>
): ManualFormState {
  return {
    ...EMPTY_MANUAL_FORM,
    manufacturerName: result.manufacturerNameGuess ?? "",
    orderCode: result.articleNumberGuess ?? "",
  };
}

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function NameplateAnalysisButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<NameplateAnalysisResult | null>(null);
  const [manualForm, setManualForm] = useState<ManualFormState>(EMPTY_MANUAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setIsOpen(false);
    setResult(null);
    setError(null);
  }

  function openAndAnalyze() {
    setIsOpen(true);
    setError(null);
    startTransition(async () => {
      const analysis = await analyzeNameplatePhoto(assetId);
      setResult(analysis);
      if (analysis.status === "no-match") {
        setManualForm(manualFormFromGuess(analysis));
      }
    });
  }

  function confirmLink(globalAssetId: string) {
    startTransition(async () => {
      await linkAssetToMatchedAas(assetId, globalAssetId);
      close();
      router.refresh();
    });
  }

  function submitManualForm() {
    startTransition(async () => {
      const { error: publishError } = await publishManualNameplate(assetId, {
        manufacturerName: nullIfBlank(manualForm.manufacturerName),
        productDesignation: nullIfBlank(manualForm.productDesignation),
        orderCode: nullIfBlank(manualForm.orderCode),
        serialNumber: nullIfBlank(manualForm.serialNumber),
        yearOfConstruction: nullIfBlank(manualForm.yearOfConstruction),
        street: nullIfBlank(manualForm.street),
        zipcode: nullIfBlank(manualForm.zipcode),
        cityTown: nullIfBlank(manualForm.cityTown),
        nationalCode: nullIfBlank(manualForm.nationalCode),
      });
      if (publishError) {
        setError(publishError);
        return;
      }
      close();
      router.refresh();
    });
  }

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <Button type="button" variant="text" className="w-fit" onClick={openAndAnalyze}>
        Analyze nameplate
      </Button>

      {isOpen && (
        <div onClick={close} className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Nameplate analysis"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl bg-surface-container-high p-4 shadow-elevation-3"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="md-title-medium text-on-surface">Nameplate analysis</span>
              <Button type="button" variant="icon" onClick={close} aria-label="Close">
                <Icon name="close" />
              </Button>
            </div>

            {(isPending || result === null) && (
              <div className="flex items-center justify-center py-8">
                <Spinner label="Analyzing nameplate photo" />
              </div>
            )}

            {!isPending && result?.status === "no-photo" && (
              <p className="md-body-small text-on-surface-variant">
                This asset has no nameplate photo to analyze.
              </p>
            )}

            {!isPending && result?.status === "matched" && (
              <div className="flex flex-col gap-3">
                <p className="md-body-medium text-on-surface">
                  Recognized as a real product in a linked AAS repository:
                </p>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 md-body-small">
                  <dt className="text-on-surface-variant">Manufacturer</dt>
                  <dd className="text-on-surface">{result.manufacturerName ?? "—"}</dd>
                  <dt className="text-on-surface-variant">Product</dt>
                  <dd className="text-on-surface">{result.productDesignation ?? "—"}</dd>
                </dl>
                <Button
                  type="button"
                  onClick={() => confirmLink(result.globalAssetId)}
                  className="w-fit"
                >
                  Link asset to this product
                </Button>
              </div>
            )}

            {!isPending && result?.status === "no-match" && (
              <div className="flex flex-col gap-3">
                <p className="md-body-small text-on-surface-variant">
                  No matching product was found in a linked AAS repository. Review and complete
                  the fields recognized from the photo, then publish them as this asset&apos;s
                  own Nameplate.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Manufacturer
                    <input
                      value={manualForm.manufacturerName}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, manufacturerName: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Product designation
                    <input
                      value={manualForm.productDesignation}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, productDesignation: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Order code
                    <input
                      value={manualForm.orderCode}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, orderCode: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Serial number
                    <input
                      value={manualForm.serialNumber}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, serialNumber: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Year of construction
                    <input
                      value={manualForm.yearOfConstruction}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, yearOfConstruction: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Street
                    <input
                      value={manualForm.street}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, street: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Zip code
                    <input
                      value={manualForm.zipcode}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, zipcode: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    City/Town
                    <input
                      value={manualForm.cityTown}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, cityTown: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1 md-label-small text-on-surface-variant">
                    Country code
                    <input
                      value={manualForm.nationalCode}
                      onChange={(event) =>
                        setManualForm({ ...manualForm, nationalCode: event.target.value })
                      }
                      className="rounded-xs border border-outline-variant bg-surface px-2 py-1 md-body-small text-on-surface"
                    />
                  </label>
                </div>
                <details className="md-body-small text-on-surface-variant">
                  <summary className="cursor-pointer">Show recognized (OCR) text</summary>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-xs bg-surface p-2 text-xs">
                    {result.rawText}
                  </pre>
                </details>
                {error && (
                  <p role="alert" className="md-body-small text-error">
                    {error}
                  </p>
                )}
                <Button type="button" onClick={submitManualForm} className="w-fit">
                  Publish as this asset&apos;s Nameplate
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
