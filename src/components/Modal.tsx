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
        className="w-full max-w-md rounded-xl bg-surface-container-high p-6 shadow-elevation-3"
      >
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
  );
}
