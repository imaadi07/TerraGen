import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import terraformRoutes from "./routes/terraform.routes.js";
import dynamicRoutes from "./routes/dynamic.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import schemaRoutes from "./routes/schema.routes.js";
import dependencyRoutes from "./routes/dependency.routes.js";
import validationRoutes from "./routes/validation.routes.js";
import { ApiResponse } from "./utils/api-response.util.js";

dotenv.config();

const app = express();

// SecOps: Standard Security Response Headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(cors());

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use("/api/resources", resourceRoutes);
app.use("/api/schema", schemaRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/terraform", terraformRoutes);
app.use("/api/dynamic", dynamicRoutes);
app.use("/api/validation", validationRoutes);

// Clean Architecture & SecOps: Centralized Structured Error Handling
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message || "Internal server error";

  return ApiResponse.error(res, message, {
    status,
    code: err.code || (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED"),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
