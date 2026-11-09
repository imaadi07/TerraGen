import assert from "assert";
import { createZipBuffer } from "../src/utils/zip.util.js";

console.log("=== Running ZIP Archive Utility Tests ===");

const files = {
  "main.tf": "resource \"aws_s3_bucket\" \"test\" {\n  bucket = \"my-test-bucket\"\n}\n",
  "variables.tf": "variable \"environment\" {\n  type = string\n}\n",
  "outputs.tf": "output \"bucket_id\" {\n  value = aws_s3_bucket.test.id\n}\n",
};

const zip = createZipBuffer(files);
assert(Buffer.isBuffer(zip), "ZIP output must be a Buffer");
assert(zip.length > 100, "ZIP buffer must have non-trivial size");

// PK\x03\x04 signature
assert.strictEqual(zip.readUInt32LE(0), 0x04034b50, "Header must have PK0304 signature");

console.log("ZIP buffer created successfully, size:", zip.length);
console.log("ALL ZIP TESTS PASSED!");

