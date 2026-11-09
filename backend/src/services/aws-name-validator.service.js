/**
 * AWS Resource Name Validator Service
 * Validates resource names against official AWS global and regional naming rules.
 */

/**
 * Validate an S3 bucket name against AWS global DNS naming rules.
 * S3 bucket names are globally unique across all AWS accounts worldwide.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateS3BucketName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Bucket name is required." };
  }

  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Bucket name must be at least 3 characters long." };
  }
  if (trimmed.length > 63) {
    return { valid: false, error: "Bucket name must not exceed 63 characters." };
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, error: "Bucket name must contain only lowercase letters (no uppercase allowed)." };
  }

  // Check for underscores
  if (trimmed.includes("_")) {
    return { valid: false, error: "Bucket name cannot contain underscores (_); use hyphens (-) instead." };
  }

  // Check start and end characters
  if (!/^[a-z0-9]/.test(trimmed)) {
    return { valid: false, error: "Bucket name must begin with a letter or number." };
  }
  if (!/[a-z0-9]$/.test(trimmed)) {
    return { valid: false, error: "Bucket name must end with a letter or number." };
  }

  // IP address pattern check: formatted like an IP address (e.g. 192.168.5.4)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(trimmed)) {
    return { valid: false, error: "Bucket name must not be formatted as an IP address." };
  }

  // Character set check: only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: "Bucket name can only contain lowercase letters, numbers, and hyphens." };
  }

  // Consecutive hyphens check (recommended against by AWS S3 DNS specifications)
  if (trimmed.includes("--")) {
    return { valid: false, error: "Bucket name cannot contain consecutive hyphens (--)." };
  }

  // Reserved prefixes
  if (trimmed.startsWith("xn--")) {
    return { valid: false, error: "Bucket name cannot begin with the reserved 'xn--' prefix." };
  }
  if (trimmed.startsWith("sthree-") || trimmed.startsWith("sthree-configurator-")) {
    return { valid: false, error: "Bucket name cannot begin with reserved prefix 'sthree-'." };
  }

  // Reserved suffixes
  if (trimmed.endsWith("-s3alias") || trimmed.endsWith("--ol-s3")) {
    return { valid: false, error: "Bucket name cannot end with reserved suffix '-s3alias' or '--ol-s3'." };
  }

  return { valid: true, error: null };
}

/**
 * Validate IAM Role Name.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateIamRoleName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "IAM Role name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return { valid: false, error: "IAM Role name must be between 1 and 64 characters long." };
  }
  // Alphanumeric plus +=,.@-
  if (!/^[a-zA-Z0-9+=,.@_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "IAM Role name can only contain alphanumeric characters and symbols: +=,.@-_ (no spaces or slashes).",
    };
  }
  return { valid: true, error: null };
}

/**
 * Validate IAM Policy Name.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateIamPolicyName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "IAM Policy name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 128) {
    return { valid: false, error: "IAM Policy name must be between 1 and 128 characters long." };
  }
  if (!/^[a-zA-Z0-9+=,.@_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "IAM Policy name can only contain alphanumeric characters and symbols: +=,.@-_",
    };
  }
  return { valid: true, error: null };
}

/**
 * Validate RDS DB Instance Identifier.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateRdsIdentifier(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "DB Instance Identifier is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 63) {
    return { valid: false, error: "DB Instance Identifier must be between 1 and 63 characters long." };
  }
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: "DB Instance Identifier must begin with a letter." };
  }
  if (trimmed.endsWith("-")) {
    return { valid: false, error: "DB Instance Identifier cannot end with a hyphen." };
  }
  if (trimmed.includes("--")) {
    return { valid: false, error: "DB Instance Identifier cannot contain two consecutive hyphens." };
  }
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: "DB Instance Identifier can only contain letters, numbers, and hyphens." };
  }
  return { valid: true, error: null };
}

/**
 * Validate DynamoDB Table Name.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateDynamoDbTableName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Table name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 255) {
    return { valid: false, error: "DynamoDB table name must be between 3 and 255 characters long." };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: "DynamoDB table name can only contain letters, numbers, hyphens, periods, and underscores." };
  }
  return { valid: true, error: null };
}

/**
 * Validate SQS Queue Name.
 * @param {string} name
 * @param {boolean} [isFifo=false]
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateSqsQueueName(name, isFifo = false) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Queue name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { valid: false, error: "Queue name must be between 1 and 80 characters long." };
  }
  if (!/^[a-zA-Z0-9_-]+(\.fifo)?$/.test(trimmed)) {
    return { valid: false, error: "Queue name can only contain alphanumeric characters, hyphens, and underscores." };
  }
  if (isFifo || trimmed.endsWith(".fifo")) {
    if (!trimmed.endsWith(".fifo")) {
      return { valid: false, error: "FIFO SQS queues must end with the '.fifo' suffix." };
    }
  }
  return { valid: true, error: null };
}

/**
 * Validate SNS Topic Name.
 * @param {string} name
 * @param {boolean} [isFifo=false]
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateSnsTopicName(name, isFifo = false) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Topic name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 256) {
    return { valid: false, error: "Topic name must be between 1 and 256 characters long." };
  }
  if (!/^[a-zA-Z0-9_-]+(\.fifo)?$/.test(trimmed)) {
    return { valid: false, error: "Topic name can only contain alphanumeric characters, hyphens, and underscores." };
  }
  if (isFifo && !trimmed.endsWith(".fifo")) {
    return { valid: false, error: "FIFO SNS topics must end with the '.fifo' suffix." };
  }
  return { valid: true, error: null };
}

/**
 * Validate Auto Scaling Group Name.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateAutoScalingGroupName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Auto Scaling Group name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 255) {
    return { valid: false, error: "Auto Scaling Group name must be between 1 and 255 characters long." };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: "Auto Scaling Group name can only contain letters, numbers, hyphens, underscores, and periods." };
  }
  return { valid: true, error: null };
}

/**
 * Validate Launch Template Name.
 * @param {string} name
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateLaunchTemplateName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Launch Template name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 128) {
    return { valid: false, error: "Launch Template name must be between 3 and 128 characters long." };
  }
  if (!/^[a-zA-Z0-9()./_-]+$/.test(trimmed)) {
    return { valid: false, error: "Launch Template name can only contain letters, numbers, and ()./_- characters." };
  }
  return { valid: true, error: null };
}

/**
 * Master AWS Resource Name Validator
 * Automatically routes to the resource-specific validator based on canvasType / terraformType.
 * @param {string} resourceType - e.g. "aws-s3", "aws_s3_bucket", "aws-iam-role"
 * @param {string} name - Name to validate
 * @param {Object} [options={}] - Additional options (e.g. isFifo)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateAwsResourceName(resourceType = "", name = "", options = {}) {
  const normalized = String(resourceType).toLowerCase().replace(/_/g, "-");

  if (normalized.includes("s3") && !normalized.includes("versioning")) {
    return validateS3BucketName(name);
  }

  if (normalized.includes("iam-role") && !normalized.includes("attachment")) {
    return validateIamRoleName(name);
  }

  if (normalized.includes("iam-policy") && !normalized.includes("attachment")) {
    return validateIamPolicyName(name);
  }

  if (normalized.includes("db-instance") || normalized.includes("rds")) {
    return validateRdsIdentifier(name);
  }

  if (normalized.includes("dynamodb")) {
    return validateDynamoDbTableName(name);
  }

  if (normalized.includes("sqs")) {
    return validateSqsQueueName(name, options.isFifo);
  }

  if (normalized.includes("sns")) {
    return validateSnsTopicName(name, options.isFifo);
  }

  if (normalized.includes("autoscaling-group")) {
    return validateAutoScalingGroupName(name);
  }

  if (normalized.includes("launch-template")) {
    return validateLaunchTemplateName(name);
  }

  // Generic fallback validation for other AWS resources
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 255) {
    return { valid: false, error: "Resource name must be between 1 and 255 characters." };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: "Resource name contains invalid characters. Use letters, numbers, hyphens, and underscores." };
  }

  return { valid: true, error: null };
}
