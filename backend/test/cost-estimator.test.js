import assert from "node:assert";
import { costEstimatorService } from "../src/services/cost-estimator.service.js";

console.log("=== Running Multi-Cloud Cost Estimator Tests ===");

// 1. AWS 3-Tier Stack Cost Estimation
{
  const awsNodes = [
    {
      id: "node_vpc",
      resourceType: "aws-vpc",
      instanceName: "production_vpc",
      values: { cidrBlock: "10.0.0.0/16" },
    },
    {
      id: "node_ec2",
      resourceType: "aws-ec2",
      instanceName: "web_server",
      values: { instanceType: "t3.medium" }, // $0.0416/hr
    },
    {
      id: "node_rds",
      resourceType: "aws-db-instance",
      instanceName: "app_database",
      values: { instanceClass: "db.t3.small", allocatedStorage: 50, multiAz: true },
    },
    {
      id: "node_nat",
      resourceType: "aws-nat-gateway",
      instanceName: "main_nat",
      values: {}, // $0.045/hr
    },
    {
      id: "node_s3",
      resourceType: "aws-s3",
      instanceName: "assets_bucket",
      values: {},
    },
  ];

  const report30Days = costEstimatorService.estimate({
    provider: "aws",
    nodes: awsNodes,
    days: 30,
  });

  assert.strictEqual(report30Days.days, 30);
  assert.strictEqual(report30Days.periodHours, 720);
  assert.strictEqual(report30Days.totalResources, 5);
  assert.strictEqual(report30Days.billableResourceCount, 4); // ec2, rds, nat, s3 (vpc is free)
  assert.ok(report30Days.totalHourlyRate > 0.15, "Hourly rate should account for t3.medium, multi-AZ db, and NAT");
  assert.ok(report30Days.totalPeriodCost > 100, "30-day period cost should exceed $100");
  assert.ok(report30Days.optimizationTips.length >= 2, "Should include NAT and compute optimization tips");

  // Verify 7-day recalculation scaling
  const report7Days = costEstimatorService.estimate({
    provider: "aws",
    nodes: awsNodes,
    days: 7,
  });
  assert.strictEqual(report7Days.days, 7);
  assert.strictEqual(report7Days.periodHours, 168);
  assert.strictEqual(report7Days.totalHourlyRate, report30Days.totalHourlyRate);
  assert.ok(report7Days.totalPeriodCost < report30Days.totalPeriodCost);
  assert.strictEqual(
    Math.round(report7Days.totalHourlyRate * 168 * 100) / 100,
    report7Days.totalPeriodCost
  );

  console.log("[PASS] AWS multi-resource cost estimation and duration scaling verified");
}

// 2. Azure Stack Cost Estimation
{
  const azureNodes = [
    {
      id: "az_vm",
      resourceType: "azure-linux-vm",
      instanceName: "backend_vm",
      values: { size: "Standard_D2s_v5" }, // $0.096/hr
    },
    {
      id: "az_aks",
      resourceType: "azure-kubernetes-cluster",
      instanceName: "prod_aks",
      values: {}, // $0.10/hr
    },
    {
      id: "az_sql",
      resourceType: "azure-mssql-database",
      instanceName: "tenant_db",
      values: { sku_name: "S1" }, // $0.0411/hr
    },
    {
      id: "az_pip",
      resourceType: "azure-public-ip",
      instanceName: "ingress_pip",
      values: {}, // $0.005/hr
    },
  ];

  const azureReport = costEstimatorService.estimate({
    provider: "azure",
    nodes: azureNodes,
    days: 15,
  });

  assert.strictEqual(azureReport.days, 15);
  assert.strictEqual(azureReport.periodHours, 360);
  assert.strictEqual(azureReport.totalResources, 4);
  assert.strictEqual(azureReport.billableResourceCount, 4);
  assert.ok(azureReport.totalHourlyRate > 0.23, "Azure hourly rate should cover D2s_v5, AKS, S1 SQL, PIP");

  console.log("[PASS] Azure VM, AKS, and SQL cost estimation verified");
}

// 3. GCP Stack Cost Estimation
{
  const gcpNodes = [
    {
      id: "gcp_inst",
      resourceType: "gcp-compute-instance",
      instanceName: "worker_1",
      values: { machineType: "e2-standard-2" }, // $0.067/hr
    },
    {
      id: "gcp_gke",
      resourceType: "gcp-container-cluster",
      instanceName: "analytics_gke",
      values: {}, // $0.10/hr
    },
    {
      id: "gcp_sql",
      resourceType: "gcp-sql-database-instance",
      instanceName: "main_sql",
      values: { tier: "db-g1-small" }, // $0.035/hr
    },
    {
      id: "gcp_lb",
      resourceType: "gcp-compute-global-forwarding-rule",
      instanceName: "http_proxy",
      values: {}, // $0.025/hr
    },
  ];

  const gcpReport = costEstimatorService.estimate({
    provider: "gcp",
    nodes: gcpNodes,
    days: 60,
  });

  assert.strictEqual(gcpReport.days, 60);
  assert.strictEqual(gcpReport.periodHours, 1440);
  assert.strictEqual(gcpReport.billableResourceCount, 4);
  assert.ok(gcpReport.totalPeriodCost > 250, "GCP 60-day period cost should exceed $250");

  console.log("[PASS] GCP Compute, GKE, Cloud SQL, and Forwarding Rule cost estimation verified");
}

// 4. Fallback HCL parsing from main.tf text
{
  const sampleHcl = `
resource "aws_instance" "web_app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"
  tags = {
    Name = "web_app"
  }
}

resource "aws_nat_gateway" "gw" {
  allocation_id = "eip-123456"
  subnet_id     = "subnet-123456"
}
`;

  const hclReport = costEstimatorService.estimate({
    provider: "aws",
    terraform: sampleHcl,
    days: 30,
  });

  assert.strictEqual(hclReport.totalResources, 2);
  assert.strictEqual(hclReport.billableResourceCount, 2);
  const ec2Item = hclReport.items.find((i) => i.resourceType === "aws_instance");
  assert.ok(ec2Item, "Should have extracted aws_instance block from HCL");
  assert.strictEqual(ec2Item.hourlyRate, 0.0832, "t3.large hourly rate should match catalog");

  console.log("[PASS] Raw main.tf HCL fallback parsing and cost extraction verified");
}

console.log("=== ALL COST ESTIMATOR TESTS PASSED! ===");
