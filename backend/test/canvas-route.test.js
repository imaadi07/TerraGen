import assert from "node:assert";
import terraformRoutes from "../src/routes/terraform.routes.js";

console.log("=== Running Canvas Express Route Handler Tests ===");

// Find the POST /canvas route layer
const canvasLayer = terraformRoutes.stack.find(
  (layer) => layer.route && layer.route.path === "/canvas" && layer.route.methods.post
);

assert(canvasLayer, "POST /canvas route should be registered on terraform router");
const handler = canvasLayer.route.stack[0].handle;

// Test 1: Empty nodes validation
{
  const req = { body: { provider: "aws", nodes: [], edges: [] } };
  let statusSent = null;
  let jsonSent = null;
  const res = {
    status(s) {
      statusSent = s;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    },
  };
  const next = (err) => {
    throw err;
  };

  handler(req, res, next);
  assert.strictEqual(statusSent, 400, "Should return 400 for empty nodes");
  assert.strictEqual(jsonSent.success, false);
  console.log("✓ Empty canvas validation returned 400 as expected");
}

// Test 2: Valid graph resolution through route handler
{
  const req = {
    body: {
      provider: "aws",
      nodes: [
        {
          id: "node_vpc",
          resourceType: "aws-vpc",
          instanceName: "canvas_vpc",
          version: "5.0",
          values: { cidrBlock: "10.0.0.0/16", name: "canvas-vpc" },
        },
        {
          id: "node_subnet",
          resourceType: "aws-subnet",
          instanceName: "canvas_subnet",
          version: "5.0",
          values: { cidrBlock: "10.0.1.0/24", name: "canvas-subnet" },
        },
      ],
      edges: [
        {
          id: "edge_1",
          source: "node_vpc",
          target: "node_subnet",
          targetField: "vpcId",
        },
      ],
    },
  };

  let jsonSent = null;
  const res = {
    json(data) {
      jsonSent = data;
      return this;
    },
  };
  const next = (err) => {
    throw err;
  };

  handler(req, res, next);
  assert.strictEqual(jsonSent.success, true);
  assert.strictEqual(jsonSent.sortedNodes.length, 2);
  assert(jsonSent.terraform.includes('resource "aws_vpc" "canvas_vpc"'));
  assert(jsonSent.terraform.includes('resource "aws_subnet" "canvas_subnet"'));
  assert(jsonSent.terraform.includes("aws_vpc.canvas_vpc.id"));

  // Verify multi-file output structure (/senior-devops & /terraform-specialist)
  assert(jsonSent.files, "Route response must contain multi-file output 'files'");
  assert(jsonSent.files["main.tf"], "Must have main.tf in files");
  assert(jsonSent.files["variables.tf"], "Must have variables.tf in files");
  assert(jsonSent.files["outputs.tf"], "Must have outputs.tf in files");
  assert(jsonSent.files["providers.tf"], "Must have providers.tf in files");
  assert(jsonSent.files["terraform.tfvars"], "Must have terraform.tfvars in files");
  assert(jsonSent.files["providers.tf"].includes('source  = "hashicorp/aws"'));
  assert(jsonSent.files["main.tf"].includes('resource "aws_vpc" "canvas_vpc"'));
  console.log("✓ Valid canvas graph generated Terraform HCL via route handler");
}

// Test 3: Download ZIP archive route handler
{
  const zipLayer = terraformRoutes.stack.find(
    (layer) => layer.route && layer.route.path === "/download-zip" && layer.route.methods.post
  );
  assert(zipLayer, "POST /download-zip route must be registered");
  const zipHandler = zipLayer.route.stack[0].handle;

  const req = {
    body: {
      projectName: "test-cloud-infra",
      files: {
        "main.tf": 'resource "aws_vpc" "v" {}\n',
        "variables.tf": 'variable "aws_region" {}\n',
      },
    },
  };

  const headers = {};
  let sentData = null;
  const res = {
    setHeader(k, v) {
      headers[k] = v;
      return this;
    },
    send(buf) {
      sentData = buf;
      return this;
    },
  };

  zipHandler(req, res, () => {});
  assert.strictEqual(headers["Content-Type"], "application/zip");
  assert(headers["Content-Disposition"].includes("test-cloud-infra.zip"));
  assert(Buffer.isBuffer(sentData), "Sent data must be ZIP buffer");
  assert.strictEqual(sentData.readUInt32LE(0), 0x04034b50, "ZIP buffer must have PK0304 signature");
  console.log("✓ Multi-file ZIP download endpoint verified");
}

console.log("=== ALL ROUTE TESTS PASSED SUCCESSFULLY! ===");
