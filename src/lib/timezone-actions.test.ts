import { describe, expect, it, vi } from "vitest";

const { lookupTimezoneForAddress } = vi.hoisted(() => ({
  lookupTimezoneForAddress: vi.fn(),
}));

vi.mock("@/lib/timezone", () => ({ lookupTimezoneForAddress }));

const { lookupTimezone } = await import("./timezone-actions");

describe("lookupTimezone", () => {
  it("delegates to lookupTimezoneForAddress", async () => {
    lookupTimezoneForAddress.mockResolvedValue("Europe/Berlin");

    const result = await lookupTimezone("Minden, Germany");

    expect(result).toBe("Europe/Berlin");
    expect(lookupTimezoneForAddress).toHaveBeenCalledWith("Minden, Germany");
  });
});
