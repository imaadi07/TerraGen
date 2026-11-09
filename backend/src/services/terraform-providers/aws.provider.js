import { BaseTerraformProvider } from "./base.provider.js";

const AWS_OUTPUT_MAP = {
  aws_vpc: [
    { attr: "id", desc: "The ID of the VPC." },
    { attr: "cidr_block", desc: "The primary CIDR block of the VPC." },
  ],
  aws_subnet: [
    { attr: "id", desc: "The ID of the Subnet." },
    { attr: "cidr_block", desc: "The CIDR block of the Subnet." },
  ],
  aws_instance: [
    { attr: "id", desc: "The ID of the EC2 Instance." },
    { attr: "private_ip", desc: "The private IP address of the EC2 Instance." },
    { attr: "public_ip", desc: "The public IP address of the EC2 Instance." },
  ],
  aws_s3_bucket: [
    { attr: "id", desc: "The name/ID of the S3 Bucket." },
    { attr: "arn", desc: "The ARN of the S3 Bucket." },
    { attr: "bucket_domain_name", desc: "The bucket domain name." },
  ],
  aws_db_instance: [
    { attr: "id", desc: "The RDS Database identifier." },
    { attr: "endpoint", desc: "The connection endpoint for the RDS Database." },
    { attr: "address", desc: "The hostname of the RDS Database." },
    { attr: "port", desc: "The port of the RDS Database." },
  ],
  aws_dynamodb_table: [
    { attr: "id", desc: "The name/ID of the DynamoDB Table." },
    { attr: "arn", desc: "The ARN of the DynamoDB Table." },
  ],
  aws_eks_cluster: [
    { attr: "id", desc: "The EKS Cluster Name." },
    { attr: "endpoint", desc: "The endpoint for the EKS Kubernetes API." },
    { attr: "identity[0].oidc[0].issuer", desc: "The OIDC Issuer URL for the EKS Cluster." },
  ],
  aws_eks_node_group: [
    { attr: "id", desc: "The EKS Node Group ID." },
    { attr: "arn", desc: "The ARN of the EKS Node Group." },
  ],
  aws_ecs_cluster: [
    { attr: "id", desc: "The ID of the ECS Cluster." },
    { attr: "arn", desc: "The ARN of the ECS Cluster." },
  ],
  aws_ecs_service: [
    { attr: "id", desc: "The ID of the ECS Service." },
    { attr: "name", desc: "The name of the ECS Service." },
  ],
  aws_ecs_task_definition: [
    { attr: "arn", desc: "The full ARN of the Task Definition." },
  ],
  aws_lambda_function: [
    { attr: "arn", desc: "The ARN of the Lambda Function." },
    { attr: "function_name", desc: "The name of the Lambda Function." },
  ],
  aws_lb: [
    { attr: "id", desc: "The ARN of the Load Balancer." },
    { attr: "dns_name", desc: "The DNS name of the Load Balancer." },
    { attr: "zone_id", desc: "The canonical hosted zone ID of the Load Balancer." },
  ],
  aws_lb_target_group: [
    { attr: "arn", desc: "The ARN of the Target Group." },
  ],
  aws_security_group: [
    { attr: "id", desc: "The ID of the Security Group." },
    { attr: "arn", desc: "The ARN of the Security Group." },
  ],
  aws_internet_gateway: [
    { attr: "id", desc: "The ID of the Internet Gateway." },
  ],
  aws_nat_gateway: [
    { attr: "id", desc: "The ID of the NAT Gateway." },
    { attr: "public_ip", desc: "The public IP of the NAT Gateway." },
  ],
  aws_route_table: [
    { attr: "id", desc: "The ID of the Route Table." },
  ],
  aws_eip: [
    { attr: "id", desc: "The allocation ID of the Elastic IP." },
    { attr: "public_ip", desc: "The Elastic IP address." },
  ],
  aws_sqs_queue: [
    { attr: "id", desc: "The URL of the created Amazon SQS queue." },
    { attr: "arn", desc: "The ARN of the SQS queue." },
  ],
  aws_sns_topic: [
    { attr: "arn", desc: "The ARN of the SNS topic." },
  ],
  aws_apigatewayv2_api: [
    { attr: "id", desc: "The API identifier." },
    { attr: "api_endpoint", desc: "The URI of the API." },
  ],
  aws_kms_key: [
    { attr: "arn", desc: "The Amazon Resource Name (ARN) of the key." },
    { attr: "key_id", desc: "The globally unique identifier for the key." },
  ],
  aws_kms_alias: [
    { attr: "arn", desc: "The Amazon Resource Name (ARN) of the key alias." },
  ],
  aws_route53_zone: [
    { attr: "zone_id", desc: "The Hosted Zone ID." },
    { attr: "name_servers", desc: "A list of name servers in associated delegations." },
  ],
  aws_route53_record: [
    { attr: "fqdn", desc: "FQDN built using the specified name and the zone_id." },
  ],
  aws_cloudfront_distribution: [
    { attr: "id", desc: "The identifier for the distribution." },
    { attr: "domain_name", desc: "The domain name corresponding to the distribution." },
  ],
};

export class AwsTerraformProvider extends BaseTerraformProvider {
  constructor() {
    super({
      key: "aws",
      name: "Amazon Web Services",
      source: "hashicorp/aws",
      defaultVersion: "5.0",
      resourceOutputMappings: AWS_OUTPUT_MAP,
    });
  }

  getProviderBlock() {
    return [
      `provider "aws" {`,
      `  region = var.aws_region`,
      ``,
      `  default_tags {`,
      `    tags = {`,
      `      Environment = var.environment`,
      `      ManagedBy   = "Terraform"`,
      `    }`,
      `  }`,
      `}`,
      ``,
    ].join("\n");
  }

  getVariables() {
    return [
      {
        name: "environment",
        type: "string",
        default: "production",
        description: "Target deployment environment",
      },
      {
        name: "aws_region",
        type: "string",
        default: "us-east-1",
        description: "Target AWS deployment region",
      },
    ];
  }

  getTfVars() {
    return [
      `environment = "production"`,
      `aws_region  = "us-east-1"`,
      ``,
    ].join("\n");
  }

  applyCustomHardening(schema, tfConfig) {
    const tType = schema?.terraformType;
    if (tType === "aws_db_instance") {
      if (tfConfig.storage_encrypted === undefined) tfConfig.storage_encrypted = true;
      if (tfConfig.auto_minor_version_upgrade === undefined) tfConfig.auto_minor_version_upgrade = true;
    } else if (tType === "aws_sqs_queue") {
      if (tfConfig.sqs_managed_sse_enabled === undefined) tfConfig.sqs_managed_sse_enabled = true;
    }
    return tfConfig;
  }
}
