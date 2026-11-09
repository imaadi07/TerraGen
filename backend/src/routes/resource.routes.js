import express from "express";
import { getAllSchemas } from "../services/schema-loader.service.js";
import { ApiResponse } from "../utils/api-response.util.js";

const router = express.Router();

router.get("/", (_req, res) => {
  const resources = getAllSchemas();
  return ApiResponse.success(res, resources);
});

export default router;
