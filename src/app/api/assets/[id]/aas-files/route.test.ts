import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAssetById } = vi.hoisted(() => ({ getAssetById: vi.fn() }));
const { getAasData } = vi.hoisted(() => ({ getAasData: vi.fn() }));
const { assertPubliclyRoutableUrl } = vi.hoisted(() => ({
  assertPubliclyRoutableUrl: vi.fn(),
}));

vi.mock("@/lib/assets", () => ({ getAssetById }));
vi.mock("@/lib/aas", () => ({ getAasData }));
vi.mock("@/lib/url-safety", () => ({ assertPubliclyRoutableUrl }));

const { GET } = await import("./route");

const asset = { id: "asset-1", aasEndpointUrl: "https://vendor.example/shells/abc" };

const nameplate = {
  idShort: "Nameplate",
  displayName: null,
  properties: [],
  files: [{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }],
  groups: [
    {
      idShort: "Documents",
      displayName: null,
      properties: [],
      files: [{ idShort: "Drawing", value: "https://vendor.example/drawing.stp", contentType: "application/step" }],
      groups: [],
    },
  ],
};

const aasData = {
  id: "https://vendor.example/aas/abc",
  idShort: "Abc",
  submodels: [{ ...nameplate, id: "sm-1", description: null, templateName: null, version: null }],
};

function request(query: Record<string, string>): Request {
  const url = new URL("http://localhost/api/assets/asset-1/aas-files");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return new Request(url);
}

function params(id = "asset-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAssetById.mockResolvedValue(asset);
  getAasData.mockResolvedValue(aasData);
  assertPubliclyRoutableUrl.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/assets/[id]/aas-files", () => {
  it("returns 400 when submodelId or fileIdShort is missing", async () => {
    const response = await GET(request({ fileIdShort: "Manual" }), params());
    expect(response.status).toBe(400);
  });

  it("returns 400 when groupPath is not valid JSON", async () => {
    const response = await GET(
      request({ submodelId: "sm-1", fileIdShort: "Manual", groupPath: "not-json" }),
      params()
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when groupPath is JSON but not an array of strings", async () => {
    const response = await GET(
      request({ submodelId: "sm-1", fileIdShort: "Manual", groupPath: "[1,2]" }),
      params()
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when the asset doesn't exist", async () => {
    getAssetById.mockResolvedValue(null);

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(404);
    expect(getAasData).not.toHaveBeenCalled();
  });

  it("returns 404 when the asset has no AAS reference", async () => {
    getAssetById.mockResolvedValue({ id: "asset-1", aasEndpointUrl: null, aasGlobalAssetId: null });

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(404);
  });

  it("returns 404 when the AAS data can't be resolved", async () => {
    getAasData.mockResolvedValue(null);

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(404);
  });

  it("returns 404 when the submodel isn't found", async () => {
    const response = await GET(
      request({ submodelId: "missing-sm", fileIdShort: "Manual" }),
      params()
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 when the group path doesn't resolve", async () => {
    const response = await GET(
      request({ submodelId: "sm-1", fileIdShort: "Drawing", groupPath: '["NoSuchGroup"]' }),
      params()
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 when the file idShort isn't found in the resolved group", async () => {
    const response = await GET(
      request({ submodelId: "sm-1", fileIdShort: "NoSuchFile" }),
      params()
    );
    expect(response.status).toBe(404);
  });

  it("returns 502 when the resolved file URL isn't safe to fetch", async () => {
    assertPubliclyRoutableUrl.mockRejectedValue(new Error("unsafe"));

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(502);
  });

  it("returns 502 when the upstream fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(502);
  });

  it("returns 502 when the upstream responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(502);
  });

  it("returns 502 when the upstream file is larger than the size limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new ReadableStream(), {
            status: 200,
            headers: { "content-length": String(60 * 1024 * 1024) },
          })
      )
    );

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(502);
  });

  it("streams the file with the AAS-declared content type and an inline disposition", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new ReadableStream(), {
            status: 200,
            headers: { "content-type": "binary/octet-stream" },
          })
      )
    );

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe("inline");
  });

  it("resolves a nested file via groupPath", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream(), { status: 200 })));

    const response = await GET(
      request({ submodelId: "sm-1", fileIdShort: "Drawing", groupPath: '["Documents"]' }),
      params()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/step");
  });

  it("falls back to the upstream content type when the AAS file has none", async () => {
    getAasData.mockResolvedValue({
      ...aasData,
      submodels: [
        {
          ...aasData.submodels[0],
          files: [{ idShort: "Manual", value: "https://vendor.example/manual", contentType: null }],
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new ReadableStream(), {
            status: 200,
            headers: { "content-type": "application/octet-stream" },
          })
      )
    );

    const response = await GET(request({ submodelId: "sm-1", fileIdShort: "Manual" }), params());

    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
  });
});
