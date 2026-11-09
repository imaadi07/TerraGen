import assert from "node:assert";
import { ApiResponse } from "../src/utils/api-response.util.js";

console.log("=== Running API Response Utility Tests ===");

// Test 1: Standard Success Response
{
  let statusSent = null;
  let jsonSent = null;
  const mockRes = {
    status(s) {
      statusSent = s;
      return this;
    },
    json(j) {
      jsonSent = j;
      return this;
    },
  };

  ApiResponse.success(mockRes, { foo: "bar" }, { status: 200, meta: { total: 1 } });
  assert.strictEqual(statusSent, 200, "Should set status 200");
  assert.strictEqual(jsonSent.success, true, "Envelope success must be true");
  assert.deepStrictEqual(jsonSent.data, { foo: "bar" }, "Data must match payload");
  assert.deepStrictEqual(jsonSent.meta, { total: 1 }, "Meta must match payload");
  assert(typeof jsonSent.timestamp === "string", "Timestamp must be ISO string");
  console.log("✓ ApiResponse.success envelope and metadata verified");
}

// Test 2: Success with Extra Fields (files, terraform, sortedNodes)
{
  let jsonSent = null;
  const mockRes = {
    json(j) {
      jsonSent = j;
      return this;
    },
  };

  ApiResponse.success(mockRes, undefined, {
    extra: {
      terraform: 'resource "aws_vpc" "main" {}',
      files: { "main.tf": 'resource "aws_vpc" "main" {}' },
    },
  });

  assert.strictEqual(jsonSent.success, true);
  assert.strictEqual(jsonSent.terraform, 'resource "aws_vpc" "main" {}');
  assert.strictEqual(jsonSent.files["main.tf"], 'resource "aws_vpc" "main" {}');
  assert.strictEqual(jsonSent.data, undefined, "Data field should not be present if undefined");
  console.log("✓ ApiResponse.success with extra fields verified");
}

// Test 3: Standard Error Response
{
  let statusSent = null;
  let jsonSent = null;
  const mockRes = {
    status(s) {
      statusSent = s;
      return this;
    },
    json(j) {
      jsonSent = j;
      return this;
    },
  };

  ApiResponse.error(mockRes, "Validation failed", {
    status: 422,
    code: "VALIDATION_ERROR",
    details: [{ field: "name", message: "Required" }],
  });

  assert.strictEqual(statusSent, 422);
  assert.strictEqual(jsonSent.success, false);
  assert.strictEqual(jsonSent.error, "Validation failed");
  assert.strictEqual(jsonSent.code, "VALIDATION_ERROR");
  assert.deepStrictEqual(jsonSent.details, [{ field: "name", message: "Required" }]);
  console.log("✓ ApiResponse.error envelope and code verified");
}

console.log("=== ALL API RESPONSE TESTS PASSED! ===");

