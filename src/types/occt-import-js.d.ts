/**
 * `occt-import-js` ships no TypeScript types of its own - this covers only
 * the surface `lib/model-3d-loader.ts` actually uses.
 */
declare module "occt-import-js" {
  export type OcctMesh = {
    name: string;
    attributes: {
      position: { array: Float32Array };
      normal?: { array: Float32Array };
    };
    index?: { array: Uint32Array };
  };

  export type OcctReadResult = {
    success: boolean;
    meshes: OcctMesh[];
  };

  export type OcctModule = {
    ReadStepFile: (buffer: Uint8Array, params: null) => OcctReadResult;
  };

  export type OcctModuleOptions = {
    locateFile?: (path: string) => string;
  };

  export default function occtimportjs(options?: OcctModuleOptions): Promise<OcctModule>;
}
