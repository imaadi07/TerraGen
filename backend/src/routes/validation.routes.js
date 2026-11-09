import express from "express";
import { validateAwsResourceName } from "../services/aws-name-validator.service.js";

const router = express.Router();

/**
 * POST /api/validation/name
 * Body: { provider: "aws", resourceType: "aws-s3", name: "my-bucket", options: {} }
 */
router.post("/name", (req, res) => {
  const { provider = "aws", resourceType, name, options = {} } = req.body;

  if (provider === "aws") {
    const result = validateAwsResourceName(resourceType, name, options);
    return res.json({
      success: true,
      valid: result.valid,
      error: result.error,
    });
  }

  // Fallback for non-AWS or unconstrained resources
  return res.json({
    success: true,
    valid: true,
    error: null,
  });
});

export default router;

