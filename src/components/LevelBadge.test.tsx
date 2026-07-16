import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetStructureLevel } from "@/generated/prisma/client";
import { LevelBadge } from "./LevelBadge";

describe("LevelBadge", () => {
  it.each([
    [AssetStructureLevel.ENTERPRISE, "Enterprise"],
    [AssetStructureLevel.SITE, "Site"],
    [AssetStructureLevel.AREA, "Area"],
    [AssetStructureLevel.WORK_CENTER, "Work Center"],
    [AssetStructureLevel.EQUIPMENT, "Equipment"],
  ])("renders the human-readable label for %s", (level, label) => {
    render(<LevelBadge level={level} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
