"use client";

import { useEffect, useRef } from "react";
import type { AasSubmodelFile } from "@/lib/aas";
import { detectModel3DFormat, isPdfContentType } from "@/lib/file-preview";
import { Model3DViewer } from "@/components/Model3DViewer";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

/**
 * A self-contained preview dialog (own open/close state owned by the
 * caller) - unlike `Modal.tsx`, which closes via `router.back()` for the
 * intercepting-route pattern, this has nothing to do with routing.
 */
export function FilePreviewDialog({
  file,
  fileUrl,
  onClose,
}: {
  file: AasSubmodelFile;
  fileUrl: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const format = detectModel3DFormat(file.contentType);

  useEffect(() => {
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={file.idShort || "File preview"}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface-container-high shadow-elevation-3"
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <span className="md-title-medium text-on-surface">
            {file.idShort || "File preview"}
          </span>
          <Button type="button" variant="icon" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          {isPdfContentType(file.contentType) ? (
            <iframe src={fileUrl} title={file.idShort || "PDF preview"} className="h-[75vh] w-full" />
          ) : format ? (
            <Model3DViewer fileUrl={fileUrl} format={format} />
          ) : (
            <p className="p-4 md-body-small text-on-surface-variant">
              No preview available for this file type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
