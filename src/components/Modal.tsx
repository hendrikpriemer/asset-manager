"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="float-right text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
