import express from "express";

import {
  getSchemaById,
  getResourceVersions,
} from "../services/schema-loader.service.js";
import { ApiResponse } from "../utils/api-response.util.js";

const router = express.Router();

/**
 * GET /api/schema/:resourceId/versions
 * Returns all available schema versions for a given resource.
 */
router.get("/:resourceId/versions", (req, res) => {
  const versions = getResourceVersions(req.params.resourceId);
  return ApiResponse.success(res, versions);
});

/**
 * GET /api/schema/:resourceId/:version
 * Fetch explicit version of schema.
 */
router.get("/:resourceId/:version", (req, res) => {
  const { resourceId, version } = req.params;
  const schema = getSchemaById(resourceId, version);

  if (!schema) {
    return ApiResponse.error(
      res,
      `Schema not found for resource "${resourceId}" version "${version}"`,
      { status: 404, code: "SCHEMA_NOT_FOUND" }
    );
  }

  return ApiResponse.success(res, schema, {
    extra: {
      version: schema.version,
      availableVersions: getResourceVersions(resourceId),
    },
  });
});

/**
 * GET /api/schema/:resourceId
 * Fetch schema (supports ?version=X query param).
 * Defaults to the latest/default version if not specified.
 */
router.get("/:resourceId", (req, res) => {
  const { resourceId } = req.params;
  const { version } = req.query;

  const schema = getSchemaById(resourceId, version);

  if (!schema) {
    return ApiResponse.error(
      res,
      `Schema not found for resource "${resourceId}"`,
      { status: 404, code: "SCHEMA_NOT_FOUND" }
    );
  }

  return ApiResponse.success(res, schema, {
    extra: {
      version: schema.version,
      availableVersions: getResourceVersions(resourceId),
    },
  });
});

export default router;
