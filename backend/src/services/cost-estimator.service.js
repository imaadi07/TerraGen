/**
 * Multi-Cloud Cost Estimation Engine for Auto Terraform Generator.
 * Calculates detailed hourly, monthly, and custom-duration cloud infrastructure costs
 * based on visual topology graph nodes and generated main.tf HCL.
 *
 * Covers AWS, Azure, and GCP resources with realistic pricing models,
 * configuration-aware rightsizing specs, and optimization recommendations.
 */

// Baseline monthly operational hours (365 days / 12 months * 24 hours = ~730 hours)
const MONTHLY_HOURS = 730;

// Standard unit hourly pricing catalogs (USD)
const AWS_PRICING = {
  // EC2 Compute instance types ($/hr)
  ec2_instances: {
    "t3.nano": 0.0052,
    "t3.micro": 0.0104,
    "t3.small": 0.0208,
    "t3.medium": 0.0416,
    "t3.large": 0.0832,
    "t3.xlarge": 0.1664,
    "t3.2xlarge": 0.3328,
    "t2.nano": 0.0058,
    "t2.micro": 0.0116,
    "t2.small": 0.023,
    "t2.medium": 0.0464,
    "m5.large": 0.096,
    "m5.xlarge": 0.192,
    "c5.large": 0.085,
    "c5.xlarge": 0.17,
    "r5.large": 0.126,
    "r5.xlarge": 0.252,
    _default: 0.0208, // default to t3.small
  },
  // RDS database instance classes ($/hr)
  rds_instances: {
    "db.t3.micro": 0.017,
    "db.t3.small": 0.034,
    "db.t3.medium": 0.068,
    "db.t3.large": 0.136,
    "db.t4g.micro": 0.015,
    "db.t4g.small": 0.029,
    "db.m5.large": 0.178,
    "db.r5.large": 0.24,
    _default: 0.034, // default to db.t3.small
  },
  // ElastiCache node types ($/hr)
  elasticache_nodes: {
    "cache.t3.micro": 0.017,
    "cache.t3.small": 0.034,
    "cache.t3.medium": 0.068,
    "cache.m5.large": 0.136,
    _default: 0.017,
  },
  // Fixed infrastructure hourly rates ($/hr)
  fixed: {
    nat_gateway: 0.045, // ~$32.85/mo
    load_balancer: 0.0225, // ~$16.43/mo
    eks_cluster: 0.10, // $73.00/mo control plane
    redshift_workgroup: 0.375, // base RPVU
  },
  // Monthly flat baseline storage estimates ($/mo)
  storage: {
    s3_standard_base: 0.23, // 10 GB baseline
    ebs_gp3_gb: 0.08,
    rds_storage_gb: 0.115,
  },
};

const AZURE_PRICING = {
  // Virtual Machine sizes ($/hr)
  vm_sizes: {
    Standard_B1s: 0.0104,
    Standard_B1ms: 0.0207,
    Standard_B2s: 0.0416,
    Standard_B2ms: 0.0832,
    Standard_D2s_v5: 0.096,
    Standard_D4s_v5: 0.192,
    Standard_D8s_v5: 0.384,
    Standard_F2s_v2: 0.085,
    Standard_E2s_v5: 0.126,
    _default: 0.0416, // Standard_B2s
  },
  // SQL Database SKUs ($/hr)
  sql_skus: {
    Basic: 0.0068, // ~$4.99/mo
    S0: 0.0205, // ~$15.00/mo
    S1: 0.0411, // ~$30.00/mo
    S2: 0.0822, // ~$60.00/mo
    GP_Gen5_2: 0.354,
    _default: 0.0205,
  },
  // Fixed infrastructure hourly rates ($/hr)
  fixed: {
    aks_uptime_sla: 0.10,
    nat_gateway: 0.045,
    load_balancer: 0.025,
    public_ip: 0.005,
    private_endpoint: 0.01,
    cosmos_base: 0.032, // 400 RU/s
    redis_basic: 0.022,
  },
  storage: {
    blob_standard_base: 0.18, // 10 GB baseline
  },
};

const GCP_PRICING = {
  // Compute Engine machine types ($/hr)
  machine_types: {
    "e2-micro": 0.0084,
    "e2-small": 0.0168,
    "e2-medium": 0.0335,
    "e2-standard-2": 0.067,
    "e2-standard-4": 0.134,
    "n1-standard-1": 0.0475,
    "n2-standard-2": 0.097,
    _default: 0.0335, // e2-medium
  },
  // Cloud SQL tiers ($/hr)
  sql_tiers: {
    "db-f1-micro": 0.015,
    "db-g1-small": 0.035,
    "db-custom-2-7680": 0.11,
    "db-custom-4-15360": 0.22,
    _default: 0.035,
  },
  // Fixed infrastructure hourly rates ($/hr)
  fixed: {
    gke_cluster: 0.10, // cluster management fee
    global_forwarding_rule: 0.025,
    forwarding_rule: 0.025,
    router_nat: 0.045,
    public_address: 0.004,
    redis_instance: 0.049,
  },
  storage: {
    bucket_standard_base: 0.20, // 10 GB baseline
  },
};

export class CostEstimatorService {
  /**
   * Main entry point to estimate cloud costs for infrastructure.
   *
   * @param {Object} params
   * @param {string} [params.provider="aws"] - "aws" | "azure" | "gcp"
   * @param {Array<Object>} [params.nodes=[]] - Graph nodes from visual canvas
   * @param {string} [params.terraform=""] - Optional generated main.tf HCL text
   * @param {number} [params.days=30] - Desired resource retention duration in days
   * @returns {Object} Cost estimation report
   */
  estimate({ provider = "aws", nodes = [], terraform = "", days = 30 }) {
    const validDays = Math.max(1, Math.min(3650, parseInt(days, 10) || 30));
    const periodHours = validDays * 24;

    // Normalize input resources: prefer explicit graph nodes, fallback to regex-extracted HCL blocks
    let resourcesToEstimate = [];

    if (Array.isArray(nodes) && nodes.length > 0) {
      resourcesToEstimate = nodes.map((n) => ({
        id: n.id,
        resourceType: n.resourceType,
        instanceName: n.instanceName || n.resourceType,
        displayName: n.schema?.name || n.resourceType,
        provider: provider.toLowerCase(),
        values: n.values || {},
      }));
    } else if (terraform && typeof terraform === "string") {
      resourcesToEstimate = this._parseTerraformHcl(terraform, provider);
    }

    // Estimate itemized costs per resource
    const items = resourcesToEstimate.map((res) => this._estimateResource(res, periodHours));

    // Aggregate statistics
    let totalHourlyRate = 0;
    let totalMonthlyRate = 0;
    let totalPeriodCost = 0;
    let billableCount = 0;

    const categoryBreakdown = {};

    for (const item of items) {
      totalHourlyRate += item.hourlyRate;
      totalMonthlyRate += item.monthlyRate;
      totalPeriodCost += item.periodCost;

      if (item.hourlyRate > 0 || item.monthlyRate > 0) {
        billableCount++;
      }

      const cat = item.category || "General";
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = {
          category: cat,
          hourlyRate: 0,
          monthlyRate: 0,
          periodCost: 0,
          resourceCount: 0,
        };
      }
      categoryBreakdown[cat].hourlyRate += item.hourlyRate;
      categoryBreakdown[cat].monthlyRate += item.monthlyRate;
      categoryBreakdown[cat].periodCost += item.periodCost;
      categoryBreakdown[cat].resourceCount++;
    }

    // Round aggregates to standard currency precision (2 decimals)
    totalHourlyRate = Math.round(totalHourlyRate * 10000) / 10000;
    totalMonthlyRate = Math.round(totalMonthlyRate * 100) / 100;
    totalPeriodCost = Math.round(totalPeriodCost * 100) / 100;

    for (const cat of Object.keys(categoryBreakdown)) {
      categoryBreakdown[cat].hourlyRate = Math.round(categoryBreakdown[cat].hourlyRate * 10000) / 10000;
      categoryBreakdown[cat].monthlyRate = Math.round(categoryBreakdown[cat].monthlyRate * 100) / 100;
      categoryBreakdown[cat].periodCost = Math.round(categoryBreakdown[cat].periodCost * 100) / 100;
    }

    // Generate proactive architectural and cost optimization insights
    const optimizationTips = this._generateOptimizationTips(items, provider, validDays, totalMonthlyRate);

    return {
      provider: provider.toLowerCase(),
      days: validDays,
      periodHours,
      totalHourlyRate,
      totalMonthlyRate,
      totalPeriodCost,
      totalResources: items.length,
      billableResourceCount: billableCount,
      categoryBreakdown: Object.values(categoryBreakdown),
      items,
      optimizationTips,
    };
  }

  /**
   * Internal estimator for a single cloud resource.
   */
  _estimateResource(res, periodHours) {
    const type = (res.resourceType || "").toLowerCase();
    const values = res.values || {};
    const provider = res.provider || "aws";

    let category = "Management";
    let specs = "Standard";
    let hourlyRate = 0;
    let monthlyRate = 0;
    let isBillable = false;

    // --- AWS RESOURCE ESTIMATION ---
    if (provider === "aws" || type.startsWith("aws_") || type.startsWith("aws-")) {
      if (type.includes("ec2") || type.includes("instance") && !type.includes("db")) {
        category = "Compute";
        const it = values.instanceType || values.instance_type || "t3.small";
        hourlyRate = AWS_PRICING.ec2_instances[it] || AWS_PRICING.ec2_instances._default;
        specs = `${it} (2 vCPU, Burstable)`;
        isBillable = true;
      } else if (type.includes("autoscaling-group") || type.includes("autoscaling_group")) {
        category = "Compute";
        const desired = parseInt(values.desiredCapacity || values.desired_capacity || 2, 10);
        hourlyRate = AWS_PRICING.ec2_instances._default * desired;
        specs = `ASG: ${desired}x t3.small instances`;
        isBillable = true;
      } else if (type.includes("eks")) {
        category = "Compute";
        hourlyRate = AWS_PRICING.fixed.eks_cluster;
        specs = "EKS Managed Control Plane ($0.10/hr)";
        isBillable = true;
      } else if (type.includes("db-instance") || type.includes("db_instance") || type.includes("rds")) {
        category = "Database";
        const ic = values.instanceClass || values.instance_class || "db.t3.small";
        const multiAz = values.multiAz === true || values.multi_az === true;
        let baseRate = AWS_PRICING.rds_instances[ic] || AWS_PRICING.rds_instances._default;
        if (multiAz) baseRate *= 2;
        const storageGb = parseInt(values.allocatedStorage || values.allocated_storage || 20, 10);
        const storageMonthly = storageGb * AWS_PRICING.storage.rds_storage_gb;
        hourlyRate = baseRate + (storageMonthly / MONTHLY_HOURS);
        specs = `${ic}${multiAz ? " (Multi-AZ)" : ""} + ${storageGb} GB gp3`;
        isBillable = true;
      } else if (type.includes("elasticache")) {
        category = "Database";
        const nt = values.nodeType || values.node_type || "cache.t3.micro";
        hourlyRate = AWS_PRICING.elasticache_nodes[nt] || AWS_PRICING.elasticache_nodes._default;
        specs = `${nt} Redis/Memcached Node`;
        isBillable = true;
      } else if (type.includes("dynamodb")) {
        category = "Database";
        hourlyRate = 0.001; // Pay per request idle baseline
        specs = "Pay-Per-Request (On-Demand baseline)";
        isBillable = false;
      } else if (type.includes("nat-gateway") || type.includes("nat_gateway")) {
        category = "Networking";
        hourlyRate = AWS_PRICING.fixed.nat_gateway;
        specs = "NAT Gateway Provisioned ($0.045/hr)";
        isBillable = true;
      } else if (type.includes("lb") || type.includes("load_balancer")) {
        category = "Networking";
        hourlyRate = AWS_PRICING.fixed.load_balancer;
        specs = "Application Load Balancer ($0.0225/hr base)";
        isBillable = true;
      } else if (type.includes("eip")) {
        category = "Networking";
        hourlyRate = 0.005; // Elastic IP hourly fee when unattached/standby
        specs = "Static Elastic IP Allocation";
        isBillable = true;
      } else if (type.includes("s3")) {
        category = "Storage";
        monthlyRate = AWS_PRICING.storage.s3_standard_base;
        hourlyRate = monthlyRate / MONTHLY_HOURS;
        specs = "S3 Standard (~10 GB baseline)";
        isBillable = true;
      } else if (type.includes("lambda")) {
        category = "Serverless";
        specs = "Serverless Function (Free tier: 1M req/mo)";
        hourlyRate = 0;
        isBillable = false;
      } else if (type.includes("vpc") || type.includes("subnet") || type.includes("route-table") || type.includes("security-group")) {
        category = "Networking";
        specs = "Included with AWS Cloud Networking";
        hourlyRate = 0;
        isBillable = false;
      } else if (type.includes("iam") || type.includes("secretsmanager") || type.includes("kms")) {
        category = "Security";
        specs = "Standard IAM / Security Configuration";
        hourlyRate = 0;
        isBillable = false;
      }
    }

    // --- AZURE RESOURCE ESTIMATION ---
    else if (provider === "azure" || type.startsWith("azurerm_") || type.startsWith("azure-")) {
      if (type.includes("virtual-machine") || type.includes("linux-vm") || type.includes("windows-vm")) {
        category = "Compute";
        const size = values.size || values.vm_size || "Standard_B2s";
        hourlyRate = AZURE_PRICING.vm_sizes[size] || AZURE_PRICING.vm_sizes._default;
        if (type.includes("windows")) {
          hourlyRate += 0.04; // Windows guest OS licensing
        }
        specs = `${size} (Azure General Compute)`;
        isBillable = true;
      } else if (type.includes("kubernetes-cluster") || type.includes("aks")) {
        category = "Compute";
        hourlyRate = AZURE_PRICING.fixed.aks_uptime_sla;
        specs = "Azure Kubernetes Service (Standard SLA)";
        isBillable = true;
      } else if (type.includes("mssql-database") || type.includes("sql-database")) {
        category = "Database";
        const sku = values.sku_name || values.skuName || "S0";
        hourlyRate = AZURE_PRICING.sql_skus[sku] || AZURE_PRICING.sql_skus._default;
        specs = `Azure SQL DTU / vCore SKU: ${sku}`;
        isBillable = true;
      } else if (type.includes("cosmosdb")) {
        category = "Database";
        hourlyRate = AZURE_PRICING.fixed.cosmos_base;
        specs = "Cosmos DB NoSQL (400 RU/s provisioned)";
        isBillable = true;
      } else if (type.includes("redis")) {
        category = "Database";
        hourlyRate = AZURE_PRICING.fixed.redis_basic;
        specs = "Azure Cache for Redis (Basic C0)";
        isBillable = true;
      } else if (type.includes("nat-gateway")) {
        category = "Networking";
        hourlyRate = AZURE_PRICING.fixed.nat_gateway;
        specs = "Azure NAT Gateway ($0.045/hr)";
        isBillable = true;
      } else if (type.includes("lb") || type.includes("load-balancer")) {
        category = "Networking";
        hourlyRate = AZURE_PRICING.fixed.load_balancer;
        specs = "Azure Load Balancer (Standard)";
        isBillable = true;
      } else if (type.includes("public-ip")) {
        category = "Networking";
        hourlyRate = AZURE_PRICING.fixed.public_ip;
        specs = "Azure Public Static IP (Standard)";
        isBillable = true;
      } else if (type.includes("storage-account")) {
        category = "Storage";
        monthlyRate = AZURE_PRICING.storage.blob_standard_base;
        hourlyRate = monthlyRate / MONTHLY_HOURS;
        specs = "Azure Blob Storage (Standard LRS 10GB)";
        isBillable = true;
      } else if (type.includes("function-app") || type.includes("web-app")) {
        category = "Serverless";
        specs = "Azure Functions / App Service Consumption";
        hourlyRate = 0;
        isBillable = false;
      } else if (type.includes("resource-group") || type.includes("virtual-network") || type.includes("subnet") || type.includes("security-group")) {
        category = "Networking";
        specs = "Included Azure Virtual Network Infrastructure";
        hourlyRate = 0;
        isBillable = false;
      } else if (type.includes("key-vault")) {
        category = "Security";
        specs = "Azure Key Vault Standard (Free operations allowance)";
        hourlyRate = 0;
        isBillable = false;
      }
    }

    // --- GCP RESOURCE ESTIMATION ---
    else if (provider === "gcp" || type.startsWith("google_") || type.startsWith("gcp-")) {
      if (type.includes("compute-instance") || type.includes("compute_instance")) {
        category = "Compute";
        const mt = values.machineType || values.machine_type || "e2-medium";
        hourlyRate = GCP_PRICING.machine_types[mt] || GCP_PRICING.machine_types._default;
        specs = `${mt} (GCP Compute Engine)`;
        isBillable = true;
      } else if (type.includes("container-cluster") || type.includes("gke")) {
        category = "Compute";
        hourlyRate = GCP_PRICING.fixed.gke_cluster;
        specs = "GKE Standard Cluster Management Fee ($0.10/hr)";
        isBillable = true;
      } else if (type.includes("sql-database-instance") || type.includes("cloud-sql")) {
        category = "Database";
        const tier = values.tier || "db-f1-micro";
        hourlyRate = GCP_PRICING.sql_tiers[tier] || GCP_PRICING.sql_tiers._default;
        specs = `Cloud SQL Instance Tier: ${tier}`;
        isBillable = true;
      } else if (type.includes("redis-instance")) {
        category = "Database";
        hourlyRate = GCP_PRICING.fixed.redis_instance;
        specs = "Memorystore for Redis (Basic 1GB)";
        isBillable = true;
      } else if (type.includes("global-forwarding-rule") || type.includes("forwarding-rule")) {
        category = "Networking";
        hourlyRate = GCP_PRICING.fixed.global_forwarding_rule;
        specs = "Global HTTP(S) Load Balancing Forwarding Rule";
        isBillable = true;
      } else if (type.includes("router-nat")) {
        category = "Networking";
        hourlyRate = GCP_PRICING.fixed.router_nat;
        specs = "Cloud NAT Gateway ($0.045/hr)";
        isBillable = true;
      } else if (type.includes("address") || type.includes("global-address")) {
        category = "Networking";
        hourlyRate = GCP_PRICING.fixed.public_address;
        specs = "Static External IP Address";
        isBillable = true;
      } else if (type.includes("storage-bucket")) {
        category = "Storage";
        monthlyRate = GCP_PRICING.storage.bucket_standard_base;
        hourlyRate = monthlyRate / MONTHLY_HOURS;
        specs = "Standard Cloud Storage (~10 GB baseline)";
        isBillable = true;
      } else if (type.includes("cloud-run") || type.includes("cloudfunctions")) {
        category = "Serverless";
        specs = "Cloud Run / Functions (Scale-to-zero)";
        hourlyRate = 0;
        isBillable = false;
      } else if (type.includes("network") || type.includes("subnetwork") || type.includes("firewall") || type.includes("router")) {
        category = "Networking";
        specs = "Google Cloud VPC Networking (Included)";
        hourlyRate = 0;
        isBillable = false;
      } else if (type.includes("service-account") || type.includes("kms") || type.includes("secret-manager")) {
        category = "Security";
        specs = "Cloud IAM & Secret Security";
        hourlyRate = 0;
        isBillable = false;
      }
    }

    // Default calculations
    if (monthlyRate === 0 && hourlyRate > 0) {
      monthlyRate = hourlyRate * MONTHLY_HOURS;
    }

    const periodCost = hourlyRate * periodHours;

    return {
      id: res.id || `res_${Math.random().toString(36).substring(2, 7)}`,
      instanceName: res.instanceName || type,
      resourceType: type,
      displayName: res.displayName || type,
      provider,
      category,
      specs,
      hourlyRate: Math.round(hourlyRate * 10000) / 10000,
      monthlyRate: Math.round(monthlyRate * 100) / 100,
      periodCost: Math.round(periodCost * 100) / 100,
      isBillable,
    };
  }

  /**
   * Fallback parser to extract resources from raw main.tf HCL text.
   */
  _parseTerraformHcl(terraform, provider) {
    const list = [];
    // Matches: resource "type" "name" { body }
    const regex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*)\}/gs;
    let match;

    while ((match = regex.exec(terraform)) !== null) {
      const resourceType = match[1];
      const instanceName = match[2];
      const body = match[3];

      // Extract basic sizing attributes from body
      const values = {};
      const itMatch = body.match(/(?:instance_type|machine_type|vm_size|instance_class|sku_name|tier)\s*=\s*"([^"]+)"/);
      if (itMatch) {
        values.instanceType = itMatch[1];
        values.instanceClass = itMatch[1];
        values.machineType = itMatch[1];
        values.size = itMatch[1];
        values.tier = itMatch[1];
        values.sku_name = itMatch[1];
      }

      list.push({
        id: `hcl_${instanceName}`,
        resourceType,
        instanceName,
        displayName: resourceType,
        provider: provider.toLowerCase(),
        values,
      });
    }

    return list;
  }

  /**
   * Proactively generates architecture-level cost optimization recommendations.
   */
  _generateOptimizationTips(items, provider, days, totalMonthlyRate) {
    const tips = [];

    const hasNat = items.some((i) => i.resourceType.includes("nat"));
    const hasCompute = items.some((i) => i.category === "Compute" && i.isBillable);
    const hasDatabase = items.some((i) => i.category === "Database" && i.isBillable);
    const hasStorage = items.some((i) => i.category === "Storage");

    if (hasNat) {
      tips.push({
        title: "NAT Gateway Architecture Optimization",
        impact: "High",
        estimatedSavings: "$32.85/mo per gateway",
        description:
          "NAT Gateways incur a continuous hourly charge of $0.045/hr (~$32.85/month) plus data processing fees even when idle. For high-volume AWS S3 or DynamoDB traffic, deploy VPC Gateway Endpoints to route traffic directly over the AWS private network at zero cost.",
      });
    }

    if (hasCompute) {
      tips.push({
        title: "Commitment-Based Savings (Savings Plans & Reserved Instances)",
        impact: "High",
        estimatedSavings: "Up to 72% savings",
        description:
          "If this workload runs continuously for more than 30 days, switching from On-Demand pricing to a 1-year or 3-year Compute Savings Plan or Reserved Instance commitment reduces instance costs by 30% to 72%.",
      });

      tips.push({
        title: "Non-Production Automated Scheduling",
        impact: "Medium",
        estimatedSavings: "~70% instance runtime reduction",
        description:
          "For development or staging environments, schedule automated stop and start actions (e.g. running 10 hours/day, Monday through Friday). This cuts billable instance runtime from 730 hours to ~220 hours per month.",
      });
    }

    if (hasDatabase) {
      tips.push({
        title: "Database Right-Sizing & Single-AZ for Dev",
        impact: "Medium",
        estimatedSavings: "Up to 50% database savings",
        description:
          "Multi-AZ failover doubles managed database instance costs. Ensure development and test environments use Single-AZ instances and verify storage auto-scaling thresholds to prevent over-allocation.",
      });
    }

    if (hasStorage) {
      tips.push({
        title: "Automated Object Storage Lifecycle Policies",
        impact: "Low",
        estimatedSavings: "Up to 60-80% storage cost reduction",
        description:
          "Configure lifecycle rules to transition infrequent objects to lower storage tiers (e.g. S3 Glacier Instant Retrieval, Azure Blob Cool/Archive, Google Cloud Nearline) after 30 to 90 days.",
      });
    }

    if (tips.length === 0) {
      tips.push({
        title: "Zero-Cost Infrastructure Baseline",
        impact: "Informational",
        estimatedSavings: "$0.00 waste",
        description:
          "All configured resources (VPC networks, subnets, route tables, security groups, IAM roles) are included free of charge in your cloud provider's base tier.",
      });
    }

    return tips;
  }
}

export const costEstimatorService = new CostEstimatorService();

