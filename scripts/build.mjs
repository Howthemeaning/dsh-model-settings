#!/usr/bin/env node

/**
 * dsh-model-settings build step — this package is hand-written ESM with no
 * transpilation, so "build" verifies that every published artifact exists and
 * parses. `npm run build` / `npm run prepack` run this before packing.
 */
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const required = [
	"package.json",
	"cordis.patch.yml",
	"lib/index.js",
	"lib/client.js",
	"lib/types/index.d.ts",
	"README.md",
	"README.en.md"
];

let failed = false;
for (const rel of required) {
	try {
		await access(join(root, rel));
	} catch {
		console.error(`missing artifact: ${rel}`);
		failed = true;
	}
}
if (failed) process.exit(1);

for (const rel of ["lib/index.js", "lib/client.js"]) {
	const result = spawnSync(process.execPath, ["--check", join(root, rel)], { stdio: "inherit" });
	if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("dsh-model-settings build: ok (no transpile; artifacts verified)");
