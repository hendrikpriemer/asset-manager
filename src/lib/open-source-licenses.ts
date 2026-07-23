export type OpenSourceLicense = {
  name: string;
  version: string;
  license: string;
};

/**
 * Runtime dependencies actually shipped with Asset Manager (package.json's
 * "dependencies", not "devDependencies"). Regenerated automatically by
 * scripts/update-app-info.mjs on every commit - do not edit by hand.
 */
export const OPEN_SOURCE_LICENSES: OpenSourceLicense[] = [
  { name: "@prisma/adapter-pg", version: "7.8.0", license: "Apache-2.0" },
  { name: "@prisma/client", version: "7.8.0", license: "Apache-2.0" },
  { name: "@react-three/drei", version: "10.7.7", license: "MIT" },
  { name: "@react-three/fiber", version: "9.6.1", license: "MIT" },
  { name: "leaflet", version: "1.9.4", license: "BSD-2-Clause" },
  { name: "next", version: "16.2.10", license: "MIT" },
  { name: "occt-import-js", version: "0.0.23", license: "LGPL-2.1" },
  { name: "react", version: "19.2.4", license: "MIT" },
  { name: "react-dom", version: "19.2.4", license: "MIT" },
  { name: "react-leaflet", version: "5.0.0", license: "Hippocratic-2.1" },
  { name: "sharp", version: "0.35.3", license: "Apache-2.0" },
  { name: "tesseract.js", version: "7.0.0", license: "Apache-2.0" },
  { name: "three", version: "0.185.1", license: "MIT" },
];
