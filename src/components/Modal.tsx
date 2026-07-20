"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    router.back();
  }

  useEffect(() => {
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-fit max-w-[min(64rem,90vw)] overflow-hidden rounded-xl bg-surface-container-high shadow-elevation-3"
      >
        {/* Scrolling happens in this inner box so the straight-edged
            scrollbar gets clipped by the outer box's rounded corners
            instead of visually poking out past them. */}
        <div className="max-h-[85vh] overflow-y-auto overflow-x-auto p-6 md-scrollbar">
          <Button
            type="button"
            variant="icon"
            onClick={close}
            aria-label="Close"
            className="float-right"
          >
            <Icon name="close" />
          </Button>
          {children}
        </div>
      </div>
    </div>
  );
}
