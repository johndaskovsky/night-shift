#!/usr/bin/env node

/**
 * Build script for @johndaskovsky/nightshift (deprecation shim).
 *
 * Steps:
 *   1. Compile TypeScript source to JavaScript (dist/).
 *   2. Sync the plugin manifest version with package.json.
 */

import { execSync } from "node:child_process";
import { rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "dist");
const pluginManifestPath = resolve(
  __dirname,
  "plugins",
  "nightshift",
  ".claude-plugin",
  "plugin.json",
);
const packageJsonPath = resolve(__dirname, "package.json");

// 1. Clean dist
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
  console.log("Cleaned dist/");
}

// 2. Compile TypeScript
console.log("Compiling TypeScript...");
try {
  execSync("npx tsc", { stdio: "inherit", cwd: __dirname });
} catch {
  console.error("TypeScript compilation failed.");
  process.exit(1);
}

// 3. Sync plugin manifest version with package.json
const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const manifest = JSON.parse(readFileSync(pluginManifestPath, "utf-8"));
if (manifest.version !== pkg.version) {
  manifest.version = pkg.version;
  writeFileSync(
    pluginManifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(`Updated plugin manifest version → ${pkg.version}`);
}

console.log("Build complete.");
