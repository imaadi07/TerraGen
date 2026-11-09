/**
 * AWS IAM Provider
 * Provides a comprehensive, production-grade catalog of official AWS Managed Policies,
 * Trust Service Principals, and AssumeRole templates without requiring AWS credentials from the user.
 */

export const AWS_MANAGED_POLICIES = [
  // ─── Security, Identity & Administration ──────────────────────────────────
  {
    label: "AdministratorAccess",
    value: "arn:aws:iam::aws:policy/AdministratorAccess",
    policyName: "AdministratorAccess",
    category: "Security & Admin",
    description: "Provides full access to AWS services and resources.",
  },
  {
    label: "PowerUserAccess",
    value: "arn:aws:iam::aws:policy/PowerUserAccess",
    policyName: "PowerUserAccess",
    category: "Security & Admin",
    description: "Provides full access to AWS services and resources, but does not allow management of users and groups.",
  },
  {
    label: "ReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/ReadOnlyAccess",
    policyName: "ReadOnlyAccess",
    category: "Security & Admin",
    description: "Provides read-only access to AWS services and resources across the account.",
  },
  {
    label: "ViewOnlyAccess",
    value: "arn:aws:iam::aws:policy/job-function/ViewOnlyAccess",
    policyName: "ViewOnlyAccess",
    category: "Security & Admin",
    description: "Allows view-only access to AWS resources and configuration consoles.",
  },
  {
    label: "SecurityAudit",
    value: "arn:aws:iam::aws:policy/SecurityAudit",
    policyName: "SecurityAudit",
    category: "Security & Admin",
    description: "Grants access to view security configuration and audit metadata without modifying resources.",
  },
  {
    label: "IAMFullAccess",
    value: "arn:aws:iam::aws:policy/IAMFullAccess",
    policyName: "IAMFullAccess",
    category: "Security & Admin",
    description: "Provides full access to IAM resources, users, roles, and policies.",
  },
  {
    label: "IAMReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/IAMReadOnlyAccess",
    policyName: "IAMReadOnlyAccess",
    category: "Security & Admin",
    description: "Provides read-only access to IAM resources.",
  },
  {
    label: "IAMUserChangePassword",
    value: "arn:aws:iam::aws:policy/IAMUserChangePassword",
    policyName: "IAMUserChangePassword",
    category: "Security & Admin",
    description: "Permits IAM users to change their own password.",
  },
  {
    label: "SecretsManagerReadWrite",
    value: "arn:aws:iam::aws:policy/SecretsManagerReadWrite",
    policyName: "SecretsManagerReadWrite",
    category: "Security & Admin",
    description: "Provides read and write access to Secrets Manager.",
  },
  {
    label: "AWSKeyManagementServicePowerUser",
    value: "arn:aws:iam::aws:policy/AWSKeyManagementServicePowerUser",
    policyName: "AWSKeyManagementServicePowerUser",
    category: "Security & Admin",
    description: "Provides full access to KMS keys without permission to delete keys.",
  },
  {
    label: "AWSCloudTrail_FullAccess",
    value: "arn:aws:iam::aws:policy/AWSCloudTrail_FullAccess",
    policyName: "AWSCloudTrail_FullAccess",
    category: "Security & Admin",
    description: "Provides full access to AWS CloudTrail resources and trails.",
  },
  {
    label: "AWSSecurityHubFullAccess",
    value: "arn:aws:iam::aws:policy/AWSSecurityHubFullAccess",
    policyName: "AWSSecurityHubFullAccess",
    category: "Security & Admin",
    description: "Provides full administrative access to AWS Security Hub.",
  },
  {
    label: "AmazonGuardDutyFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonGuardDutyFullAccess",
    policyName: "AmazonGuardDutyFullAccess",
    category: "Security & Admin",
    description: "Provides full access to Amazon GuardDuty detection and detectors.",
  },
  {
    label: "AWSWAFConsoleFullAccess",
    value: "arn:aws:iam::aws:policy/AWSWAFConsoleFullAccess",
    policyName: "AWSWAFConsoleFullAccess",
    category: "Security & Admin",
    description: "Provides full access to AWS WAF Web ACLs and rule groups.",
  },
  {
    label: "AWSShieldFullAccess",
    value: "arn:aws:iam::aws:policy/AWSShieldFullAccess",
    policyName: "AWSShieldFullAccess",
    category: "Security & Admin",
    description: "Provides full access to AWS Shield Advanced DDoS protection.",
  },

  // ─── Compute, EC2 & Auto Scaling ──────────────────────────────────────────
  {
    label: "AmazonEC2FullAccess",
    value: "arn:aws:iam::aws:policy/AmazonEC2FullAccess",
    policyName: "AmazonEC2FullAccess",
    category: "Compute",
    description: "Provides full access to Amazon EC2, VPC, Security Groups, and related compute resources.",
  },
  {
    label: "AmazonEC2ReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess",
    policyName: "AmazonEC2ReadOnlyAccess",
    category: "Compute",
    description: "Provides read-only access to Amazon EC2 resources.",
  },
  {
    label: "AutoScalingFullAccess",
    value: "arn:aws:iam::aws:policy/AutoScalingFullAccess",
    policyName: "AutoScalingFullAccess",
    category: "Compute",
    description: "Provides full access to Auto Scaling groups, launch templates, and policies.",
  },
  {
    label: "AutoScalingReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AutoScalingReadOnlyAccess",
    policyName: "AutoScalingReadOnlyAccess",
    category: "Compute",
    description: "Provides read-only access to Auto Scaling.",
  },
  {
    label: "AutoScalingNotificationAccessRole",
    value: "arn:aws:iam::aws:policy/service-role/AutoScalingNotificationAccessRole",
    policyName: "AutoScalingNotificationAccessRole",
    category: "Compute",
    description: "Grants Auto Scaling permissions to publish notifications to SNS topics.",
  },
  {
    label: "AmazonSSMManagedInstanceCore",
    value: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    policyName: "AmazonSSMManagedInstanceCore",
    category: "Compute",
    description: "The policy for Amazon EC2 Role to enable AWS Systems Manager service core functionality (Session Manager).",
  },
  {
    label: "AmazonSSMFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonSSMFullAccess",
    policyName: "AmazonSSMFullAccess",
    category: "Compute",
    description: "Provides full access to AWS Systems Manager.",
  },
  {
    label: "AWSBatchFullAccess",
    value: "arn:aws:iam::aws:policy/AWSBatchFullAccess",
    policyName: "AWSBatchFullAccess",
    category: "Compute",
    description: "Provides full access to AWS Batch computing queues and compute environments.",
  },
  {
    label: "AWSBatchServiceRole",
    value: "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole",
    policyName: "AWSBatchServiceRole",
    category: "Compute",
    description: "Service role for AWS Batch to manage compute environment instances.",
  },
  {
    label: "AWSAppRunnerFullAccess",
    value: "arn:aws:iam::aws:policy/AWSAppRunnerFullAccess",
    policyName: "AWSAppRunnerFullAccess",
    category: "Compute",
    description: "Provides full administrative access to AWS App Runner services.",
  },

  // ─── Storage: S3, EFS, FSx & EBS ──────────────────────────────────────────
  {
    label: "AmazonS3FullAccess",
    value: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    policyName: "AmazonS3FullAccess",
    category: "Storage",
    description: "Provides full access to all buckets and objects in Amazon S3.",
  },
  {
    label: "AmazonS3ReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    policyName: "AmazonS3ReadOnlyAccess",
    category: "Storage",
    description: "Provides read-only access to all buckets and objects in Amazon S3.",
  },
  {
    label: "AmazonS3ObjectLambdaExecutionRolePolicy",
    value: "arn:aws:iam::aws:policy/service-role/AmazonS3ObjectLambdaExecutionRolePolicy",
    policyName: "AmazonS3ObjectLambdaExecutionRolePolicy",
    category: "Storage",
    description: "Grants permission for Lambda to transform S3 objects on read.",
  },
  {
    label: "AmazonElasticFileSystemFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonElasticFileSystemFullAccess",
    policyName: "AmazonElasticFileSystemFullAccess",
    category: "Storage",
    description: "Provides full access to Amazon Elastic File System (EFS).",
  },
  {
    label: "AmazonElasticFileSystemReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonElasticFileSystemReadOnlyAccess",
    policyName: "AmazonElasticFileSystemReadOnlyAccess",
    category: "Storage",
    description: "Provides read-only access to Amazon EFS.",
  },
  {
    label: "AmazonFSxFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonFSxFullAccess",
    policyName: "AmazonFSxFullAccess",
    category: "Storage",
    description: "Provides full access to Amazon FSx file systems.",
  },
  {
    label: "AWSStorageGatewayFullAccess",
    value: "arn:aws:iam::aws:policy/AWSStorageGatewayFullAccess",
    policyName: "AWSStorageGatewayFullAccess",
    category: "Storage",
    description: "Provides full access to AWS Storage Gateway.",
  },

  // ─── Serverless & Containers: Lambda, ECS, EKS ───────────────────────────
  {
    label: "AWSLambdaBasicExecutionRole",
    value: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    policyName: "AWSLambdaBasicExecutionRole",
    category: "Serverless & Containers",
    description: "Grants permissions to upload logs to CloudWatch Logs.",
  },
  {
    label: "AWSLambdaVPCAccessExecutionRole",
    value: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
    policyName: "AWSLambdaVPCAccessExecutionRole",
    category: "Serverless & Containers",
    description: "Grants permissions to create network interfaces to connect Lambda to a VPC.",
  },
  {
    label: "AWSLambda_FullAccess",
    value: "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
    policyName: "AWSLambda_FullAccess",
    category: "Serverless & Containers",
    description: "Provides full access to AWS Lambda and event source mappings.",
  },
  {
    label: "AWSLambda_ReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AWSLambda_ReadOnlyAccess",
    policyName: "AWSLambda_ReadOnlyAccess",
    category: "Serverless & Containers",
    description: "Provides read-only access to AWS Lambda functions and configuration.",
  },
  {
    label: "AWSLambdaDynamoDBExecutionRole",
    value: "arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole",
    policyName: "AWSLambdaDynamoDBExecutionRole",
    category: "Serverless & Containers",
    description: "Grants permissions to read from DynamoDB Streams and write logs to CloudWatch.",
  },
  {
    label: "AWSLambdaSQSQueueExecutionRole",
    value: "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole",
    policyName: "AWSLambdaSQSQueueExecutionRole",
    category: "Serverless & Containers",
    description: "Grants permissions to receive and delete messages from SQS and write logs.",
  },
  {
    label: "AWSLambdaKinesisExecutionRole",
    value: "arn:aws:iam::aws:policy/service-role/AWSLambdaKinesisExecutionRole",
    policyName: "AWSLambdaKinesisExecutionRole",
    category: "Serverless & Containers",
    description: "Grants permissions to read from Kinesis data streams.",
  },
  {
    label: "AmazonEC2ContainerServiceforEC2Role",
    value: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role",
    policyName: "AmazonEC2ContainerServiceforEC2Role",
    category: "Serverless & Containers",
    description: "Default policy for ECS container host EC2 instances.",
  },
  {
    label: "AmazonECSTaskExecutionRolePolicy",
    value: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    policyName: "AmazonECSTaskExecutionRolePolicy",
    category: "Serverless & Containers",
    description: "Allows ECS tasks to pull container images from ECR and publish logs to CloudWatch.",
  },
  {
    label: "AmazonECS_FullAccess",
    value: "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    policyName: "AmazonECS_FullAccess",
    category: "Serverless & Containers",
    description: "Provides full access to Amazon ECS clusters, tasks, and services.",
  },
  {
    label: "AmazonEKSClusterPolicy",
    value: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    policyName: "AmazonEKSClusterPolicy",
    category: "Serverless & Containers",
    description: "Allows EKS to manage clusters and Kubernetes control plane on your behalf.",
  },
  {
    label: "AmazonEKSWorkerNodePolicy",
    value: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    policyName: "AmazonEKSWorkerNodePolicy",
    category: "Serverless & Containers",
    description: "Allows EKS worker nodes to connect to EKS Clusters.",
  },
  {
    label: "AmazonEKS_CNI_Policy",
    value: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    policyName: "AmazonEKS_CNI_Policy",
    category: "Serverless & Containers",
    description: "Provides the Amazon VPC CNI plugin the permissions required to modify IP address configuration.",
  },
  {
    label: "AmazonEKSVPCResourceController",
    value: "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
    policyName: "AmazonEKSVPCResourceController",
    category: "Serverless & Containers",
    description: "Policy that allows the VPC Resource Controller to manage ENIs for pods.",
  },
  {
    label: "AmazonEC2ContainerRegistryFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess",
    policyName: "AmazonEC2ContainerRegistryFullAccess",
    category: "Serverless & Containers",
    description: "Provides full access to Amazon ECR container image repositories.",
  },
  {
    label: "AmazonEC2ContainerRegistryReadOnly",
    value: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    policyName: "AmazonEC2ContainerRegistryReadOnly",
    category: "Serverless & Containers",
    description: "Provides read-only access to Amazon ECR image repositories.",
  },

  // ─── Database & Caching: RDS, DynamoDB, ElastiCache, Redshift ────────────
  {
    label: "AmazonRDSFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonRDSFullAccess",
    policyName: "AmazonRDSFullAccess",
    category: "Database",
    description: "Provides full access to Amazon RDS databases and clusters.",
  },
  {
    label: "AmazonRDSReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess",
    policyName: "AmazonRDSReadOnlyAccess",
    category: "Database",
    description: "Provides read-only access to Amazon RDS.",
  },
  {
    label: "AmazonDynamoDBFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    policyName: "AmazonDynamoDBFullAccess",
    category: "Database",
    description: "Provides full access to Amazon DynamoDB tables, indexes, and streams.",
  },
  {
    label: "AmazonDynamoDBReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess",
    policyName: "AmazonDynamoDBReadOnlyAccess",
    category: "Database",
    description: "Provides read-only access to Amazon DynamoDB.",
  },
  {
    label: "AmazonElastiCacheFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonElastiCacheFullAccess",
    policyName: "AmazonElastiCacheFullAccess",
    category: "Database",
    description: "Provides full access to Amazon ElastiCache Redis and Memcached clusters.",
  },
  {
    label: "AmazonElastiCacheReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonElastiCacheReadOnlyAccess",
    policyName: "AmazonElastiCacheReadOnlyAccess",
    category: "Database",
    description: "Provides read-only access to Amazon ElastiCache.",
  },
  {
    label: "AmazonRedshiftFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonRedshiftFullAccess",
    policyName: "AmazonRedshiftFullAccess",
    category: "Database",
    description: "Provides full access to Amazon Redshift data warehouses and clusters.",
  },
  {
    label: "AmazonRedshiftReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonRedshiftReadOnlyAccess",
    policyName: "AmazonRedshiftReadOnlyAccess",
    category: "Database",
    description: "Provides read-only access to Amazon Redshift.",
  },
  {
    label: "AmazonDocumentDBFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonDocumentDBFullAccess",
    policyName: "AmazonDocumentDBFullAccess",
    category: "Database",
    description: "Provides full access to Amazon DocumentDB (with MongoDB compatibility).",
  },
  {
    label: "AmazonNeptuneFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonNeptuneFullAccess",
    policyName: "AmazonNeptuneFullAccess",
    category: "Database",
    description: "Provides full access to Amazon Neptune graph databases.",
  },
  {
    label: "AmazonKeyspacesFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonKeyspacesFullAccess",
    policyName: "AmazonKeyspacesFullAccess",
    category: "Database",
    description: "Provides full access to Amazon Keyspaces (for Apache Cassandra).",
  },

  // ─── Messaging & Integration: SQS, SNS, EventBridge, Step Functions ──────
  {
    label: "AmazonSQSFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
    policyName: "AmazonSQSFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon SQS queues.",
  },
  {
    label: "AmazonSQSReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonSQSReadOnlyAccess",
    policyName: "AmazonSQSReadOnlyAccess",
    category: "Messaging & Integration",
    description: "Provides read-only access to Amazon SQS.",
  },
  {
    label: "AmazonSNSFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
    policyName: "AmazonSNSFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon SNS notification topics.",
  },
  {
    label: "AmazonSNSReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonSNSReadOnlyAccess",
    policyName: "AmazonSNSReadOnlyAccess",
    category: "Messaging & Integration",
    description: "Provides read-only access to Amazon SNS.",
  },
  {
    label: "AmazonEventBridgeFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess",
    policyName: "AmazonEventBridgeFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon EventBridge event buses and rules.",
  },
  {
    label: "AmazonEventBridgeReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonEventBridgeReadOnlyAccess",
    policyName: "AmazonEventBridgeReadOnlyAccess",
    category: "Messaging & Integration",
    description: "Provides read-only access to Amazon EventBridge.",
  },
  {
    label: "AWSStepFunctionsFullAccess",
    value: "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess",
    policyName: "AWSStepFunctionsFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to AWS Step Functions state machines.",
  },
  {
    label: "AWSStepFunctionsReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AWSStepFunctionsReadOnlyAccess",
    policyName: "AWSStepFunctionsReadOnlyAccess",
    category: "Messaging & Integration",
    description: "Provides read-only access to AWS Step Functions.",
  },
  {
    label: "AmazonKinesisFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonKinesisFullAccess",
    policyName: "AmazonKinesisFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon Kinesis data streams.",
  },
  {
    label: "AmazonKinesisFirehoseFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonKinesisFirehoseFullAccess",
    policyName: "AmazonKinesisFirehoseFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon Kinesis Data Firehose delivery streams.",
  },
  {
    label: "AmazonMQFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonMQFullAccess",
    policyName: "AmazonMQFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon MQ message brokers.",
  },
  {
    label: "AmazonMSKFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonMSKFullAccess",
    policyName: "AmazonMSKFullAccess",
    category: "Messaging & Integration",
    description: "Provides full access to Amazon Managed Streaming for Apache Kafka (MSK).",
  },

  // ─── Networking & CDN: VPC, API Gateway, CloudFront, Route53 ─────────────
  {
    label: "AmazonVPCFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonVPCFullAccess",
    policyName: "AmazonVPCFullAccess",
    category: "Networking",
    description: "Provides full access to Amazon VPC networks, subnets, route tables, and gateways.",
  },
  {
    label: "AmazonVPCReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonVPCReadOnlyAccess",
    policyName: "AmazonVPCReadOnlyAccess",
    category: "Networking",
    description: "Provides read-only access to Amazon VPC.",
  },
  {
    label: "AmazonAPIGatewayAdministrator",
    value: "arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator",
    policyName: "AmazonAPIGatewayAdministrator",
    category: "Networking",
    description: "Provides full administrative access to Amazon API Gateway REST and HTTP APIs.",
  },
  {
    label: "AmazonAPIGatewayInvokeFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess",
    policyName: "AmazonAPIGatewayInvokeFullAccess",
    category: "Networking",
    description: "Provides permissions to invoke APIs in API Gateway.",
  },
  {
    label: "CloudFrontFullAccess",
    value: "arn:aws:iam::aws:policy/CloudFrontFullAccess",
    policyName: "CloudFrontFullAccess",
    category: "Networking",
    description: "Provides full access to Amazon CloudFront distributions.",
  },
  {
    label: "CloudFrontReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/CloudFrontReadOnlyAccess",
    policyName: "CloudFrontReadOnlyAccess",
    category: "Networking",
    description: "Provides read-only access to Amazon CloudFront.",
  },
  {
    label: "AmazonRoute53FullAccess",
    value: "arn:aws:iam::aws:policy/AmazonRoute53FullAccess",
    policyName: "AmazonRoute53FullAccess",
    category: "Networking",
    description: "Provides full access to Amazon Route 53 DNS hosted zones and record sets.",
  },
  {
    label: "AmazonRoute53ReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AmazonRoute53ReadOnlyAccess",
    policyName: "AmazonRoute53ReadOnlyAccess",
    category: "Networking",
    description: "Provides read-only access to Amazon Route 53.",
  },
  {
    label: "AWSCertificateManagerFullAccess",
    value: "arn:aws:iam::aws:policy/AWSCertificateManagerFullAccess",
    policyName: "AWSCertificateManagerFullAccess",
    category: "Networking",
    description: "Provides full access to AWS Certificate Manager (ACM) SSL/TLS certificates.",
  },
  {
    label: "AWSDirectConnectFullAccess",
    value: "arn:aws:iam::aws:policy/AWSDirectConnectFullAccess",
    policyName: "AWSDirectConnectFullAccess",
    category: "Networking",
    description: "Provides full access to AWS Direct Connect connections.",
  },
  {
    label: "AWSGlobalAcceleratorFullAccess",
    value: "arn:aws:iam::aws:policy/AWSGlobalAcceleratorFullAccess",
    policyName: "AWSGlobalAcceleratorFullAccess",
    category: "Networking",
    description: "Provides full access to AWS Global Accelerator.",
  },

  // ─── Monitoring, Observability & Logging ──────────────────────────────────
  {
    label: "CloudWatchFullAccess",
    value: "arn:aws:iam::aws:policy/CloudWatchFullAccess",
    policyName: "CloudWatchFullAccess",
    category: "Monitoring",
    description: "Provides full access to Amazon CloudWatch alarms, metrics, and dashboards.",
  },
  {
    label: "CloudWatchReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess",
    policyName: "CloudWatchReadOnlyAccess",
    category: "Monitoring",
    description: "Provides read-only access to CloudWatch.",
  },
  {
    label: "CloudWatchLogsFullAccess",
    value: "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    policyName: "CloudWatchLogsFullAccess",
    category: "Monitoring",
    description: "Provides full access to CloudWatch Logs log groups and streams.",
  },
  {
    label: "CloudWatchLogsReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/CloudWatchLogsReadOnlyAccess",
    policyName: "CloudWatchLogsReadOnlyAccess",
    category: "Monitoring",
    description: "Provides read-only access to CloudWatch Logs.",
  },
  {
    label: "CloudWatchAgentServerPolicy",
    value: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
    policyName: "CloudWatchAgentServerPolicy",
    category: "Monitoring",
    description: "Enables EC2 instances running CloudWatch Agent to send metrics and logs.",
  },
  {
    label: "AWSXrayFullAccess",
    value: "arn:aws:iam::aws:policy/AWSXrayFullAccess",
    policyName: "AWSXrayFullAccess",
    category: "Monitoring",
    description: "Provides full access to AWS X-Ray distributed tracing.",
  },
  {
    label: "AWSXRayDaemonWriteAccess",
    value: "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess",
    policyName: "AWSXRayDaemonWriteAccess",
    category: "Monitoring",
    description: "Grants permission for the X-Ray daemon to send trace data.",
  },

  // ─── DevOps, CI/CD & Infrastructure as Code ──────────────────────────────
  {
    label: "AWSCodePipeline_FullAccess",
    value: "arn:aws:iam::aws:policy/AWSCodePipeline_FullAccess",
    policyName: "AWSCodePipeline_FullAccess",
    category: "DevOps",
    description: "Provides full access to AWS CodePipeline deployment pipelines.",
  },
  {
    label: "AWSCodeBuildAdminAccess",
    value: "arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess",
    policyName: "AWSCodeBuildAdminAccess",
    category: "DevOps",
    description: "Provides full administrative access to AWS CodeBuild projects.",
  },
  {
    label: "AWSCodeCommitFullAccess",
    value: "arn:aws:iam::aws:policy/AWSCodeCommitFullAccess",
    policyName: "AWSCodeCommitFullAccess",
    category: "DevOps",
    description: "Provides full access to AWS CodeCommit Git repositories.",
  },
  {
    label: "AWSCodeDeployFullAccess",
    value: "arn:aws:iam::aws:policy/AWSCodeDeployFullAccess",
    policyName: "AWSCodeDeployFullAccess",
    category: "DevOps",
    description: "Provides full access to AWS CodeDeploy applications and deployments.",
  },
  {
    label: "AWSCloudFormationFullAccess",
    value: "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess",
    policyName: "AWSCloudFormationFullAccess",
    category: "DevOps",
    description: "Provides full access to AWS CloudFormation stacks and templates.",
  },
  {
    label: "AWSCloudFormationReadOnlyAccess",
    value: "arn:aws:iam::aws:policy/AWSCloudFormationReadOnlyAccess",
    policyName: "AWSCloudFormationReadOnlyAccess",
    category: "DevOps",
    description: "Provides read-only access to AWS CloudFormation stacks.",
  },

  // ─── AI, Machine Learning & Analytics ────────────────────────────────────
  {
    label: "AmazonBedrockFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
    policyName: "AmazonBedrockFullAccess",
    category: "AI & ML",
    description: "Provides full access to Amazon Bedrock foundation models and knowledge bases.",
  },
  {
    label: "AmazonBedrockReadOnly",
    value: "arn:aws:iam::aws:policy/AmazonBedrockReadOnly",
    policyName: "AmazonBedrockReadOnly",
    category: "AI & ML",
    description: "Provides read-only access to Amazon Bedrock models and configurations.",
  },
  {
    label: "AmazonSageMakerFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess",
    policyName: "AmazonSageMakerFullAccess",
    category: "AI & ML",
    description: "Provides full access to Amazon SageMaker machine learning studios, models, and endpoints.",
  },
  {
    label: "AmazonSageMakerReadOnly",
    value: "arn:aws:iam::aws:policy/AmazonSageMakerReadOnly",
    policyName: "AmazonSageMakerReadOnly",
    category: "AI & ML",
    description: "Provides read-only access to Amazon SageMaker resources.",
  },
  {
    label: "AmazonAthenaFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonAthenaFullAccess",
    policyName: "AmazonAthenaFullAccess",
    category: "Analytics",
    description: "Provides full access to Amazon Athena serverless SQL queries.",
  },
  {
    label: "AWSGlueConsoleFullAccess",
    value: "arn:aws:iam::aws:policy/AWSGlueConsoleFullAccess",
    policyName: "AWSGlueConsoleFullAccess",
    category: "Analytics",
    description: "Provides full access to AWS Glue data catalogs and ETL jobs.",
  },
  {
    label: "AmazonEMRFullAccessPolicy_v2",
    value: "arn:aws:iam::aws:policy/AmazonEMRFullAccessPolicy_v2",
    policyName: "AmazonEMRFullAccessPolicy_v2",
    category: "Analytics",
    description: "Provides full access to Amazon EMR clusters.",
  },
  {
    label: "AmazonOpenSearchServiceFullAccess",
    value: "arn:aws:iam::aws:policy/AmazonOpenSearchServiceFullAccess",
    policyName: "AmazonOpenSearchServiceFullAccess",
    category: "Analytics",
    description: "Provides full access to Amazon OpenSearch Service domains.",
  },

  // ─── Governance, Organizations & Cost Management ─────────────────────────
  {
    label: "AWSOrganizationsFullAccess",
    value: "arn:aws:iam::aws:policy/AWSOrganizationsFullAccess",
    policyName: "AWSOrganizationsFullAccess",
    category: "Governance & Billing",
    description: "Provides full access to AWS Organizations multi-account structure.",
  },
  {
    label: "AWSBudgetsActions_FullAccess",
    value: "arn:aws:iam::aws:policy/AWSBudgetsActions_FullAccess",
    policyName: "AWSBudgetsActions_FullAccess",
    category: "Governance & Billing",
    description: "Provides full access to AWS Budgets and automated cost actions.",
  },
  {
    label: "AWSCostAndUsageReportAutomationPolicy",
    value: "arn:aws:iam::aws:policy/AWSCostAndUsageReportAutomationPolicy",
    policyName: "AWSCostAndUsageReportAutomationPolicy",
    category: "Governance & Billing",
    description: "Allows configuration and ingestion of AWS Cost and Usage Reports.",
  }
];

// Curated list of 25+ AWS Service Trust Principals for IAM Role AssumeRolePolicy
export const AWS_TRUST_SERVICES = [
  {
    label: "AWS Lambda (lambda.amazonaws.com)",
    value: "lambda.amazonaws.com",
    serviceName: "Lambda",
    category: "Compute & Serverless",
    description: "Allows Lambda functions to execute and call AWS services on your behalf.",
  },
  {
    label: "Amazon EC2 (ec2.amazonaws.com)",
    value: "ec2.amazonaws.com",
    serviceName: "EC2",
    category: "Compute & Serverless",
    description: "Allows EC2 virtual machine instances to call AWS services on your behalf.",
  },
  {
    label: "Amazon ECS Tasks (ecs-tasks.amazonaws.com)",
    value: "ecs-tasks.amazonaws.com",
    serviceName: "ECS Tasks",
    category: "Compute & Serverless",
    description: "Allows ECS container tasks to assume IAM roles for fine-grained permissions.",
  },
  {
    label: "Amazon EKS (eks.amazonaws.com)",
    value: "eks.amazonaws.com",
    serviceName: "EKS",
    category: "Compute & Serverless",
    description: "Allows Amazon EKS control plane to manage cluster resources on your behalf.",
  },
  {
    label: "AWS App Runner (build.apprunner.amazonaws.com)",
    value: "build.apprunner.amazonaws.com",
    serviceName: "App Runner",
    category: "Compute & Serverless",
    description: "Allows AWS App Runner to build and deploy web applications.",
  },
  {
    label: "Amazon API Gateway (apigateway.amazonaws.com)",
    value: "apigateway.amazonaws.com",
    serviceName: "API Gateway",
    category: "Networking & API",
    description: "Allows API Gateway to push logs to CloudWatch or invoke backend AWS services.",
  },
  {
    label: "Amazon EventBridge (events.amazonaws.com)",
    value: "events.amazonaws.com",
    serviceName: "EventBridge",
    category: "Integration",
    description: "Allows EventBridge rules to route events to target AWS services.",
  },
  {
    label: "CloudFront Edge Lambda (edgelambda.amazonaws.com)",
    value: "edgelambda.amazonaws.com",
    serviceName: "Lambda@Edge",
    category: "Networking & API",
    description: "Allows CloudFront edge locations to execute compute functions at low latency.",
  },
  {
    label: "Amazon RDS (rds.amazonaws.com)",
    value: "rds.amazonaws.com",
    serviceName: "RDS",
    category: "Database",
    description: "Allows Amazon RDS to access S3 for backups and KMS for transparent data encryption.",
  },
  {
    label: "Amazon Redshift (redshift.amazonaws.com)",
    value: "redshift.amazonaws.com",
    serviceName: "Redshift",
    category: "Database",
    description: "Allows Amazon Redshift clusters to access S3, Glue, and KMS.",
  },
  {
    label: "AWS Step Functions (states.amazonaws.com)",
    value: "states.amazonaws.com",
    serviceName: "Step Functions",
    category: "Integration",
    description: "Allows Step Functions workflows to execute Lambda, ECS, Batch, and DynamoDB tasks.",
  },
  {
    label: "Amazon Kinesis Data Firehose (firehose.amazonaws.com)",
    value: "firehose.amazonaws.com",
    serviceName: "Kinesis Firehose",
    category: "Integration",
    description: "Allows Kinesis Firehose to deliver streaming data to S3, Redshift, and OpenSearch.",
  },
  {
    label: "AWS Auto Scaling (autoscaling.amazonaws.com)",
    value: "autoscaling.amazonaws.com",
    serviceName: "Auto Scaling",
    category: "Compute & Serverless",
    description: "Allows Auto Scaling groups to manage instance launch and termination on your behalf.",
  },
  {
    label: "Elastic Load Balancing (elasticloadbalancing.amazonaws.com)",
    value: "elasticloadbalancing.amazonaws.com",
    serviceName: "ELB",
    category: "Networking & API",
    description: "Allows Elastic Load Balancing to manage ENIs and security group rules.",
  },
  {
    label: "Amazon S3 (s3.amazonaws.com)",
    value: "s3.amazonaws.com",
    serviceName: "S3",
    category: "Storage",
    description: "Allows S3 buckets to replicate objects or trigger batch operations.",
  },
  {
    label: "AWS CodeBuild (codebuild.amazonaws.com)",
    value: "codebuild.amazonaws.com",
    serviceName: "CodeBuild",
    category: "DevOps",
    description: "Allows AWS CodeBuild to execute CI builds, pull source code, and push artifacts.",
  },
  {
    label: "AWS CodePipeline (codepipeline.amazonaws.com)",
    value: "codepipeline.amazonaws.com",
    serviceName: "CodePipeline",
    category: "DevOps",
    description: "Allows AWS CodePipeline to orchestrate multi-stage deployments.",
  },
  {
    label: "AWS CloudFormation (cloudformation.amazonaws.com)",
    value: "cloudformation.amazonaws.com",
    serviceName: "CloudFormation",
    category: "DevOps",
    description: "Allows AWS CloudFormation to create, update, and delete stack resources.",
  },
  {
    label: "AWS Glue (glue.amazonaws.com)",
    value: "glue.amazonaws.com",
    serviceName: "Glue",
    category: "Analytics",
    description: "Allows AWS Glue crawlers and ETL jobs to connect to data sources.",
  },
  {
    label: "Amazon SageMaker (sagemaker.amazonaws.com)",
    value: "sagemaker.amazonaws.com",
    serviceName: "SageMaker",
    category: "AI & ML",
    description: "Allows SageMaker training jobs and hosted model endpoints to access S3 data.",
  },
  {
    label: "Amazon Bedrock (bedrock.amazonaws.com)",
    value: "bedrock.amazonaws.com",
    serviceName: "Bedrock",
    category: "AI & ML",
    description: "Allows Amazon Bedrock agents and knowledge bases to query vector stores.",
  },
  {
    label: "Amazon Systems Manager (ssm.amazonaws.com)",
    value: "ssm.amazonaws.com",
    serviceName: "SSM",
    category: "Compute & Serverless",
    description: "Allows AWS Systems Manager to execute maintenance tasks and automate runbooks.",
  },
  {
    label: "AWS Batch (batch.amazonaws.com)",
    value: "batch.amazonaws.com",
    serviceName: "Batch",
    category: "Compute & Serverless",
    description: "Allows AWS Batch to manage compute environments and dispatch containerized jobs.",
  }
];

/**
 * Generate standard AWS STS AssumeRolePolicyDocument JSON string for a given service principal.
 * @param {string} servicePrincipal - e.g. "lambda.amazonaws.com"
 * @returns {string} Formatted JSON string
 */
export function generateAssumeRolePolicy(servicePrincipal = "lambda.amazonaws.com") {
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: servicePrincipal,
          },
        },
      ],
    },
    null,
    2
  );
}

/**
 * Get managed policies with optional search keyword and category filter.
 * Works completely offline without requiring any AWS credentials.
 * @param {Object} options
 * @param {string} [options.search]
 * @param {string} [options.category]
 * @returns {Promise<Array>}
 */
export async function getManagedPolicies({ search = "", category = "" } = {}) {
  let list = [...AWS_MANAGED_POLICIES];

  if (category) {
    const catLower = category.toLowerCase();
    list = list.filter((p) => p.category.toLowerCase().includes(catLower));
  }

  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      (p) =>
        p.policyName.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.value.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }

  return list;
}

/**
 * Get trusted service principals.
 * Works completely offline without requiring any AWS credentials.
 * @returns {Promise<Array>}
 */
export async function getTrustServices() {
  return AWS_TRUST_SERVICES;
}
