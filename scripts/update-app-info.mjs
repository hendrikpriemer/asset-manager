#!/usr/bin/env node
// Run automatically by the pre-commit git hook (scripts/git-hooks/pre-commit):
// bumps the patch version in package.json (shown under Info > About) and
// regenerates src/lib/open-source-licenses.ts from the installed runtime
// dependencies, so both stay accurate without manual upkeep.

import { readFileSync, writeFileSync } from "node:fs";

const rootUrl = new URL("../", import.meta.url);
const pkgPath = new URL("package.json", rootUrl);
const licensesPath = new URL("src/lib/open-source-licenses.ts", rootUrl);

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const [major, minor, patch] = pkg.version.split(".").map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const dependencyNames = Object.keys(pkg.dependencies ?? {}).sort();
const licenses = dependencyNames.map((name) => {
  const depPkg = JSON.parse(
    readFileSync(new URL(`node_modules/${name}/package.json`, rootUrl), "utf8")
  );
  return {
    name,
    version: depPkg.version,
    license: depPkg.license ?? "UNKNOWN",
  };
});

const entries = licenses
  .map(
    (entry) =>
      `  { name: "${entry.name}", version: "${entry.version}", license: "${entry.license}" },`
  )
  .join("\n");

writeFileSync(
  licensesPath,
  `export type OpenSourceLicense = {
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
${entries}
];
`
);

console.log(
  `[update-app-info] Bumped version to ${pkg.version}; wrote ${licenses.length} license entries.`
);
