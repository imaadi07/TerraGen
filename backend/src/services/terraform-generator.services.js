import fs from "fs";
import path from "path";

import {
  inferFieldType,
  coerceValue,
  validateRequiredFields,
  validateConstraints,
} from "./validation.service.js";
import { serializeToHcl } from "./serializer.service.js";
import { sanitizeTerraformName } from "../utils/naming.util.js";
import { GraphResolverService } from "./graph-resolver.service.js";
import { getTerraformProvider } from "./terraform-providers/index.js";

export class TerraformGeneratorService {
  _matchesCondition(condition, userValues) {
    if (!condition?.field) return true;
    if (condition.operator) {
      if (condition.operator === "equals") {
        return userValues?.[condition.field] === condition.value;
      }
      if (condition.operator === "not_equals") {
        return userValues?.[condition.field] !== condition.value;
      }
    }
    return userValues?.[condition.field] === condition.equals;
  }

  _shouldIncludeField(field, userValues) {
    if (field.omitWhen && this._matchesCondition(field.omitWhen, userValues)) {
      return false;
    }
    if (field.visibleWhen && !this._matchesCondition(field.visibleWhen, userValues)) {
      return false;
    }
    return true;
  }

  /**
   * Build the intermediate config object for a resource by combining:
   *   - User-supplied values (coerced to schema types)
   *   - Field defaults (when user value is absent)
   *   - Injected references (from dependency resolution)
   *   - Dynamic on-the-go production hardening and provider-specific rules
   */
  _buildConfig(schema, userValues = {}, refMap = {}) {
    const tfConfig = {};

    for (const field of schema.fields || []) {
      if (field.uiOnly || !field.tfPath) continue;
      if (!this._shouldIncludeField(field, userValues)) continue;

      const refVal = refMap[field.key];
      if (refVal !== undefined) {
        const parts = field.tfPath.split(".");
        if (Array.isArray(refVal)) {
          this._setNested(
            tfConfig,
            parts,
            refVal.map((r) => ({ __tfRef: r }))
          );
        } else {
          this._setNested(tfConfig, parts, { __tfRef: refVal });
        }
        continue;
      }

      const type = inferFieldType(field);
      const raw = userValues[field.key];
      const rawValue =
        raw === undefined || raw === null || raw === ""
          ? field.default
          : raw;
      if (rawValue === undefined) continue;

      const coerced = coerceValue(rawValue, type);
      if (coerced === undefined) continue;

      const parts = field.tfPath.split(".");
      this._setNested(tfConfig, parts, coerced);
    }

    // --- Dynamic On-The-Go Production Hardening & Standards ---
    // Delegates to the modular provider adapter without hardcoding specific resource names
    const providerAdapter = getTerraformProvider(schema.providerKey);
    return providerAdapter.applyHardening(schema, tfConfig);
  }

  /** Write a nested value into obj using a parts array path. */
  _setNested(obj, parts, value) {
    let cursor = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (cursor[parts[i]] === undefined) {
        cursor[parts[i]] = {};
      } else if (
        typeof cursor[parts[i]] !== "object" ||
        cursor[parts[i]] === null ||
        Array.isArray(cursor[parts[i]])
      ) {
        throw new Error(
          `Terraform schema conflict at "${parts.slice(0, i + 1).join(".")}". ` +
          `A field is trying to use both a scalar value and nested values.`
        );
      }
      cursor = cursor[parts[i]];
    }

    cursor[parts[parts.length - 1]] = value;
  }

  /** Emit a data source block for an "existing" dependency. */
  _dataBlock(terraformType, resourceName, existingId) {
    const idLine = existingId
      ? `  id = "${existingId}"`
      : `  # id = var.${resourceName}_id  # supply the existing resource ID`;
    return [
      `data "${terraformType}" "${resourceName}" {`,
      idLine,
      `}`,
    ].join("\n");
  }

  /**
   * Serialize a single resource block to HCL lines.
   * Handles __tfRef markers — emits them without quotes so Terraform
   * can resolve the reference at plan time.
   */
  _resourceBlock(terraformType, resourceName, tfConfig) {
    const lines = [];
    lines.push(`resource "${terraformType}" "${resourceName}" {`);
    lines.push(this._serializeWithRefs(tfConfig, 1).trimEnd());
    lines.push(`}`);
    return lines.join("\n");
  }

  /** Like serializeToHcl but handles { __tfRef } objects and arrays of refs as raw unquoted HCL. */
  _serializeWithRefs(obj, indent) {
    const pad = "  ".repeat(indent);
    let out = "";

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      // Raw Terraform reference — emit without quotes.
      if (value && typeof value === "object" && value.__tfRef) {
        out += `${pad}${key} = ${value.__tfRef}\n`;
        continue;
      }

      // Array of items (which might be raw Terraform references)
      if (Array.isArray(value)) {
        const hasRefs = value.some((v) => v && typeof v === "object" && v.__tfRef);
        if (hasRefs) {
          const items = value
            .map((v) => (v && typeof v === "object" && v.__tfRef ? v.__tfRef : JSON.stringify(v)))
            .join(", ");
          out += `${pad}${key} = [${items}]\n`;
          continue;
        }
      }

      // Nested object / block that might contain inner __tfRef values
      if (typeof value === "object" && !Array.isArray(value)) {
        const isMap =
          key === "tags" ||
          key === "labels" ||
          (Object.values(value).every(
            (v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean"
          ) &&
            !key.includes("config") &&
            !key.includes("block") &&
            !key.includes("params"));

        if (isMap && (key === "tags" || key === "labels")) {
          out += `${pad}${key} = {\n`;
          for (const [k, v] of Object.entries(value)) {
            out += `${pad}  ${k} = ${JSON.stringify(v)}\n`;
          }
          out += `${pad}}\n`;
        } else {
          // Block statement
          out += `${pad}${key} {\n`;
          out += this._serializeWithRefs(value, indent + 1);
          out += `${pad}}\n`;
        }
        continue;
      }

      // Delegate simple primitives to the standard serializer.
      out += serializeToHcl({ [key]: value }, indent)
        .split("\n")
        .join("\n");
    }

    return out;
  }

  /**
   * Build production-grade output blocks for all provisioned DAG resources.
   * Delegates to the modular provider strategy.
   */
  _buildOutputs(nodes = [], providerKey = "aws", schemasMap = {}) {
    const providerAdapter = getTerraformProvider(providerKey);
    const outputsTf = providerAdapter.getOutputsTf(nodes, schemasMap);
    if (!outputsTf || !outputsTf.trim()) return [];
    return outputsTf.trim().split("\n\n");
  }

  /**
   * Generate Terraform HCL for a single resource.
   */
  generate(schema, userValues) {
    validateRequiredFields(schema, userValues);
    validateConstraints(schema, userValues);

    const tfConfig = this._buildConfig(schema, userValues);
    const resourceName = sanitizeTerraformName(`${schema.canvasType}_resource`);

    return this._buildFile(
      [this._resourceBlock(schema.terraformType, resourceName, tfConfig)],
      schema.providerKey,
      schema.version,
      [{ terraformType: schema.terraformType, instanceName: resourceName, schema }]
    );
  }

  /**
   * Generate Terraform HCL for a primary resource plus its resolved dependencies.
   */
  generateMulti(primarySchema, primaryValues, resolvedDeps, refMap) {
    validateRequiredFields(primarySchema, primaryValues);
    validateConstraints(primarySchema, primaryValues);

    const blocks = [];
    const outputNodes = [];

    // 1. Emit dependency blocks first (leaves first due to resolver ordering).
    for (const dep of resolvedDeps) {
      if (dep.isDataSource) {
        blocks.push(this._dataBlock(dep.terraformType, dep.resourceName, dep.existingId));
      } else {
        const depConfig = this._buildConfig(dep.schema, dep.values, dep.nestedRefMap || {});
        blocks.push(this._resourceBlock(dep.terraformType, dep.resourceName, depConfig));
        outputNodes.push({ terraformType: dep.terraformType, instanceName: dep.resourceName, schema: dep.schema });
      }
    }

    // 2. Emit primary block with Terraform references injected.
    const primaryConfig = this._buildConfig(primarySchema, primaryValues, refMap);
    const primaryName = sanitizeTerraformName(`${primarySchema.canvasType}_resource`);
    blocks.push(
      this._resourceBlock(primarySchema.terraformType, primaryName, primaryConfig)
    );
    outputNodes.push({ terraformType: primarySchema.terraformType, instanceName: primaryName, schema: primarySchema });

    return this._buildFile(blocks, primarySchema.providerKey, primarySchema.version, outputNodes);
  }

  /**
   * Generate Terraform HCL and Multi-File Project for an arbitrary Directed Acyclic Graph (DAG) created on the Canvas.
   *
   * @param {Object} graphPayload - { provider, nodes: [...], edges: [...] }
   * @returns {Object} { terraform, files: { "main.tf": ..., "variables.tf": ..., "outputs.tf": ..., "providers.tf": ..., "terraform.tfvars": ... }, sortedNodes: [...] }
   */
  generateFromGraph(graphPayload = {}) {
    const { provider = "aws", nodes = [], edges = [] } = graphPayload;
    const resolver = new GraphResolverService();
    const { sortedNodes, refMaps } = resolver.resolveGraph(nodes, edges);

    const blocks = [];
    let detectedVersion = "5.0";
    const schemasMap = {};

    for (const node of sortedNodes) {
      const userValues = node.values || {};
      const refMap = refMaps[node.id] || {};

      validateRequiredFields(node.schema, userValues, refMap);
      validateConstraints(node.schema, userValues);

      const nodeConfig = this._buildConfig(node.schema, userValues, refMap);
      blocks.push(
        this._resourceBlock(node.schema.terraformType, node.instanceName, nodeConfig)
      );

      if (node.schema.version) {
        detectedVersion = node.schema.version;
      }
      schemasMap[node.schema.terraformType] = node.schema;
    }

    const outputNodes = sortedNodes.map((n) => ({
      terraformType: n.schema.terraformType,
      instanceName: n.instanceName,
      schema: n.schema,
    }));

    const providerAdapter = getTerraformProvider(provider);
    const providersTf = providerAdapter.getProvidersTf(detectedVersion);
    const variablesTf = providerAdapter.getVariablesTf(sortedNodes);
    const mainTf = blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");
    const outputsTf = providerAdapter.getOutputsTf(outputNodes, schemasMap);
    const tfVars = providerAdapter.getTfVars(sortedNodes);

    // Multi-file enterprise layout (/senior-devops & /terraform-specialist)
    const files = {
      "main.tf": mainTf,
      "variables.tf": variablesTf,
      "outputs.tf": outputsTf,
      "providers.tf": providersTf,
      "terraform.tfvars": tfVars,
    };

    // Backward-compatible single-string HCL bundle
    const combinedParts = [
      providersTf.trimEnd(),
      "",
      variablesTf.trimEnd(),
      "",
      mainTf.trimEnd(),
    ];

    if (outputsTf && outputsTf.trim()) {
      combinedParts.push(
        "",
        "# ------------------------------------------------------------------------------",
        "# Outputs",
        "# ------------------------------------------------------------------------------",
        "",
        outputsTf.trimEnd()
      );
    }

    const terraform = combinedParts.filter((p) => p !== undefined).join("\n") + "\n";

    // Save multi-file project to disk
    this.saveTerraformFile(files, terraform);

    return {
      terraform,
      files,
      sortedNodes: sortedNodes.map((n) => ({
        id: n.id,
        instanceName: n.instanceName,
        resourceType: n.resourceType,
        terraformType: n.schema.terraformType,
      })),
    };
  }

  /**
   * Wrap resource blocks in the correct provider header, variables, and output blocks.
   */
  _buildFile(blocks, providerKey = "aws", version = "5.0", outputNodes = []) {
    const providerAdapter = getTerraformProvider(providerKey);
    const providersTf = providerAdapter.getProvidersTf(version);
    const variablesTf = providerAdapter.getVariablesTf();
    const outputsTf = providerAdapter.getOutputsTf(outputNodes);
    const mainTf = blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");

    const parts = [
      providersTf.trimEnd(),
      "",
      variablesTf.trimEnd(),
      "",
      mainTf.trimEnd(),
    ];

    if (outputsTf && outputsTf.trim()) {
      parts.push(
        "",
        "# ------------------------------------------------------------------------------",
        "# Outputs",
        "# ------------------------------------------------------------------------------",
        "",
        outputsTf.trimEnd()
      );
    }

    return parts.join("\n") + "\n";
  }

  /**
   * Save generated Terraform files to the `generated/` directory.
   * Supports saving both multi-file dictionaries and single-string content.
   */
  saveTerraformFile(filesOrContent, fallbackContent) {
    const outputDirectory = path.join(process.cwd(), "generated");

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    if (typeof filesOrContent === "object" && !Buffer.isBuffer(filesOrContent)) {
      for (const [filename, content] of Object.entries(filesOrContent)) {
        const filePath = path.join(outputDirectory, filename);
        fs.writeFileSync(filePath, content || "", { encoding: "utf-8", flag: "w" });
      }
      return path.join(outputDirectory, "main.tf");
    }

    const outputPath = path.join(outputDirectory, "main.tf");
    fs.writeFileSync(outputPath, filesOrContent, { encoding: "utf-8", flag: "w" });
    return outputPath;
  }
}
