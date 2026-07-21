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
  { name: "leaflet", version: "1.9.4", license: "BSD-2-Clause" },
  { name: "next", version: "16.2.10", license: "MIT" },
  { name: "react", version: "19.2.4", license: "MIT" },
  { name: "react-dom", version: "19.2.4", license: "MIT" },
  { name: "react-leaflet", version: "5.0.0", license: "Hippocratic-2.1" },
];
