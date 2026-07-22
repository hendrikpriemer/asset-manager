"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { loadModel3DObject } from "@/lib/model-3d-loader";
import type { Model3DFormat } from "@/lib/file-preview";
import { Spinner } from "@/components/Spinner";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; object: THREE.Object3D };

const GENERIC_ERROR_MESSAGE = "Could not load the 3D model.";

/** Centers the object on the origin and scales it to a consistent viewing size. */
function fitObjectToView(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    throw new Error("This model has no viewable geometry.");
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  object.position.sub(center);
  object.scale.setScalar(3 / maxDimension);
}

/** Fetches the proxied file, translating known failure modes into a message the user can act on. */
async function fetchFileBuffer(fileUrl: string): Promise<ArrayBuffer> {
  let response: Response;
  try {
    response = await fetch(fileUrl);
  } catch {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
  if (response.status === 502) {
    throw new Error(
      "This file could not be downloaded from the manufacturer's repository."
    );
  }
  if (!response.ok) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
  try {
    return await response.arrayBuffer();
  } catch {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
}

export function Model3DViewer({
  fileUrl,
  format,
}: {
  fileUrl: string;
  format: Model3DFormat;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const buffer = await fetchFileBuffer(fileUrl);
        let object: THREE.Object3D;
        try {
          object = await loadModel3DObject(format, buffer);
        } catch {
          throw new Error("This file's 3D format could not be read.");
        }
        fitObjectToView(object);
        if (!cancelled) {
          setState({ status: "ready", object });
        }
      } catch (error) {
        // Every throw above (fetchFileBuffer, the loadModel3DObject wrapper,
        // fitObjectToView) always produces a real Error with a
        // user-presentable message - including WASM/Emscripten failures from
        // occt-import-js, which are normalized to one by the inner catch.
        if (!cancelled) {
          setState({ status: "error", message: (error as Error).message });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, format]);

  if (state.status === "loading") {
    return (
      <div className="flex h-[500px] w-full items-center justify-center">
        <Spinner label="Loading 3D model" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-[500px] w-full items-center justify-center">
        <p role="alert" className="md-body-small text-error">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <color attach="background" args={[0x2b2b2b]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <primitive object={state.object} />
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
}
