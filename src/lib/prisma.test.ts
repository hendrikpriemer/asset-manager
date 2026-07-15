import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type GlobalWithPrisma = typeof globalThis & { prisma?: unknown };

describe("prisma singleton", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as GlobalWithPrisma).prisma;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete (globalThis as GlobalWithPrisma).prisma;
  });

  it("creates and caches a client on globalThis outside production", async () => {
    process.env.NODE_ENV = "test";

    const { prisma } = await import("./prisma");

    expect(prisma).toBeDefined();
    expect((globalThis as GlobalWithPrisma).prisma).toBe(prisma);
  });

  it("reuses an existing client from globalThis instead of creating a new one", async () => {
    process.env.NODE_ENV = "test";
    const existing = { sentinel: true };
    (globalThis as GlobalWithPrisma).prisma = existing;

    const { prisma } = await import("./prisma");

    expect(prisma).toBe(existing);
  });

  it("does not cache the client on globalThis in production", async () => {
    process.env.NODE_ENV = "production";

    const { prisma } = await import("./prisma");

    expect(prisma).toBeDefined();
    expect((globalThis as GlobalWithPrisma).prisma).toBeUndefined();
  });
});
