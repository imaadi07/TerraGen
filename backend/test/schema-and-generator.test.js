import assert from "node:assert";
import {
  getAllSchemas,
  getSchemaById,
  getResourceVersions,
} from "../src/services/schema-loader.service.js";
import { TerraformGeneratorService } from "../src/services/terraform-generator.services.js";
import { DependencyResolverService } from "../src/services/dependency-resolver.service.js";

console.log("=== Running Backend Schema & Terraform Generator Tests ===");

// 1. Test getAllSchemas
const schemas = getAllSchemas();
console.log(`✓ Loaded ${schemas.length} schemas`);
assert(schemas.length >= 14, "Expected at least 14 schemas");

// Verify every schema has required metadata
for (const s of schemas) {
  assert(s.id, "Schema missing id");
  assert(s.terraformType, `Schema ${s.id} missing terraformType`);
  assert(s.provider, `Schema ${s.id} missing provider`);
  assert(s.defaultVersion, `Schema ${s.id} missing defaultVersion`);
  assert(Array.isArray(s.availableVersions), `Schema ${s.id} missing availableVersions array`);
  assert(s.availableVersions.length > 0, `Schema ${s.id} has empty availableVersions`);
}
console.log("✓ All schemas have valid metadata and version info");

// 2. Test getSchemaById with default and specific version
const ec2 = getSchemaById("aws-ec2");
assert(ec2, "EC2 schema not found");
assert.strictEqual(ec2.canvasType, "aws-ec2");
assert.strictEqual(ec2.version, "5.0");

const ec2v5 = getSchemaById("aws-ec2", "5.0");
assert.strictEqual(ec2v5.canvasType, "aws-ec2");
assert.strictEqual(ec2v5.version, "5.0");

const ec2Invalid = getSchemaById("aws-ec2", "99.0");
assert.strictEqual(ec2Invalid.version, "5.0", "Should fallback to default version for unmatched version");

const versions = getResourceVersions("aws-ec2");
assert(versions.includes("5.0"), "Expected 5.0 in available versions");
console.log("✓ Schema versioning and lookup verified");

// 3. Test Single Resource Terraform Generation
const generator = new TerraformGeneratorService();
const hclSingle = generator.generate(ec2, {
  instanceType: "t3.small",
  ami: "ami-0123456789abcdef0",
  monitoring: true,
  rootBlockDeviceVolumeSize: 50,
  tags: { Name: "WebServer", Env: "Production" },
});

assert(hclSingle.includes('resource "aws_instance" "aws_ec2_resource"'));
assert(hclSingle.includes('instance_type = "t3.small"'));
assert(hclSingle.includes('ami = "ami-0123456789abcdef0"'));
assert(hclSingle.includes('version = "~> 5.0"'));
assert(hclSingle.includes('Name = "WebServer"'));
console.log("✓ Single resource HCL generation verified");

// 4. Test Multi-Resource Generation with Dependency Resolver
const resolver = new DependencyResolverService();
const resolvedDeps = resolver.resolve(ec2, {
  "aws-subnet": {
    mode: "inline-create",
    values: {
      cidrBlock: "10.0.1.0/24",
      availabilityZone: "us-east-1a",
    },
  },
  "aws-vpc": {
    mode: "inline-create",
    values: {
      cidrBlock: "10.0.0.0/16",
    },
  },
});

assert(resolvedDeps.length > 0, "Expected resolved dependencies");
const refMap = resolver.buildRefMap(resolvedDeps);

const hclMulti = generator.generateMulti(
  ec2,
  {
    instanceType: "t3.micro",
    ami: "ami-99999999",
  },
  resolvedDeps,
  refMap
);

assert(hclMulti.includes('resource "aws_instance" "aws_ec2_resource"'));
assert(hclMulti.includes('resource "aws_subnet"'));
assert(hclMulti.includes('resource "aws_vpc"'));
console.log("✓ Multi-resource dependency chaining verified");

console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
