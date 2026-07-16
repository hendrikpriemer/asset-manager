export type OpenSourceLicense = {
  name: string;
  version: string;
  license: string;
};

/**
 * Runtime dependencies actually shipped with Asset Manager (package.json's
 * "dependencies", not "devDependencies"). Update alongside package.json when
 * a runtime dependency is added, removed, or upgraded.
 */
export const OPEN_SOURCE_LICENSES: OpenSourceLicense[] = [
  { name: "@prisma/adapter-pg", version: "7.8.0", license: "Apache-2.0" },
  { name: "@prisma/client", version: "7.8.0", license: "Apache-2.0" },
  { name: "next", version: "16.2.10", license: "MIT" },
  { name: "react", version: "19.2.4", license: "MIT" },
  { name: "react-dom", version: "19.2.4", license: "MIT" },
];
