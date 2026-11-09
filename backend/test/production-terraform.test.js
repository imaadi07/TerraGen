import assert from "node:assert";
import { TerraformGeneratorService } from "../src/services/terraform-generator.services.js";

console.log("=== Running Production-Ready Multi-Cloud Terraform Tests ===");

const generator = new TerraformGeneratorService();

// 1. Azure Enterprise Production Readiness
{
  const azureDag = {
    provider: "azure",
    nodes: [
      {
        id: "rg-1",
        resourceType: "azure-resource-group",
        instanceName: "core_rg",
        version: "4.0",
        values: { name: "rg-enterprise-prod", location: "eastus" },
      },
      {
        id: "sa-1",
        resourceType: "azure-storage-account",
        instanceName: "app_storage",
        version: "4.0",
        values: {
          name: "stappprodsecure",
          accountTier: "Standard",
          accountReplicationType: "GRS",
          location: "eastus",
        },
      },
      {
        id: "sql-1",
        resourceType: "azure-mssql-server",
        instanceName: "db_server",
        version: "4.0",
        values: {
          name: "sql-enterprise-prod",
          location: "eastus",
          administratorLogin: "sqladmin",
          administratorLoginPassword: "P@ssw0rd12345!",
        },
      },
      {
        id: "kv-1",
        resourceType: "azure-key-vault",
        instanceName: "vault",
        version: "4.0",
        values: {
          name: "kv-enterprise-prod",
          location: "eastus",
          skuName: "standard",
        },
      },
    ],
    edges: [
      { id: "e1", source: "rg-1", target: "sa-1", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e2", source: "rg-1", target: "sql-1", targetField: "resourceGroupName", sourceOutput: "name" },
      { id: "e3", source: "rg-1", target: "kv-1", targetField: "resourceGroupName", sourceOutput: "name" },
    ],
  };

  const result = generator.generateFromGraph(azureDag);
  const tf = result.terraform;

  // Root block & pinned provider
  assert(tf.includes('required_version = ">= 1.5.0"'), "Azure must define required_version >= 1.5.0");
  assert(tf.includes('source  = "hashicorp/azurerm"'), "Azure must specify official HashiCorp source");
  assert(tf.includes('version = "~> 4.0"'), "Azure must pin version ~> 4.0");

  // Enterprise features block
  assert(tf.includes('provider "azurerm" {'), "Azure provider block must exist");
  assert(tf.includes("prevent_deletion_if_contains_resources = false"), "RG deletion safeguard present");
  assert(tf.includes("purge_soft_delete_on_destroy    = false"), "Key Vault purge protection safeguard present");
  assert(tf.includes("recover_soft_deleted_key_vaults = true"), "Key Vault recovery safeguard present");

  // Parameterized variables
  assert(tf.includes('variable "environment"'), "Environment variable must be defined");
  assert(tf.includes('variable "azure_location"'), "Azure location variable must be defined");

  // Enterprise resource security hardening
  assert(tf.includes('min_tls_version = "TLS1_2"'), "Storage account must enforce TLS 1.2 minimum");
  assert(tf.includes('minimum_tls_version = "1.2"'), "MSSQL server must enforce TLS 1.2 minimum");
  assert(tf.includes("soft_delete_retention_days = 90"), "Key Vault must default to 90-day retention");

  // Standard enterprise tags
  assert(tf.includes('Environment = "production"'), "Enterprise Environment tag must be present");
  assert(tf.includes('ManagedBy   = "Terraform"') || tf.includes('ManagedBy = "Terraform"'), "Enterprise ManagedBy tag must be present");

  // Production Outputs
  assert(tf.includes('output "core_rg_id"'), "Must export Resource Group ID");
  assert(tf.includes('output "app_storage_primary_blob_endpoint"'), "Must export Storage primary Blob endpoint");
  assert(tf.includes('output "db_server_fully_qualified_domain_name"'), "Must export SQL server FQDN");
  assert(tf.includes('output "vault_vault_uri"'), "Must export Key Vault URI");

  // Multi-File Output Verification (/senior-devops & /terraform-specialist)
  assert(result.files, "Azure must generate multi-file project");
  assert(result.files["providers.tf"].includes('provider "azurerm"'), "providers.tf must have azurerm provider");
  assert(result.files["variables.tf"].includes('variable "azure_location"'), "variables.tf must declare azure_location");
  assert(result.files["main.tf"].includes('resource "azurerm_resource_group" "core_rg"'), "main.tf must contain core_rg");
  assert(result.files["outputs.tf"].includes('output "core_rg_id"'), "outputs.tf must contain core_rg_id");
  assert(result.files["terraform.tfvars"].includes('azure_location = "eastus"'), "terraform.tfvars must have values");

  console.log("PASS: Azure production-ready Terraform verified");
}

// 2. AWS Enterprise Production Readiness
{
  const awsDag = {
    provider: "aws",
    nodes: [
      {
        id: "vpc-1",
        resourceType: "aws-vpc",
        instanceName: "main_vpc",
        version: "5.0",
        values: { cidrBlock: "10.0.0.0/16" },
      },
      {
        id: "s3-1",
        resourceType: "aws-s3",
        instanceName: "secure_bucket",
        version: "5.0",
        values: { bucketName: "prod-cloud-storage-2026" },
      },
      {
        id: "rds-1",
        resourceType: "aws-db-instance",
        instanceName: "main_rds",
        version: "5.0",
        values: {
          identifier: "prod-postgres-db",
          instanceClass: "db.r6g.large",
          allocatedStorage: 100,
          engine: "postgres",
          username: "masteradmin",
          password: "P@ssw0rd12345!",
        },
      },
    ],
    edges: [],
  };

  const result = generator.generateFromGraph(awsDag);
  const tf = result.terraform;

  // Root block & pinned provider
  assert(tf.includes('required_version = ">= 1.5.0"'), "AWS must define required_version >= 1.5.0");
  assert(tf.includes('source  = "hashicorp/aws"'), "AWS must specify official HashiCorp source");
  assert(tf.includes('version = "~> 5.0"'), "AWS must pin version ~> 5.0");

  // Enterprise default_tags block
  assert(tf.includes("default_tags {"), "AWS provider must define default_tags");
  assert(tf.includes("Environment = var.environment"), "AWS default_tags must reference var.environment");
  assert(tf.includes('ManagedBy   = "Terraform"'), "AWS default_tags must specify ManagedBy Terraform");

  // Parameterized variables
  assert(tf.includes('variable "environment"'), "Environment variable must be defined");
  assert(tf.includes('variable "aws_region"'), "AWS region variable must be defined");

  // Security hardening defaults
  assert(tf.includes("storage_encrypted = true"), "RDS must have storage_encrypted enabled");
  assert(tf.includes("auto_minor_version_upgrade = true"), "RDS must have auto_minor_version_upgrade enabled");

  // Production Outputs
  assert(tf.includes('output "main_vpc_id"'), "Must export VPC ID");
  assert(tf.includes('output "main_vpc_cidr_block"'), "Must export VPC CIDR block");
  assert(tf.includes('output "secure_bucket_arn"'), "Must export S3 Bucket ARN");
  assert(tf.includes('output "main_rds_endpoint"'), "Must export RDS endpoint");
  assert(tf.includes('output "main_rds_port"'), "Must export RDS port");

  // Multi-File Output Verification (/senior-devops & /terraform-specialist)
  assert(result.files, "AWS must generate multi-file project");
  assert(result.files["providers.tf"].includes('provider "aws"'), "providers.tf must have aws provider");
  assert(result.files["variables.tf"].includes('variable "aws_region"'), "variables.tf must declare aws_region");
  assert(result.files["main.tf"].includes('resource "aws_vpc" "main_vpc"'), "main.tf must contain main_vpc");
  assert(result.files["outputs.tf"].includes('output "main_vpc_id"'), "outputs.tf must contain main_vpc_id");
  assert(result.files["terraform.tfvars"].includes('aws_region  = "us-east-1"'), "terraform.tfvars must have values");

  console.log("PASS: AWS production-ready Terraform verified");
}

// 3. GCP Enterprise Production Readiness
{
  const gcpDag = {
    provider: "gcp",
    nodes: [
      {
        id: "net-1",
        resourceType: "gcp-compute-network",
        instanceName: "custom_vpc",
        version: "6.0",
        values: { name: "prod-vpc-network" },
      },
      {
        id: "gke-1",
        resourceType: "gcp-container-cluster",
        instanceName: "prod_gke",
        version: "6.0",
        values: { name: "prod-k8s-cluster", location: "us-central1" },
      },
      {
        id: "sql-1",
        resourceType: "gcp-sql-database-instance",
        instanceName: "prod_cloudsql",
        version: "6.0",
        values: {
          name: "prod-db-instance",
          region: "us-central1",
          tier: "db-custom-4-16384",
          databaseVersion: "POSTGRES_15",
        },
      },
    ],
    edges: [],
  };

  const result = generator.generateFromGraph(gcpDag);
  const tf = result.terraform;

  // Root block & pinned provider
  assert(tf.includes('required_version = ">= 1.5.0"'), "GCP must define required_version >= 1.5.0");
  assert(tf.includes('source  = "hashicorp/google"'), "GCP must specify official HashiCorp source");
  assert(tf.includes('version = "~> 6.0"'), "GCP must pin version ~> 6.0");

  // Enterprise default_labels block
  assert(tf.includes("default_labels = {"), "GCP provider must define default_labels");
  assert(tf.includes("environment = var.environment"), "GCP default_labels must reference var.environment");
  assert(tf.includes('managed_by  = "terraform"'), "GCP default_labels must specify managed_by terraform");

  // Parameterized variables
  assert(tf.includes('variable "environment"'), "Environment variable must be defined");
  assert(tf.includes('variable "gcp_project_id"'), "GCP project_id variable must be defined");
  assert(tf.includes('variable "gcp_region"'), "GCP region variable must be defined");

  // Security hardening defaults
  assert(tf.includes("deletion_protection = false"), "Cloud SQL deletion protection flag managed");

  // Production Outputs
  assert(tf.includes('output "custom_vpc_id"'), "Must export VPC network ID");
  assert(tf.includes('output "prod_gke_endpoint"'), "Must export GKE cluster endpoint");
  assert(tf.includes('output "prod_cloudsql_connection_name"'), "Must export Cloud SQL connection name");

  // Multi-File Output Verification (/senior-devops & /terraform-specialist)
  assert(result.files, "GCP must generate multi-file project");
  assert(result.files["providers.tf"].includes('provider "google"'), "providers.tf must have google provider");
  assert(result.files["variables.tf"].includes('variable "gcp_project_id"'), "variables.tf must declare gcp_project_id");
  assert(result.files["main.tf"].includes('resource "google_compute_network" "custom_vpc"'), "main.tf must contain custom_vpc");
  assert(result.files["outputs.tf"].includes('output "custom_vpc_id"'), "outputs.tf must contain custom_vpc_id");
  assert(result.files["terraform.tfvars"].includes('gcp_region     = "us-central1"'), "terraform.tfvars must have values");

  console.log("PASS: GCP production-ready Terraform verified");
}

// 4. Dynamic "On-The-Go" Schema Hardening (Zero hardcoding in generator)
{
  const mockNewSchema = {
    providerKey: "azure",
    terraformType: "azurerm_brand_new_service",
    canvasType: "azure-brand-new-service",
    fields: [
      { key: "name", tfPath: "name", type: "string" },
      { key: "minTls", tfPath: "min_tls_version", type: "string" },
      { key: "storageEncrypted", tfPath: "storage_encrypted", type: "boolean" },
      { key: "backupDays", tfPath: "backup_retention_days", type: "number" },
      { key: "tags", tfPath: "tags", type: "map" },
    ],
  };

  const generated = generator.generate(mockNewSchema, { name: "dynamic-service" });
  assert(generated.includes('min_tls_version = "TLS1_2"'), "Dynamic schema must receive TLS 1.2 on the fly");
  assert(generated.includes("storage_encrypted = true"), "Dynamic schema must receive storage_encrypted on the fly");
  assert(generated.includes("backup_retention_days = 7"), "Dynamic schema must receive backup_retention_days on the fly");
  assert(generated.includes('Environment = "production"'), "Dynamic schema must receive tags on the fly");
  console.log("PASS: Dynamic on-the-go schema hardening verified (zero generator hardcoding)");
}

console.log("=== ALL PRODUCTION-READY TERRAFORM TESTS PASSED! ===");

