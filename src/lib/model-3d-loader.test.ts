import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

const { readStepFile } = vi.hoisted(() => ({ readStepFile: vi.fn() }));
const { occtimportjs } = vi.hoisted(() => ({
  occtimportjs: vi.fn(async (options?: { locateFile?: (path: string) => string }) => {
    // Exercise the locateFile callback the same way a real emscripten
    // module would, for both the wasm asset and any other asset path.
    options?.locateFile?.("occt-import-js.wasm");
    options?.locateFile?.("some-other-asset.js");
    return { ReadStepFile: readStepFile };
  }),
}));
const { stlParse } = vi.hoisted(() => ({ stlParse: vi.fn() }));
const { objParse } = vi.hoisted(() => ({ objParse: vi.fn() }));
const { gltfParse } = vi.hoisted(() => ({ gltfParse: vi.fn() }));

vi.mock("occt-import-js", () => ({ default: occtimportjs }));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({
  STLLoader: class {
    parse = stlParse;
  },
}));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: class {
    parse = objParse;
  },
}));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    parse = gltfParse;
  },
}));

const { loadModel3DObject } = await import("./model-3d-loader");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadModel3DObject", () => {
  it("parses a STEP buffer via occt-import-js into a group of meshes", async () => {
    readStepFile.mockReturnValue({
      success: true,
      meshes: [
        {
          name: "cube",
          attributes: {
            position: { array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) },
          },
          index: { array: new Uint32Array([0, 1, 2]) },
        },
      ],
    });

    const object = await loadModel3DObject("step", new ArrayBuffer(0));

    expect(object).toBeInstanceOf(THREE.Group);
    expect(object.children).toHaveLength(1);
    expect(object.children[0]).toBeInstanceOf(THREE.Mesh);
  });

  it("uses the STEP mesh's own normals when provided, instead of computing them", async () => {
    readStepFile.mockReturnValue({
      success: true,
      meshes: [
        {
          name: "cube",
          attributes: {
            position: { array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) },
            normal: { array: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]) },
          },
        },
      ],
    });

    const object = await loadModel3DObject("step", new ArrayBuffer(0));

    const mesh = object.children[0] as THREE.Mesh;
    expect(mesh.geometry.getAttribute("normal").array).toEqual(
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
    );
  });

  it("computes vertex normals when the STEP mesh doesn't provide its own", async () => {
    readStepFile.mockReturnValue({
      success: true,
      meshes: [
        {
          name: "cube",
          attributes: { position: { array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) } },
        },
      ],
    });

    const object = await loadModel3DObject("step", new ArrayBuffer(0));

    const mesh = object.children[0] as THREE.Mesh;
    expect(mesh.geometry.getAttribute("normal")).toBeDefined();
  });

  it("throws when occt-import-js fails to parse the STEP file", async () => {
    readStepFile.mockReturnValue({ success: false, meshes: [] });

    await expect(loadModel3DObject("step", new ArrayBuffer(0))).rejects.toThrow(
      "Failed to parse STEP file"
    );
  });

  it("parses an STL buffer via STLLoader into a mesh", async () => {
    const geometry = new THREE.BufferGeometry();
    stlParse.mockReturnValue(geometry);

    const object = await loadModel3DObject("stl", new ArrayBuffer(0));

    expect(object).toBeInstanceOf(THREE.Mesh);
    expect((object as THREE.Mesh).geometry).toBe(geometry);
  });

  it("parses an OBJ buffer via OBJLoader, applying a standard material to every mesh", async () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BufferGeometry()));
    objParse.mockReturnValue(group);

    const object = await loadModel3DObject("obj", new ArrayBuffer(0));

    expect(object).toBe(group);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it("parses a glTF buffer via GLTFLoader, resolving with the loaded scene", async () => {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BufferGeometry()));
    gltfParse.mockImplementation((_buffer, _path, onLoad) => onLoad({ scene }));

    const object = await loadModel3DObject("gltf", new ArrayBuffer(0));

    expect(object).toBe(scene);
  });

  it("rejects when GLTFLoader reports an error", async () => {
    gltfParse.mockImplementation((_buffer, _path, _onLoad, onError) =>
      onError(new Error("bad gltf"))
    );

    await expect(loadModel3DObject("gltf", new ArrayBuffer(0))).rejects.toThrow("bad gltf");
  });
});
