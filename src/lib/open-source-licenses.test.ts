import { describe, expect, it } from "vitest";
import { OPEN_SOURCE_LICENSES } from "./open-source-licenses";

describe("OPEN_SOURCE_LICENSES", () => {
  it("is not empty", () => {
    expect(OPEN_SOURCE_LICENSES.length).toBeGreaterThan(0);
  });

  it("gives every entry a non-empty name, version, and license", () => {
    for (const entry of OPEN_SOURCE_LICENSES) {
      expect(entry.name).not.toBe("");
      expect(entry.version).not.toBe("");
      expect(entry.license).not.toBe("");
    }
  });

  it("includes the core runtime dependencies with their license types", () => {
    const byName = Object.fromEntries(
      OPEN_SOURCE_LICENSES.map((entry) => [entry.name, entry.license])
    );

    expect(byName["next"]).toBe("MIT");
    expect(byName["react"]).toBe("MIT");
    expect(byName["react-dom"]).toBe("MIT");
    expect(byName["@prisma/client"]).toBe("Apache-2.0");
    expect(byName["@prisma/adapter-pg"]).toBe("Apache-2.0");
  });
});
