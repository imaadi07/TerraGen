import assert from "node:assert";
import { GraphResolverService } from "../src/services/graph-resolver.service.js";
import { TerraformGeneratorService } from "../src/services/terraform-generator.services.js";

console.log("=== Running Canvas Graph DAG & Terraform Generator Tests ===");

const resolver = new GraphResolverService();
const generator = new TerraformGeneratorService();

// Test 1: Single Node
const singleResult = resolver.resolveGraph(
  [
    {
      id: "node-s3",
      resourceType: "aws-s3",
      instanceName: "backup_bucket",
      version: "5.0",
      values: { bucketName: "my-app-backup-bucket-2026" },
    },
  ],
  []
);

assert.strictEqual(singleResult.sortedNodes.length, 1);
assert.strictEqual(singleResult.sortedNodes[0].instanceName, "backup_bucket");
console.log("✓ Single node graph resolved successfully");

// Test 2: Dependency Chain: VPC -> Subnet -> EC2
const chainResult = resolver.resolveGraph(
  [
    {
      id: "node-ec2",
      resourceType: "aws-ec2",
      instanceName: "web_server_1",
      version: "5.0",
      values: { instanceType: "t3.micro", ami: "ami-12345678" },
    },
    {
      id: "node-subnet",
      resourceType: "aws-subnet",
      instanceName: "public_subnet",
      version: "5.0",
      values: { cidrBlock: "10.0.1.0/24" },
    },
    {
      id: "node-vpc",
      resourceType: "aws-vpc",
      instanceName: "prod_vpc",
      version: "5.0",
      values: { cidrBlock: "10.0.0.0/16" },
    },
  ],
  [
    {
      id: "edge-1",
      source: "node-vpc",
      target: "node-subnet",
      targetField: "vpcId",
    },
    {
      id: "edge-2",
      source: "node-subnet",
      target: "node-ec2",
      targetField: "subnetId",
    },
  ]
);

const orderedTypes = chainResult.sortedNodes.map((n) => n.resourceType);
console.log("Topological sort order:", orderedTypes);
assert.deepStrictEqual(orderedTypes, ["aws-vpc", "aws-subnet", "aws-ec2"]);

// Check reference bindings
assert.strictEqual(
  chainResult.refMaps["node-subnet"].vpcId,
  "aws_vpc.prod_vpc.id"
);
assert.strictEqual(
  chainResult.refMaps["node-ec2"].subnetId,
  "aws_subnet.public_subnet.id"
);
console.log("✓ Topological order and reference bindings verified");

// Test 3: Generate Terraform from Graph
const tfOutput = generator.generateFromGraph({
  provider: "aws",
  nodes: [
    {
      id: "node-ec2",
      resourceType: "aws-ec2",
      instanceName: "web_server_1",
      version: "5.0",
      values: { instanceType: "t3.micro", ami: "ami-12345678" },
    },
    {
      id: "node-subnet",
      resourceType: "aws-subnet",
      instanceName: "public_subnet",
      version: "5.0",
      values: { cidrBlock: "10.0.1.0/24" },
    },
    {
      id: "node-vpc",
      resourceType: "aws-vpc",
      instanceName: "prod_vpc",
      version: "5.0",
      values: { cidrBlock: "10.0.0.0/16" },
    },
  ],
  edges: [
    {
      id: "edge-1",
      source: "node-vpc",
      target: "node-subnet",
      targetField: "vpcId",
    },
    {
      id: "edge-2",
      source: "node-subnet",
      target: "node-ec2",
      targetField: "subnetId",
    },
  ],
});

assert(tfOutput.terraform.includes('resource "aws_vpc" "prod_vpc"'));
assert(tfOutput.terraform.includes('resource "aws_subnet" "public_subnet"'));
assert(tfOutput.terraform.includes('resource "aws_instance" "web_server_1"'));
assert(tfOutput.terraform.includes('vpc_id = aws_vpc.prod_vpc.id'));
assert(tfOutput.terraform.includes('subnet_id = aws_subnet.public_subnet.id'));
console.log("✓ Multi-resource graph HCL generated with correct wiring");

// Test 4: Cycle Detection
try {
  resolver.resolveGraph(
    [
      { id: "A", resourceType: "aws-vpc", instanceName: "vpc_a", version: "5.0", values: {} },
      { id: "B", resourceType: "aws-subnet", instanceName: "subnet_b", version: "5.0", values: {} },
    ],
    [
      { id: "e1", source: "A", target: "B" },
      { id: "e2", source: "B", target: "A" },
    ]
  );
  assert.fail("Should have thrown circular dependency error");
} catch (err) {
  assert(err.message.includes("Circular dependency detected"));
  console.log("✓ Cycle detection correctly rejected invalid circular graph");
}

// Test 5: Multi-connection handling (e.g. AWS EKS connecting multiple subnets into array)
{
  const multiResult = resolver.resolveGraph(
    [
      { id: "s1", resourceType: "aws-subnet", instanceName: "sub_1", version: "5.0", values: { cidrBlock: "10.0.1.0/24" } },
      { id: "s2", resourceType: "aws-subnet", instanceName: "sub_2", version: "5.0", values: { cidrBlock: "10.0.2.0/24" } },
      { id: "eks", resourceType: "aws-eks", instanceName: "my_cluster", version: "5.0", values: { name: "my-cluster", roleArn: "arn:aws:iam::123456789012:role/eks-role", version: "1.29", vpcId: "vpc-12345678" } },
    ],
    [
      { id: "e1", source: "s1", target: "eks", targetField: "subnetIds" },
      { id: "e2", source: "s2", target: "eks", targetField: "subnetIds" },
    ]
  );

  assert(Array.isArray(multiResult.refMaps["eks"].subnetIds), "subnetIds should be an array of references");
  assert.strictEqual(multiResult.refMaps["eks"].subnetIds.length, 2);
  assert(multiResult.refMaps["eks"].subnetIds.includes("aws_subnet.sub_1.id"));
  assert(multiResult.refMaps["eks"].subnetIds.includes("aws_subnet.sub_2.id"));

  const multiTf = generator.generateFromGraph({
    provider: "aws",
    nodes: [
      { id: "s1", resourceType: "aws-subnet", instanceName: "sub_1", version: "5.0", values: { cidrBlock: "10.0.1.0/24" } },
      { id: "s2", resourceType: "aws-subnet", instanceName: "sub_2", version: "5.0", values: { cidrBlock: "10.0.2.0/24" } },
      { id: "eks", resourceType: "aws-eks", instanceName: "my_cluster", version: "5.0", values: { name: "my-cluster", roleArn: "arn:aws:iam::123456789012:role/eks-role", version: "1.29", vpcId: "vpc-12345678" } },
    ],
    edges: [
      { id: "e1", source: "s1", target: "eks", targetField: "subnetIds" },
      { id: "e2", source: "s2", target: "eks", targetField: "subnetIds" },
    ],
  });

  assert(multiTf.terraform.includes("subnet_ids = [aws_subnet.sub_1.id, aws_subnet.sub_2.id]"), "Should emit array of unquoted refs in HCL");
  console.log("✓ Multi-resource connection array resolution and unquoted HCL emission verified");
}

// Test 6: Serverless EDA DAG: IAM Role -> Lambda Function + DynamoDB
{
  const serverlessTf = generator.generateFromGraph({
    provider: "aws",
    nodes: [
      {
        id: "role-1",
        resourceType: "aws-iam-role",
        instanceName: "lambda_role",
        version: "5.0",
        values: {
          name: "app_lambda_role",
          assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "lambda.amazonaws.com" },
              },
            ],
          }),
        },
      },
      {
        id: "lambda-1",
        resourceType: "aws-lambda-function",
        instanceName: "order_fn",
        version: "5.0",
        values: {
          functionName: "order-service",
          runtime: "nodejs20.x",
          handler: "index.handler",
        },
      },
      {
        id: "ddb-1",
        resourceType: "aws-dynamodb-table",
        instanceName: "order_table",
        version: "5.0",
        values: {
          name: "orders",
          billingMode: "PAY_PER_REQUEST",
          hashKey: "id",
        },
      },
    ],
    edges: [
      {
        id: "e-role-lambda",
        source: "role-1",
        target: "lambda-1",
        targetField: "role",
      },
    ],
  });

  assert(serverlessTf.terraform.includes('resource "aws_iam_role" "lambda_role"'), "Should contain IAM role");
  assert(serverlessTf.terraform.includes('resource "aws_lambda_function" "order_fn"'), "Should contain Lambda function");
  assert(serverlessTf.terraform.includes('resource "aws_dynamodb_table" "order_table"'), "Should contain DynamoDB table");
  assert(serverlessTf.terraform.includes("role = aws_iam_role.lambda_role.arn"), "Lambda role should reference IAM role ARN");
  console.log("✓ Serverless EDA DAG generation and IAM reference binding verified");
}

// Test 7: GCP GKE & Cloud SQL Multi-Resource DAG Generation
{
  const gcpTf = generator.generateFromGraph({
    provider: "gcp",
    nodes: [
      {
        id: "gcp-net",
        resourceType: "gcp-compute-network",
        instanceName: "custom_vpc",
        version: "5.0",
        values: { name: "custom-vpc", autoCreateSubnetworks: false },
      },
      {
        id: "gcp-subnet",
        resourceType: "gcp-compute-subnetwork",
        instanceName: "gke_subnet",
        version: "5.0",
        values: { name: "gke-subnet", ipCidrRange: "10.10.0.0/16", region: "us-central1" },
      },
      {
        id: "gcp-gke",
        resourceType: "gcp-container-cluster",
        instanceName: "primary_cluster",
        version: "5.0",
        values: { name: "prod-gke-cluster", location: "us-central1", removeDefaultNodePool: true },
      },
      {
        id: "gcp-pool",
        resourceType: "gcp-container-node-pool",
        instanceName: "worker_nodes",
        version: "5.0",
        values: { name: "app-workers", machineType: "e2-standard-4", location: "us-central1" },
      },
      {
        id: "gcp-sql-inst",
        resourceType: "gcp-sql-database-instance",
        instanceName: "app_db_inst",
        version: "5.0",
        values: { name: "prod-db-instance", databaseVersion: "POSTGRES_16", tier: "db-custom-2-7680", region: "us-central1" },
      },
      {
        id: "gcp-sql-db",
        resourceType: "gcp-sql-database",
        instanceName: "app_db",
        version: "5.0",
        values: { name: "production_db", charset: "UTF8" },
      },
    ],
    edges: [
      { id: "e-net-subnet", source: "gcp-net", target: "gcp-subnet", targetField: "network" },
      { id: "e-net-cluster", source: "gcp-net", target: "gcp-gke", targetField: "network" },
      { id: "e-subnet-cluster", source: "gcp-subnet", target: "gcp-gke", targetField: "subnetwork" },
      { id: "e-cluster-pool", source: "gcp-gke", target: "gcp-pool", targetField: "cluster" },
      { id: "e-inst-db", source: "gcp-sql-inst", target: "gcp-sql-db", targetField: "instance" },
    ],
  });

  assert(gcpTf.terraform.includes('resource "google_compute_network" "custom_vpc"'), "Should contain GCP Network");
  assert(gcpTf.terraform.includes('resource "google_compute_subnetwork" "gke_subnet"'), "Should contain GCP Subnet");
  assert(gcpTf.terraform.includes('resource "google_container_cluster" "primary_cluster"'), "Should contain GKE Cluster");
  assert(gcpTf.terraform.includes('resource "google_container_node_pool" "worker_nodes"'), "Should contain GKE Node Pool");
  assert(gcpTf.terraform.includes('resource "google_sql_database_instance" "app_db_inst"'), "Should contain Cloud SQL Instance");
  assert(gcpTf.terraform.includes('resource "google_sql_database" "app_db"'), "Should contain Cloud SQL Database");

  // Verify reference bindings
  assert(gcpTf.terraform.includes("cluster = google_container_cluster.primary_cluster.name"), "Node pool must reference GKE cluster name");
  assert(gcpTf.terraform.includes("instance = google_sql_database_instance.app_db_inst.name"), "SQL DB must reference SQL instance name");

  console.log("✓ GCP GKE & Cloud SQL multi-resource DAG generation and reference binding verified");
}

// Test 8: AWS KMS & Route53 & EKS Node Group Multi-Resource DAG
{
  const awsModernTf = generator.generateFromGraph({
    provider: "aws",
    nodes: [
      {
        id: "node-kms",
        resourceType: "aws-kms-key",
        instanceName: "app_key",
        version: "5.0",
        values: { description: "Encryption master key", deletionWindowInDays: 30 },
      },
      {
        id: "node-kms-alias",
        resourceType: "aws-kms-alias",
        instanceName: "app_key_alias",
        version: "5.0",
        values: { name: "alias/app-master" },
      },
      {
        id: "node-r53-zone",
        resourceType: "aws-route53-zone",
        instanceName: "app_zone",
        version: "5.0",
        values: { name: "company.internal" },
      },
      {
        id: "node-r53-rec",
        resourceType: "aws-route53-record",
        instanceName: "app_rec",
        version: "5.0",
        values: { name: "api.company.internal", type: "A", ttl: 300, records: ["10.0.0.5"] },
      },
    ],
    edges: [
      { id: "e-kms-alias", source: "node-kms", target: "node-kms-alias", targetField: "targetKeyId" },
      { id: "e-zone-rec", source: "node-r53-zone", target: "node-r53-rec", targetField: "zoneId" },
    ],
  });

  assert(awsModernTf.terraform.includes('resource "aws_kms_key" "app_key"'), "Should contain KMS Key");
  assert(awsModernTf.terraform.includes('resource "aws_kms_alias" "app_key_alias"'), "Should contain KMS Alias");
  assert(awsModernTf.terraform.includes('resource "aws_route53_zone" "app_zone"'), "Should contain Route53 Zone");
  assert(awsModernTf.terraform.includes('resource "aws_route53_record" "app_rec"'), "Should contain Route53 Record");
  assert(awsModernTf.terraform.includes("target_key_id = aws_kms_key.app_key.id"), "KMS Alias must link to KMS Key ID");
  assert(awsModernTf.terraform.includes("zone_id = aws_route53_zone.app_zone.zone_id"), "Route53 Record must link to Zone ID");
  console.log("✓ AWS KMS & Route53 DAG generation and reference binding verified");
}

// Test 9: GCP v6.0 BigQuery, KMS & Artifact Registry DAG
{
  const gcpV6Tf = generator.generateFromGraph({
    provider: "gcp",
    nodes: [
      {
        id: "node-art",
        resourceType: "gcp-artifact-registry-repository",
        instanceName: "app_repo",
        version: "6.0",
        values: { repositoryId: "containers", format: "DOCKER", location: "us-central1" },
      },
      {
        id: "node-bq-ds",
        resourceType: "gcp-bigquery-dataset",
        instanceName: "dw_ds",
        version: "6.0",
        values: { datasetId: "analytics_dw", location: "US" },
      },
      {
        id: "node-bq-tbl",
        resourceType: "gcp-bigquery-table",
        instanceName: "dw_tbl",
        version: "6.0",
        values: { tableId: "events_stream", deletionProtection: false },
      },
      {
        id: "node-gcp-ring",
        resourceType: "gcp-kms-key-ring",
        instanceName: "sec_ring",
        version: "6.0",
        values: { name: "security-ring", location: "us-central1" },
      },
      {
        id: "node-gcp-crypto",
        resourceType: "gcp-kms-crypto-key",
        instanceName: "sec_key",
        version: "6.0",
        values: { name: "cmek-key" },
      },
    ],
    edges: [
      { id: "e-bq-tbl", source: "node-bq-ds", target: "node-bq-tbl", targetField: "datasetId" },
      { id: "e-gcp-key", source: "node-gcp-ring", target: "node-gcp-crypto", targetField: "keyRing" },
    ],
  });

  assert(gcpV6Tf.terraform.includes('version = "~> 6.0"'), "Provider header should reflect v6.0");
  assert(gcpV6Tf.terraform.includes('resource "google_artifact_registry_repository" "app_repo"'));
  assert(gcpV6Tf.terraform.includes('resource "google_bigquery_dataset" "dw_ds"'));
  assert(gcpV6Tf.terraform.includes('resource "google_bigquery_table" "dw_tbl"'));
  assert(gcpV6Tf.terraform.includes('resource "google_kms_key_ring" "sec_ring"'));
  assert(gcpV6Tf.terraform.includes('resource "google_kms_crypto_key" "sec_key"'));
  assert(gcpV6Tf.terraform.includes("dataset_id = google_bigquery_dataset.dw_ds.dataset_id"), "BQ Table must reference dataset_id");
  assert(gcpV6Tf.terraform.includes("key_ring = google_kms_key_ring.sec_ring.id"), "Crypto Key must reference KeyRing ID");
  console.log("✓ GCP v6.0 BigQuery, KMS & Artifact Registry DAG verified with provider v6.0 constraint");
}

// Test 10: Azure AKS, Networking, SQL, and Key Vault Multi-Resource DAG
{
  const azureTf = generator.generateFromGraph({
    provider: "azure",
    nodes: [
      {
        id: "az-rg",
        resourceType: "azure-resource-group",
        instanceName: "core_rg",
        version: "4.0",
        values: { name: "rg-core-prod", location: "eastus" },
      },
      {
        id: "az-vnet",
        resourceType: "azure-virtual-network",
        instanceName: "core_vnet",
        version: "4.0",
        values: { name: "vnet-core-prod", addressSpace: ["10.0.0.0/16"], location: "eastus" },
      },
      {
        id: "az-subnet",
        resourceType: "azure-subnet",
        instanceName: "aks_subnet",
        version: "4.0",
        values: { name: "snet-aks", addressPrefixes: ["10.0.1.0/24"] },
      },
      {
        id: "az-aks",
        resourceType: "azure-kubernetes-cluster",
        instanceName: "primary_aks",
        version: "4.0",
        values: { name: "aks-prod-cluster", dnsPrefix: "aksprod", location: "eastus" },
      },
      {
        id: "az-sql",
        resourceType: "azure-mssql-server",
        instanceName: "app_sql",
        version: "4.0",
        values: { name: "sql-core-app", location: "eastus" },
      },
      {
        id: "az-db",
        resourceType: "azure-mssql-database",
        instanceName: "app_db",
        version: "4.0",
        values: { name: "sqldb-orders", skuName: "S1" },
      },
      {
        id: "az-kv",
        resourceType: "azure-key-vault",
        instanceName: "app_kv",
        version: "4.0",
        values: { name: "kv-core-prod", location: "eastus" },
      },
      {
        id: "az-secret",
        resourceType: "azure-key-vault-secret",
        instanceName: "db_secret",
        version: "4.0",
        values: { name: "SqlDbPassword", value: "SecretPassword123!" },
      },
    ],
    edges: [
      { id: "e-rg-vnet", source: "az-rg", target: "az-vnet", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e-vnet-subnet", source: "az-vnet", target: "az-subnet", targetField: "virtualNetworkName", sourceOutput: "name" },
      { id: "e-rg-subnet", source: "az-rg", target: "az-subnet", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e-subnet-aks", source: "az-subnet", target: "az-aks", targetField: "defaultNodePoolVnetSubnetId", sourceOutput: "id" },
      { id: "e-rg-aks", source: "az-rg", target: "az-aks", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e-rg-sql", source: "az-rg", target: "az-sql", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e-sql-db", source: "az-sql", target: "az-db", targetField: "serverId", sourceOutput: "id" },
      { id: "e-rg-kv", source: "az-rg", target: "az-kv", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e-kv-sec", source: "az-kv", target: "az-secret", targetField: "keyVaultId", sourceOutput: "id" },
    ],
  });

  assert(azureTf.terraform.includes('source  = "hashicorp/azurerm"'), "Should reference azurerm provider source");
  assert(azureTf.terraform.includes('version = "~> 4.0"'), "Provider header should reflect azurerm v4.0");
  assert(azureTf.terraform.includes('required_version = ">= 1.5.0"'), "Must include production required_version constraint");
  assert(azureTf.terraform.includes('provider "azurerm" {'), "Must include azurerm provider block");
  assert(azureTf.terraform.includes("prevent_deletion_if_contains_resources = false"), "Must include RG prevent_deletion safeguard");
  assert(azureTf.terraform.includes("recover_soft_deleted_key_vaults = true"), "Must include Key Vault soft-delete recovery safeguard");
  assert(azureTf.terraform.includes('variable "environment"'), "Must include environment variable");
  assert(azureTf.terraform.includes('variable "azure_location"'), "Must include azure_location variable");
  assert(azureTf.terraform.includes('resource "azurerm_resource_group" "core_rg"'));
  assert(azureTf.terraform.includes('resource "azurerm_virtual_network" "core_vnet"'));
  assert(azureTf.terraform.includes('resource "azurerm_subnet" "aks_subnet"'));
  assert(azureTf.terraform.includes('resource "azurerm_kubernetes_cluster" "primary_aks"'));
  assert(azureTf.terraform.includes('resource "azurerm_mssql_server" "app_sql"'));
  assert(azureTf.terraform.includes('resource "azurerm_mssql_database" "app_db"'));
  assert(azureTf.terraform.includes('resource "azurerm_key_vault" "app_kv"'));
  assert(azureTf.terraform.includes('resource "azurerm_key_vault_secret" "db_secret"'));

  // Production Outputs
  assert(azureTf.terraform.includes('output "primary_aks_id"'), "Must export AKS cluster ID output");
  assert(azureTf.terraform.includes('output "primary_aks_oidc_issuer_url"'), "Must export AKS OIDC URL output");
  assert(azureTf.terraform.includes('output "app_sql_fully_qualified_domain_name"'), "Must export SQL FQDN output");
  assert(azureTf.terraform.includes('output "app_kv_vault_uri"'), "Must export Key Vault URI output");

  // Reference bindings
  assert(azureTf.terraform.includes("resource_group_name = azurerm_resource_group.core_rg.name"), "VNet/Subnet must reference RG name");
  assert(azureTf.terraform.includes("virtual_network_name = azurerm_virtual_network.core_vnet.name"), "Subnet must reference VNet name");
  assert(azureTf.terraform.includes("server_id = azurerm_mssql_server.app_sql.id"), "SQL DB must reference SQL server ID");
  assert(azureTf.terraform.includes("key_vault_id = azurerm_key_vault.app_kv.id"), "KV Secret must reference Key Vault ID");

  console.log("✓ Azure AKS, VNet, SQL, and Key Vault multi-resource DAG verified with azurerm provider");
}

// Test 11: GCP Complete Global Application Load Balancer Stack DAG
{
  const gcpLbTf = generator.generateFromGraph({
    provider: "gcp",
    nodes: [
      {
        id: "node-ip",
        resourceType: "gcp-compute-global-address",
        instanceName: "lb_ip",
        version: "6.0",
        values: { name: "app-global-ip" },
      },
      {
        id: "node-hc",
        resourceType: "gcp-compute-health-check",
        instanceName: "http_hc",
        version: "6.0",
        values: { name: "app-health-check", checkIntervalSec: 10, timeoutSec: 5 },
      },
      {
        id: "node-bs",
        resourceType: "gcp-compute-backend-service",
        instanceName: "app_backend",
        version: "6.0",
        values: { name: "app-backend-svc", protocol: "HTTP", portName: "http", timeoutSec: 30 },
      },
      {
        id: "node-um",
        resourceType: "gcp-compute-url-map",
        instanceName: "app_url_map",
        version: "6.0",
        values: { name: "app-web-map" },
      },
      {
        id: "node-tp",
        resourceType: "gcp-compute-target-http-proxy",
        instanceName: "app_proxy",
        version: "6.0",
        values: { name: "app-target-proxy" },
      },
      {
        id: "node-fr",
        resourceType: "gcp-compute-global-forwarding-rule",
        instanceName: "app_fwd_rule",
        version: "6.0",
        values: { name: "app-http-forwarding-rule", portRange: "80" },
      },
    ],
    edges: [
      { id: "e-hc-bs", source: "node-hc", target: "node-bs", targetField: "healthChecks", sourceOutput: "id" },
      { id: "e-bs-um", source: "node-bs", target: "node-um", targetField: "defaultService", sourceOutput: "id" },
      { id: "e-um-tp", source: "node-um", target: "node-tp", targetField: "urlMap", sourceOutput: "id" },
      { id: "e-tp-fr", source: "node-tp", target: "node-fr", targetField: "target", sourceOutput: "id" },
      { id: "e-ip-fr", source: "node-ip", target: "node-fr", targetField: "ipAddress", sourceOutput: "address" },
    ],
  });

  assert(gcpLbTf.terraform.includes('resource "google_compute_global_address" "lb_ip"'));
  assert(gcpLbTf.terraform.includes('resource "google_compute_health_check" "http_hc"'));
  assert(gcpLbTf.terraform.includes('resource "google_compute_backend_service" "app_backend"'));
  assert(gcpLbTf.terraform.includes('resource "google_compute_url_map" "app_url_map"'));
  assert(gcpLbTf.terraform.includes('resource "google_compute_target_http_proxy" "app_proxy"'));
  assert(gcpLbTf.terraform.includes('resource "google_compute_global_forwarding_rule" "app_fwd_rule"'));

  // Reference bindings verification
  assert(gcpLbTf.terraform.includes("health_checks = [google_compute_health_check.http_hc.id]"), "Backend Service must reference Health Check");
  assert(gcpLbTf.terraform.includes("default_service = google_compute_backend_service.app_backend.id"), "URL Map must reference Backend Service");
  assert(gcpLbTf.terraform.includes("url_map = google_compute_url_map.app_url_map.id"), "Target HTTP Proxy must reference URL Map");
  assert(gcpLbTf.terraform.includes("target = google_compute_target_http_proxy.app_proxy.id"), "Global Forwarding Rule must reference Target Proxy");
  assert(gcpLbTf.terraform.includes("ip_address = google_compute_global_address.lb_ip.address"), "Global Forwarding Rule must reference Global IP address");

  // Production Standard Output & Labels Verification
  assert(gcpLbTf.terraform.includes('required_version = ">= 1.5.0"'), "GCP Terraform must include required_version");
  assert(gcpLbTf.terraform.includes("default_labels = {"), "GCP Provider must define production default_labels");
  assert(gcpLbTf.terraform.includes('output "app_fwd_rule_ip_address"'), "Must export global forwarding rule IP output");
  assert(gcpLbTf.terraform.includes('output "lb_ip_address"'), "Must export global address output");
  assert(gcpLbTf.terraform.includes('output "app_backend_self_link"'), "Must export backend service self_link output");

  console.log("✓ GCP Global Application Load Balancer multi-resource DAG verified with all component bindings");
}

console.log("=== ALL GRAPH TESTS PASSED SUCCESSFULLY! ===");

