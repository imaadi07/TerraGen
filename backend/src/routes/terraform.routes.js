import express from "express";

import { TerraformGeneratorService } from "../services/terraform-generator.services.js";
import { DependencyResolverService } from "../services/dependency-resolver.service.js";
import { getSchemaById } from "../services/schema-loader.service.js";
import { costEstimatorService } from "../services/cost-estimator.service.js";
import { createZipBuffer } from "../utils/zip.util.js";
import { ApiResponse } from "../utils/api-response.util.js";

const router = express.Router();

const generatorService = new TerraformGeneratorService();
const resolverService = new DependencyResolverService();

/**
 * POST /api/terraform/estimate-cost
 * Estimates running infrastructure costs based on graph nodes or main.tf HCL.
 */
router.post("/estimate-cost", (req, res, next) => {
  try {
    const { provider = "aws", nodes = [], terraform = "", days = 30 } = req.body;

    const estimate = costEstimatorService.estimate({
      provider,
      nodes,
      terraform,
      days,
    });

    return ApiResponse.success(res, estimate);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/terraform/canvas
 * Graph-based Terraform generation for visual canvas topologies.
 */
router.post("/canvas", (req, res, next) => {
  try {
    const { provider = "aws", nodes = [], edges = [] } = req.body;

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return ApiResponse.error(
        res,
        "Canvas is empty. Add at least one resource node before generating Terraform.",
        { status: 400, code: "EMPTY_CANVAS" }
      );
    }

    const result = generatorService.generateFromGraph({ provider, nodes, edges });

    return ApiResponse.success(res, undefined, {
      extra: {
        terraform: result.terraform,
        files: result.files,
        sortedNodes: result.sortedNodes,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/terraform/download-zip
 * Generates and downloads a clean production-ready ZIP archive of the multi-file Terraform project.
 */
router.post("/download-zip", (req, res, next) => {
  try {
    const { files = {}, projectName = "terraform-project" } = req.body;

    if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
      return ApiResponse.error(
        res,
        "No files provided for download package.",
        { status: 400, code: "MISSING_FILES" }
      );
    }

    const zipBuffer = createZipBuffer(files);
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_") || "terraform-project";

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);

    return res.send(zipBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/terraform/multi/:resourceId
 * Multi-resource generation with inline dependency support.
 */
router.post("/multi/:resourceId", (req, res, next) => {
  try {
    const schema = getSchemaById(req.params.resourceId);

    if (!schema) {
      return ApiResponse.error(
        res,
        `Schema not found for resourceId: "${req.params.resourceId}"`,
        { status: 404, code: "SCHEMA_NOT_FOUND" }
      );
    }

    const { primary = {}, dependencies = {} } = req.body;

    const normalisedDeps = {};
    for (const [resourceType, entry] of Object.entries(dependencies)) {
      if (entry && typeof entry === "object" && ("mode" in entry || "values" in entry)) {
        normalisedDeps[resourceType] = {
          mode: entry.mode || "inline-create",
          values: entry.values || {},
        };
      } else {
        normalisedDeps[resourceType] = {
          mode: "inline-create",
          values: entry || {},
        };
      }
    }

    const resolvedDeps = resolverService.resolve(schema, normalisedDeps);
    const refMap = resolverService.buildRefMap(resolvedDeps);

    const terraform = generatorService.generateMulti(
      schema,
      primary,
      resolvedDeps,
      refMap
    );

    generatorService.saveTerraformFile(terraform);

    return ApiResponse.success(res, undefined, {
      extra: {
        terraform,
        resolvedDependencies: resolvedDeps.map((d) => ({
          resourceType: d.resourceType,
          terraformType: d.terraformType,
          resourceName: d.resourceName,
          tfRef: d.tfRef,
          mode: d.mode,
          isDataSource: d.isDataSource,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/terraform/:resourceId
 * Original single-resource generation endpoint.
 */
router.post("/:resourceId", (req, res, next) => {
  try {
    const schema = getSchemaById(req.params.resourceId);

    if (!schema) {
      return ApiResponse.error(
        res,
        `Schema not found for resourceId: "${req.params.resourceId}"`,
        { status: 404, code: "SCHEMA_NOT_FOUND" }
      );
    }

    const terraform = generatorService.generate(schema, req.body);
    generatorService.saveTerraformFile(terraform);

    return ApiResponse.success(res, undefined, {
      extra: { terraform },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
