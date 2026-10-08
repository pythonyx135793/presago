import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { verifyVendorIntegrity } from "./verify-vendor-integrity.mjs";

function fixture(t) {
  const temporaryRoot = resolve(tmpdir());
  const root = mkdtempSync(join(temporaryRoot, "vendor-sri-"));
  t.after(() => {
    assert.equal(dirname(root), temporaryRoot);
    rmSync(root, { recursive: true, force: true });
  });
  mkdirSync(join(root, "frontend/vendor"), { recursive: true });
  const bytes = Buffer.from("export const value = 1;\n");
  const manifest = { packages: {} };
  for (const name of ["sdk", "wallet"]) {
    manifest.packages[name] = {
      vendored_file: `frontend/vendor/${name}.js`,
      size: bytes.length,
      sha256: `sha256-${createHash("sha256").update(bytes).digest("base64")}`,
      sha384: `sha384-${createHash("sha384").update(bytes).digest("base64")}`,
    };
    writeFileSync(join(root, manifest.packages[name].vendored_file), bytes);
  }
  const save = () => writeFileSync(join(root, "frontend/vendor/integrity.json"), JSON.stringify(manifest));
  save();
  return { root, manifest, bytes, save };
}

test("matches both hashes and exact byte sizes for every package", (t) => {
  const { root } = fixture(t);
  assert.equal(verifyVendorIntegrity(root), 2);
});

for (const algorithm of ["sha256", "sha384"]) {
  test(`rejects a hex payload masquerading as ${algorithm} SRI`, (t) => {
    const { root, manifest, bytes, save } = fixture(t);
    manifest.packages.sdk[algorithm] = `${algorithm}-${createHash(algorithm).update(bytes).digest("hex")}`;
    save();
    assert.throws(() => verifyVendorIntegrity(root), /canonical base64 digest/);
  });
  test(`rejects a validly encoded but incorrect ${algorithm} digest`, (t) => {
    const { root, manifest, save } = fixture(t);
    manifest.packages.wallet[algorithm] = `${algorithm}-${createHash(algorithm).update("changed").digest("base64")}`;
    save();
    assert.throws(() => verifyVendorIntegrity(root), /digest mismatch/);
  });
}

test("rejects incorrect byte size", (t) => {
  const { root, manifest, save } = fixture(t);
  manifest.packages.wallet.size++;
  save();
  assert.throws(() => verifyVendorIntegrity(root), /byte size mismatch/);
});

test("rejects changed bytes even when the file size is unchanged", (t) => {
  const { root, bytes } = fixture(t);
  writeFileSync(join(root, "frontend/vendor/sdk.js"), bytes.toString().replace("1", "2"));
  assert.throws(() => verifyVendorIntegrity(root), /digest mismatch/);
});

test("does not normalize CRLF before checking the served bytes", (t) => {
  const { root } = fixture(t);
  writeFileSync(join(root, "frontend/vendor/sdk.js"), "export const value = 1;\r\n");
  assert.throws(() => verifyVendorIntegrity(root), /byte size mismatch/);
});

test("rejects missing files", (t) => {
  const { root } = fixture(t);
  rmSync(join(root, "frontend/vendor/wallet.js"));
  assert.throws(() => verifyVendorIntegrity(root), /ENOENT/);
});

test("rejects a path outside the vendor directory", (t) => {
  const { root, manifest, save } = fixture(t);
  manifest.packages.sdk.vendored_file = "README.md";
  save();
  assert.throws(() => verifyVendorIntegrity(root), /must be inside/);
});

test("rejects an empty package manifest", (t) => {
  const { root, manifest, save } = fixture(t);
  manifest.packages = {};
  save();
  assert.throws(() => verifyVendorIntegrity(root), /must contain packages/);
});
