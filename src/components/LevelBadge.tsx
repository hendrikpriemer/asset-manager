import type { AssetStructureLevel } from "@/generated/prisma/client";
import { LEVEL_LABELS } from "@/lib/asset-structure-schema";

export function LevelBadge({ level }: { level: AssetStructureLevel }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary-container px-2 py-0.5 md-label-small text-on-secondary-container">
      {LEVEL_LABELS[level]}
    </span>
  );
}
