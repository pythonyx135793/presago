import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function verifyVendorIntegrity(repositoryRoot) {
  const manifest = JSON.parse(readFileSync(resolve(repositoryRoot, "frontend/vendor/integrity.json"), "utf8"));
  if (!manifest.packages || !Object.keys(manifest.packages).length) {
    throw new Error("Integrity manifest must contain packages");
  }
  const vendorRoot = resolve(repositoryRoot, "frontend/vendor");
  for (const [name, entry] of Object.entries(manifest.packages)) {
    const file = resolve(repositoryRoot, entry.vendored_file);
    const vendorRelative = relative(vendorRoot, file);
    if (!vendorRelative || vendorRelative === ".." || vendorRelative.startsWith("../") || vendorRelative.startsWith("..\\") || isAbsolute(vendorRelative)) {
      throw new Error(`${name}: vendored_file must be inside frontend/vendor`);
    }
    const bytes = readFileSync(file);
    if (!Number.isInteger(entry.size) || entry.size !== bytes.length) {
      throw new Error(`${name}: byte size mismatch (expected ${entry.size}, found ${bytes.length})`);
    }
    for (const [algorithm, digestLength] of [["sha256", 32], ["sha384", 48]]) {
      const value = entry[algorithm];
      const prefix = `${algorithm}-`;
      if (typeof value !== "string" || !value.startsWith(prefix)) {
        throw new Error(`${name}: invalid ${algorithm} SRI prefix`);
      }
      const encoded = value.slice(prefix.length);
      const digest = Buffer.from(encoded, "base64");
      if (digest.length !== digestLength || digest.toString("base64") !== encoded) {
        throw new Error(`${name}: ${algorithm} must contain a canonical base64 digest`);
      }
      if (createHash(algorithm).update(bytes).digest("base64") !== encoded) {
        throw new Error(`${name}: ${algorithm} digest mismatch`);
      }
    }
  }
  return Object.keys(manifest.packages).length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Verified SRI hashes and byte sizes for ${verifyVendorIntegrity(resolve(import.meta.dirname, ".."))} vendored packages.`);
  } catch (error) {
    console.error(`Vendor integrity validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
