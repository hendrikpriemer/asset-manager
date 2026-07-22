import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as THREE from "three";

const { loadModel3DObject } = vi.hoisted(() => ({ loadModel3DObject: vi.fn() }));
vi.mock("@/lib/model-3d-loader", () => ({ loadModel3DObject }));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

const { Model3DViewer } = await import("./Model3DViewer");

function nonEmptyMesh(): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Model3DViewer", () => {
  it("shows a loading spinner while the file is being fetched and parsed", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(screen.getByRole("status", { name: "Loading 3D model" })).toBeInTheDocument();
  });

  it("renders the 3D canvas once the object loads successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(4), { status: 200 }))
    );
    loadModel3DObject.mockResolvedValue(nonEmptyMesh());

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    await waitFor(() => expect(screen.getByTestId("canvas")).toBeInTheDocument());
    expect(screen.getByTestId("orbit-controls")).toBeInTheDocument();
    expect(loadModel3DObject).toHaveBeenCalledWith("step", expect.any(ArrayBuffer));
  });

  it("shows a generic error message when the file fetch fails with an unrelated status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the 3D model."
    );
  });

  it("shows a repository-specific error message when the proxy reports an upstream failure (502)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This file could not be downloaded from the manufacturer's repository."
    );
  });

  it("shows a generic error message when reading the response body fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.reject(new Error("stream interrupted")),
      }))
    );

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the 3D model."
    );
  });

  it("shows an error message when fetch itself throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the 3D model."
    );
  });

  it("shows a format-specific error message when the format loader throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(4), { status: 200 }))
    );
    loadModel3DObject.mockRejectedValue(new Error("bad file"));

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This file's 3D format could not be read."
    );
  });

  it("normalizes a non-Error rejection from the format loader to a readable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(4), { status: 200 }))
    );
    loadModel3DObject.mockRejectedValue("not an Error instance");

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This file's 3D format could not be read."
    );
  });

  it("ignores a stale load that resolves after fileUrl has already changed", async () => {
    let resolveStaleFetch!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => (resolveStaleFetch = resolve)))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    loadModel3DObject.mockResolvedValue(nonEmptyMesh());

    const { rerender } = render(<Model3DViewer fileUrl="/proxy/a.stp" format="step" />);
    rerender(<Model3DViewer fileUrl="/proxy/b.stp" format="step" />);
    await waitFor(() => expect(screen.getByTestId("canvas")).toBeInTheDocument());

    resolveStaleFetch(new Response(new ArrayBuffer(4), { status: 200 }));

    expect(screen.getByTestId("canvas")).toBeInTheDocument();
  });

  it("ignores a stale failure that resolves after fileUrl has already changed", async () => {
    let rejectStaleFetch!: (error: Error) => void;
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(new Promise((_resolve, reject) => (rejectStaleFetch = reject)))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    loadModel3DObject.mockResolvedValue(nonEmptyMesh());

    const { rerender } = render(<Model3DViewer fileUrl="/proxy/a.stp" format="step" />);
    rerender(<Model3DViewer fileUrl="/proxy/b.stp" format="step" />);
    await waitFor(() => expect(screen.getByTestId("canvas")).toBeInTheDocument());

    rejectStaleFetch(new Error("stale network error"));

    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a geometry-specific error message when the loaded object has no visible geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(4), { status: 200 }))
    );
    loadModel3DObject.mockResolvedValue(new THREE.Group());

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This model has no viewable geometry."
    );
  });

  it("renders a degenerate zero-size (single-point) model without dividing by zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(4), { status: 200 }))
    );
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0], 3)
    );
    loadModel3DObject.mockResolvedValue(new THREE.Mesh(pointGeometry));

    render(<Model3DViewer fileUrl="/proxy/model.stp" format="step" />);

    await waitFor(() => expect(screen.getByTestId("canvas")).toBeInTheDocument());
  });

  it("re-fetches and re-parses when fileUrl or format changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(4), { status: 200 }))
    );
    loadModel3DObject.mockResolvedValue(nonEmptyMesh());

    const { rerender } = render(<Model3DViewer fileUrl="/proxy/a.stp" format="step" />);
    await waitFor(() => expect(loadModel3DObject).toHaveBeenCalledWith("step", expect.any(ArrayBuffer)));

    rerender(<Model3DViewer fileUrl="/proxy/b.stl" format="stl" />);
    await waitFor(() => expect(loadModel3DObject).toHaveBeenCalledWith("stl", expect.any(ArrayBuffer)));
  });
});
