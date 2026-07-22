/**
 * Parses a fetched file's raw bytes into a renderable three.js object,
 * dispatching by the detected 3D format (see `lib/file-preview.ts`). STL/
 * OBJ/glTF use three.js's own bundled loaders - the same ones the official
 * Eclipse BaSyx AAS Web UI's `CADPreview.vue` uses. STEP additionally goes
 * through `occt-import-js` (a WASM build of OpenCascade), which BaSyx's own
 * reference UI does not support at all.
 */

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Model3DFormat } from "@/lib/file-preview";

function standardMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.5 });
}

function applyStandardMaterial(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = standardMaterial();
    }
  });
}

async function loadStepObject(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  const occtimportjs = (await import("occt-import-js")).default;
  const occt = await occtimportjs({
    locateFile: (path: string) => (path.endsWith(".wasm") ? "/occt-import-js.wasm" : path),
  });
  const result = occt.ReadStepFile(new Uint8Array(buffer), null);
  if (!result.success) {
    throw new Error("Failed to parse STEP file");
  }

  const group = new THREE.Group();
  for (const mesh of result.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(mesh.attributes.position.array, 3)
    );
    if (mesh.attributes.normal) {
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3)
      );
    }
    if (mesh.index) {
      geometry.setIndex(Array.from(mesh.index.array));
    }
    if (!mesh.attributes.normal) {
      geometry.computeVertexNormals();
    }
    group.add(new THREE.Mesh(geometry, standardMaterial()));
  }
  return group;
}

function loadStlObject(buffer: ArrayBuffer): THREE.Object3D {
  const geometry = new STLLoader().parse(buffer);
  return new THREE.Mesh(geometry, standardMaterial());
}

function loadObjObject(buffer: ArrayBuffer): THREE.Object3D {
  const text = new TextDecoder().decode(buffer);
  const object = new OBJLoader().parse(text);
  applyStandardMaterial(object);
  return object;
}

function loadGltfObject(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      buffer,
      "",
      (gltf) => {
        applyStandardMaterial(gltf.scene);
        resolve(gltf.scene);
      },
      reject
    );
  });
}

export async function loadModel3DObject(
  format: Model3DFormat,
  buffer: ArrayBuffer
): Promise<THREE.Object3D> {
  if (format === "step") return loadStepObject(buffer);
  if (format === "stl") return loadStlObject(buffer);
  if (format === "obj") return loadObjObject(buffer);
  return loadGltfObject(buffer);
}
