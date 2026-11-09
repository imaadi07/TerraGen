import assert from "node:assert";
import {
  validateS3BucketName,
  validateIamRoleName,
  validateIamPolicyName,
  validateRdsIdentifier,
  validateDynamoDbTableName,
  validateSqsQueueName,
  validateAutoScalingGroupName,
  validateLaunchTemplateName,
  validateAwsResourceName,
} from "../src/services/aws-name-validator.service.js";
import {
  getManagedPolicies,
  getTrustServices,
  generateAssumeRolePolicy,
} from "../src/providers/aws/iam.provider.js";
import {
  getInstanceTypes,
  getAvailabilityZones,
  getAmis,
  getKeyPairs,
} from "../src/providers/aws/ec2.provider.js";
import {
  getZones,
  getRegions,
  getMachineTypes,
} from "../src/providers/gcp/compute.provider.js";

console.log("=== Running AWS Name Validation & IAM Provider Tests ===");

// ─── 1. S3 Bucket Global Name Rules ──────────────────────────────────────────
{
  // Valid cases
  assert.strictEqual(validateS3BucketName("my-prod-assets-2026").valid, true);
  assert.strictEqual(validateS3BucketName("data-lake-raw-01").valid, true);

  // Invalid: uppercase letters
  const upper = validateS3BucketName("MyProdBucket");
  assert.strictEqual(upper.valid, false);
  assert.ok(upper.error.includes("lowercase"));

  // Invalid: underscores
  const under = validateS3BucketName("my_prod_bucket");
  assert.strictEqual(under.valid, false);
  assert.ok(under.error.includes("underscores"));

  // Invalid: length < 3
  const tooShort = validateS3BucketName("ab");
  assert.strictEqual(tooShort.valid, false);
  assert.ok(tooShort.error.includes("at least 3"));

  // Invalid: length > 63
  const tooLong = validateS3BucketName("a".repeat(64));
  assert.strictEqual(tooLong.valid, false);
  assert.ok(tooLong.error.includes("not exceed 63"));

  // Invalid: leading / trailing hyphens
  assert.strictEqual(validateS3BucketName("-my-bucket").valid, false);
  assert.strictEqual(validateS3BucketName("my-bucket-").valid, false);

  // Invalid: consecutive hyphens
  const dblHyphen = validateS3BucketName("my--bucket");
  assert.strictEqual(dblHyphen.valid, false);
  assert.ok(dblHyphen.error.includes("consecutive hyphens"));

  // Invalid: reserved prefixes
  assert.strictEqual(validateS3BucketName("xn--mybucket").valid, false);
  assert.strictEqual(validateS3BucketName("sthree-mybucket").valid, false);

  // Invalid: reserved suffixes
  assert.strictEqual(validateS3BucketName("my-bucket-s3alias").valid, false);
  assert.strictEqual(validateS3BucketName("my-bucket--ol-s3").valid, false);

  // Invalid: IP address format
  const ip = validateS3BucketName("192.168.1.1");
  assert.strictEqual(ip.valid, false);
  assert.ok(ip.error.includes("IP address"));

  console.log("✓ S3 bucket global DNS naming rules verified");
}

// ─── 2. IAM Role & Policy Rules ──────────────────────────────────────────────
{
  assert.strictEqual(validateIamRoleName("app-lambda-execution-role").valid, true);
  assert.strictEqual(validateIamRoleName("ci_deployer@corp").valid, true);
  assert.strictEqual(validateIamRoleName("dev=test+1,2.user").valid, true);

  // Invalid spaces and slashes
  assert.strictEqual(validateIamRoleName("app lambda role").valid, false);
  assert.strictEqual(validateIamRoleName("role/nested").valid, false);

  assert.strictEqual(validateIamPolicyName("s3-read-write-policy").valid, true);
  assert.strictEqual(validateIamPolicyName("policy name with spaces").valid, false);

  console.log("✓ IAM role and policy naming rules verified");
}

// ─── 3. RDS DB Instance Identifier Rules ──────────────────────────────────────
{
  assert.strictEqual(validateRdsIdentifier("prod-postgres-db-1").valid, true);

  // Must begin with a letter
  const leadNum = validateRdsIdentifier("1-postgres-db");
  assert.strictEqual(leadNum.valid, false);
  assert.ok(leadNum.error.includes("begin with a letter"));

  // Cannot end with hyphen
  assert.strictEqual(validateRdsIdentifier("postgres-db-").valid, false);

  // Cannot have consecutive hyphens
  assert.strictEqual(validateRdsIdentifier("postgres--db").valid, false);

  console.log("✓ RDS DB instance identifier rules verified");
}

// ─── 4. SQS & SNS FIFO Rules ──────────────────────────────────────────────────
{
  assert.strictEqual(validateSqsQueueName("orders-queue").valid, true);
  assert.strictEqual(validateSqsQueueName("orders-queue.fifo", true).valid, true);

  // Missing .fifo when FIFO required
  const fifoErr = validateSqsQueueName("orders-queue", true);
  assert.strictEqual(fifoErr.valid, false);
  assert.ok(fifoErr.error.includes(".fifo"));

  console.log("✓ SQS queue and FIFO naming rules verified");
}

// ─── 5. Master Dispatcher (validateAwsResourceName) ───────────────────────────
{
  assert.strictEqual(validateAwsResourceName("aws-s3", "my-valid-bucket").valid, true);
  assert.strictEqual(validateAwsResourceName("aws_s3_bucket", "INVALID_NAME").valid, false);
  assert.strictEqual(validateAwsResourceName("aws-iam-role", "valid-role-name").valid, true);
  assert.strictEqual(validateAwsResourceName("aws-autoscaling-group", "asg-production-app").valid, true);
  assert.strictEqual(validateAwsResourceName("aws-launch-template", "lt-web-servers").valid, true);

  console.log("✓ Master AWS resource name dispatcher verified");
}

// ─── 6. IAM Managed Policies & Trust Services Provider ───────────────────────
{
  const policies = await getManagedPolicies();
  assert.ok(policies.length >= 25, `Expected >= 25 policies, got ${policies.length}`);
  
  const adminPolicy = policies.find((p) => p.policyName === "AdministratorAccess");
  assert.ok(adminPolicy);
  assert.strictEqual(adminPolicy.value, "arn:aws:iam::aws:policy/AdministratorAccess");

  const s3Policy = policies.find((p) => p.policyName === "AmazonS3FullAccess");
  assert.ok(s3Policy);

  // Search filtering
  const s3Filtered = await getManagedPolicies({ search: "s3" });
  assert.ok(s3Filtered.length >= 2);
  assert.ok(s3Filtered.every((p) => p.policyName.toLowerCase().includes("s3") || p.description.toLowerCase().includes("s3")));

  // Trust services
  const trustServices = await getTrustServices();
  assert.ok(trustServices.length >= 8);
  assert.ok(trustServices.some((s) => s.value === "lambda.amazonaws.com"));
  assert.ok(trustServices.some((s) => s.value === "ec2.amazonaws.com"));

  // Assume role policy generator
  const ec2AssumeDoc = JSON.parse(generateAssumeRolePolicy("ec2.amazonaws.com"));
  assert.strictEqual(ec2AssumeDoc.Statement[0].Principal.Service, "ec2.amazonaws.com");
  assert.strictEqual(ec2AssumeDoc.Statement[0].Action, "sts:AssumeRole");

  console.log("✓ AWS IAM Managed Policies and Trust Services offline catalog verified");
}

// ─── 7. Credential-Free EC2 & Compute Dropdown Providers ────────────────────
{
  const instanceTypes = await getInstanceTypes();
  assert.ok(instanceTypes.length >= 20, `Expected >= 20 instance types, got ${instanceTypes.length}`);
  assert.ok(instanceTypes.some((t) => t.value === "t3.micro"));
  assert.ok(instanceTypes.some((t) => t.value === "c5.large"));

  const azs = await getAvailabilityZones();
  assert.ok(azs.length >= 4, `Expected >= 4 AZs, got ${azs.length}`);
  assert.ok(azs.some((z) => z.value === "us-east-1a"));

  const amis = await getAmis();
  assert.ok(amis.length >= 5, `Expected >= 5 AMIs, got ${amis.length}`);

  const keyPairs = await getKeyPairs();
  assert.ok(keyPairs.length >= 2, `Expected >= 2 keypairs, got ${keyPairs.length}`);

  console.log("✓ Credential-free AWS EC2 dynamic dropdown options verified");
}

// ─── 8. Credential-Free GCP Compute Dropdown Providers ──────────────────────
{
  const gcpZones = await getZones();
  assert.ok(gcpZones.length >= 5, `Expected >= 5 GCP zones, got ${gcpZones.length}`);

  const gcpRegions = await getRegions();
  assert.ok(gcpRegions.length >= 4, `Expected >= 4 GCP regions, got ${gcpRegions.length}`);

  const gcpMachines = await getMachineTypes();
  assert.ok(gcpMachines.length >= 5, `Expected >= 5 machine types, got ${gcpMachines.length}`);
  assert.ok(gcpMachines.some((m) => m.value === "e2-medium"));

  console.log("✓ Credential-free GCP Compute dynamic dropdown options verified");
}

console.log("=== ALL AWS NAME & IAM TESTS PASSED SUCCESSFULLY! ===");

