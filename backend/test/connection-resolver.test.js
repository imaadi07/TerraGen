import assert from "node:assert";
import { canConnectNodes, resolveNodeConnections } from "../../frontend/src/utils/connectionResolver.js";

console.log("=== Running Connection Resolver & Multi-Link Unit Tests ===");

const vpcNode = {
  id: "vpc_1",
  resourceType: "aws-vpc",
  instanceName: "prod_vpc",
  schema: {
    canvasType: "aws-vpc",
    terraformType: "aws_vpc",
    displayName: "AWS VPC",
    dependencies: [],
    fields: [{ key: "cidrBlock", required: true }],
  },
};

const subnetNode = {
  id: "subnet_1",
  resourceType: "aws-subnet",
  instanceName: "public_subnet_1",
  schema: {
    canvasType: "aws-subnet",
    terraformType: "aws_subnet",
    displayName: "AWS Subnet",
    dependencies: [
      {
        resourceType: "aws-vpc",
        terraformType: "aws_vpc",
        linkField: "vpcId",
        isMulti: false,
        tfOutputRef: "aws_vpc.{resourceName}.id",
      },
    ],
    fields: [
      { key: "cidrBlock", required: true },
      { key: "vpcId", required: true },
    ],
  },
};

const eksNode = {
  id: "eks_1",
  resourceType: "aws-eks",
  instanceName: "prod_cluster",
  schema: {
    canvasType: "aws-eks",
    terraformType: "aws_eks_cluster",
    displayName: "AWS EKS Cluster",
    dependencies: [
      {
        resourceType: "aws-subnet",
        terraformType: "aws_subnet",
        linkField: "subnetIds",
        isMulti: true,
        tfOutputRef: "aws_subnet.{resourceName}.id",
      },
    ],
    fields: [
      { key: "name", required: true },
      { key: "subnetIds", required: true, validation: { selectionMode: "multi" } },
    ],
  },
};

// Test 1: Single dependency connection & inheritance (VPC -> Subnet)
const check1 = canConnectNodes(vpcNode, subnetNode, []);
assert.strictEqual(check1.allowed, true);
assert.strictEqual(check1.targetField, "vpcId");
assert.strictEqual(check1.isMulti, false);

const edges = [{ id: "e1", source: "vpc_1", target: "subnet_1", targetField: "vpcId" }];
const res1 = resolveNodeConnections(subnetNode, [vpcNode, subnetNode], edges);
assert.strictEqual(res1.lockedFields.vpcId.isLocked, true);
assert.strictEqual(res1.lockedFields.vpcId.isMulti, false);
assert.strictEqual(res1.lockedFields.vpcId.sources[0].sourceInstanceName, "prod_vpc");
assert.strictEqual(res1.inheritedValues.vpcId, "prod_vpc");
console.log("✓ Single connection resolution & locking verified");

// Test 2: Multi-connection resolution & inheritance (Subnet 1 & Subnet 2 -> EKS)
const subnetNode2 = {
  id: "subnet_2",
  resourceType: "aws-subnet",
  instanceName: "public_subnet_2",
  schema: subnetNode.schema,
};

const eksEdges = [
  { id: "e2", source: "subnet_1", target: "eks_1", targetField: "subnetIds" },
  { id: "e3", source: "subnet_2", target: "eks_1", targetField: "subnetIds" },
];

const eksRes = resolveNodeConnections(eksNode, [subnetNode, subnetNode2, eksNode], eksEdges);
assert.strictEqual(eksRes.lockedFields.subnetIds.isLocked, true);
assert.strictEqual(eksRes.lockedFields.subnetIds.isMulti, true);
assert.strictEqual(eksRes.lockedFields.subnetIds.sources.length, 2);
assert.deepStrictEqual(eksRes.inheritedValues.subnetIds, ["public_subnet_1", "public_subnet_2"]);
console.log("✓ Multi-connection resolution & locking verified");

// Test 3: Self-connection rejected
const selfCheck = canConnectNodes(vpcNode, vpcNode, []);
assert.strictEqual(selfCheck.allowed, false);
console.log("✓ Self-connection correctly rejected");

// Test 4: Bidirectional smart connection (Subnet -> VPC auto-resolves as inverted)
const reverseCheck = canConnectNodes(subnetNode, vpcNode, []);
assert.strictEqual(reverseCheck.allowed, true);
assert.strictEqual(reverseCheck.inverted, true);
assert.strictEqual(reverseCheck.targetField, "vpcId");
console.log("✓ Reverse bidirectional connection resolution verified");

console.log("=== ALL CONNECTION RESOLVER TESTS PASSED! ===");

