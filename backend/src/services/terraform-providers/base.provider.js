import { sanitizeTerraformName } from "../../utils/naming.util.js";

/**
 * Base Terraform Provider
 * Provides dynamic "on-the-go" schema inspection, default hardening,
 * output derivation, and multi-file HCL layout generation.
 */
export class BaseTerraformProvider {
  constructor(options = {}) {
    this.key = options.key || "custom";
    this.name = options.name || "Custom Provider";
    this.source = options.source || "";
    this.defaultVersion = options.defaultVersion || "1.0";
    this.resourceOutputMappings = options.resourceOutputMappings || {};
  }

  /**
   * Return required provider version constraint.
   */
  getRequiredProvider(version) {
    const cleanVer = String(version || this.defaultVersion).trim().replace(/^v/i, "");
    return {
      source: this.source,
      version: `~> ${cleanVer}`,
    };
  }

  /**
   * Return provider block HCL string. Override in cloud subclasses.
   */
  getProviderBlock(version) {
    return `provider "${this.key}" {}\n`;
  }

  /**
   * Return required variables for this provider. Override in cloud subclasses.
   */
  getVariables(nodes = []) {
    return [
      {
        name: "environment",
        type: "string",
        default: "production",
        description: "Target deployment environment",
      },
    ];
  }

  /**
   * Return default tfvars values.
   */
  getTfVars(nodes = []) {
    return `environment = "production"\n`;
  }

  /**
   * Dynamic on-the-go hardening: Inspects schema fields dynamically
   * without hardcoding specific resource names into the main generator.
   */
  applyDynamicHardening(schema, tfConfig = {}) {
    if (!schema || !schema.fields) return tfConfig;

    const fields = schema.fields;

    // 1. Tags on the go
    const hasTags = fields.some((f) => f.tfPath === "tags");
    if (hasTags) {
      if (!tfConfig.tags) {
        tfConfig.tags = {
          Environment: "production",
          ManagedBy: "Terraform",
        };
      } else if (typeof tfConfig.tags === "object" && !Array.isArray(tfConfig.tags)) {
        tfConfig.tags = {
          Environment: "production",
          ManagedBy: "Terraform",
          ...tfConfig.tags,
        };
      }
    }

    // 2. Labels on the go
    const hasLabels = fields.some((f) => f.tfPath === "labels");
    if (hasLabels) {
      if (!tfConfig.labels) {
        tfConfig.labels = {
          environment: "production",
          managed_by: "terraform",
        };
      } else if (typeof tfConfig.labels === "object" && !Array.isArray(tfConfig.labels)) {
        tfConfig.labels = {
          environment: "production",
          managed_by: "terraform",
          ...tfConfig.labels,
        };
      }
    }

    // 3. Inspect field paths and auto-harden security properties on the go
    for (const field of fields) {
      const p = field.tfPath || "";

      // TLS enforcement
      if (p === "min_tls_version" && !tfConfig.min_tls_version) {
        tfConfig.min_tls_version = "TLS1_2";
      } else if (p === "minimum_tls_version" && !tfConfig.minimum_tls_version) {
        tfConfig.minimum_tls_version = "1.2";
      }

      // Storage encryption
      if (p === "storage_encrypted" && tfConfig.storage_encrypted === undefined) {
        tfConfig.storage_encrypted = true;
      }
      if (p === "sqs_managed_sse_enabled" && tfConfig.sqs_managed_sse_enabled === undefined) {
        tfConfig.sqs_managed_sse_enabled = true;
      }

      // Auto minor version upgrade
      if (p === "auto_minor_version_upgrade" && tfConfig.auto_minor_version_upgrade === undefined) {
        tfConfig.auto_minor_version_upgrade = true;
      }

      // Bucket level access
      if (p === "uniform_bucket_level_access" && tfConfig.uniform_bucket_level_access === undefined) {
        tfConfig.uniform_bucket_level_access = true;
      }

      // Retention days defaults
      if (p === "backup_retention_days" && !tfConfig.backup_retention_days) {
        tfConfig.backup_retention_days = 7;
      }
      if (p === "soft_delete_retention_days" && tfConfig.soft_delete_retention_days === undefined) {
        tfConfig.soft_delete_retention_days = 90;
      }

      // Protection & deletion flags
      if (p === "purge_protection_enabled" && tfConfig.purge_protection_enabled === undefined) {
        tfConfig.purge_protection_enabled = false;
      }
      if (p === "deletion_protection" && tfConfig.deletion_protection === undefined) {
        tfConfig.deletion_protection = false;
      }
    }

    return tfConfig;
  }

  /**
   * Hook for provider-specific hardening if needed. Override in subclasses.
   */
  applyCustomHardening(schema, tfConfig) {
    return tfConfig;
  }

  /**
   * Combined hardening entry point.
   */
  applyHardening(schema, tfConfig) {
    let config = this.applyDynamicHardening(schema, tfConfig);
    return this.applyCustomHardening(schema, config);
  }

  /**
   * Dynamically build outputs for a node "on the go":
   * Inspects resource type mappings and schema fields dynamically.
   */
  getOutputsForNode(node, schema) {
    const { terraformType, instanceName } = node;
    if (!terraformType || !instanceName) return [];

    // 1. Check if provider has explicit output definitions
    if (this.resourceOutputMappings[terraformType]) {
      return this.resourceOutputMappings[terraformType];
    }

    // 2. Derive outputs on the go from schema fields
    const outputs = [{ attr: "id", desc: `The identifier of the ${instanceName} resource.` }];

    if (schema && Array.isArray(schema.fields)) {
      const interestingAttrs = [
        "name",
        "arn",
        "endpoint",
        "fqdn",
        "hostname",
        "public_ip",
        "private_ip",
        "cidr_block",
        "address_space",
      ];
      for (const attr of interestingAttrs) {
        if (schema.fields.some((f) => f.tfPath === attr)) {
          outputs.push({
            attr,
            desc: `The ${attr.replace(/_/g, " ")} of the ${instanceName} resource.`,
          });
        }
      }
    }

    return outputs;
  }

  /**
   * Generate `providers.tf` file content.
   */
  getProvidersTf(version) {
    const req = this.getRequiredProvider(version);
    const lines = [
      `terraform {`,
      `  required_version = ">= 1.5.0"`,
      `  required_providers {`,
      `    ${this.key} = {`,
      `      source  = "${req.source}"`,
      `      version = "${req.version}"`,
      `    }`,
      `  }`,
      `}`,
      ``,
      this.getProviderBlock(version).trimEnd(),
      ``,
    ];
    return lines.join("\n");
  }

  /**
   * Generate `variables.tf` file content.
   */
  getVariablesTf(nodes = []) {
    const vars = this.getVariables(nodes);
    const blocks = [];

    for (const v of vars) {
      blocks.push(
        [
          `variable "${v.name}" {`,
          `  description = "${v.description}"`,
          `  type        = ${v.type}`,
          `  default     = ${JSON.stringify(v.default)}`,
          `}`,
        ].join("\n")
      );
    }

    return blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");
  }

  /**
   * Generate `outputs.tf` file content.
   */
  getOutputsTf(outputNodes = [], schemasMap = {}) {
    const outputs = [];
    const emittedKeys = new Set();

    for (const node of outputNodes) {
      const { terraformType, instanceName } = node;
      if (!terraformType || !instanceName) continue;

      const schema = schemasMap[terraformType] || node.schema;
      const mappings = this.getOutputsForNode(node, schema);

      for (const { attr, desc } of mappings) {
        const baseKey = attr === "id" ? `${instanceName}_id` : `${instanceName}_${attr}`;
        const outputKey = sanitizeTerraformName(baseKey);

        if (emittedKeys.has(outputKey)) continue;
        emittedKeys.add(outputKey);

        outputs.push(
          [
            `output "${outputKey}" {`,
            `  description = "${desc.replace(/"/g, '\\"')}"`,
            `  value       = ${terraformType}.${instanceName}.${attr}`,
            `}`,
          ].join("\n")
        );
      }
    }

    return outputs.join("\n\n") + (outputs.length > 0 ? "\n" : "");
  }
}

