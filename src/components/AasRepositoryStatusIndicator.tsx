"use client";

import { useEffect, useState, useTransition } from "react";
import { testAasRepositoryConnection } from "@/lib/aas-repository-actions";

const POLL_INTERVAL_MS = 30_000;

type Status = "connecting" | "reachable" | "unreachable";

const DOT_CLASSES: Record<Status, string> = {
  connecting: "bg-yellow-500",
  reachable: "bg-green-600",
  unreachable: "bg-error",
};

const LABEL: Record<Status, string> = {
  connecting: "Connecting…",
  reachable: "Connected",
  unreachable: "Not connected",
};

export function AasRepositoryStatusIndicator({ baseUrl }: { baseUrl: string }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [, startCheck] = useTransition();

  useEffect(() => {
    let cancelled = false;

    function check() {
      setStatus("connecting");
      startCheck(async () => {
        const result = await testAasRepositoryConnection(baseUrl);
        if (!cancelled) {
          setStatus(result.status === "reachable" ? "reachable" : "unreachable");
        }
      });
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [baseUrl]);

  return (
    <span
      role="status"
      className="flex items-center gap-1.5 md-body-small text-on-surface-variant"
    >
      <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[status]}`} aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
