import axios from "axios";

/**
 * Standard Application API Error
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = "UNKNOWN_ERROR", details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Thrown when an API response violates structural contract verification.
 */
export class ApiValidationError extends ApiError {
  constructor(message, endpoint, expectedSchema, receivedData) {
    super(message, 502, "API_VALIDATION_ERROR", { endpoint, expectedSchema, receivedData });
    this.name = "ApiValidationError";
  }
}

/**
 * Thrown when network transport fails or server is unreachable.
 */
export class NetworkError extends ApiError {
  constructor(message) {
    super(message, 0, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

// Intercept errors and normalize them into structured domain errors
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data || {};
      const status = error.response.status;
      const message = data.error || data.message || `Request failed with status ${status}`;
      const code = data.code || `HTTP_${status}`;
      return Promise.reject(new ApiError(message, status, code, data.details));
    } else if (error.request) {
      return Promise.reject(
        new NetworkError("Unable to reach backend service. Verify backend is running on port 5000.")
      );
    }
    return Promise.reject(new ApiError(error.message || "Request initialization failed", 500));
  }
);

/**
 * Structural verification engine for API responses.
 * Enforces Clean Architecture boundary checks and SecOps payload validation.
 *
 * @param {object} response Axios response object
 * @param {object} schemaDefinition Map of field names to { type, required }
 * @param {string} endpointContext Descriptive context for logging/errors
 * @returns {any} Validated response data
 */
export function verifyApiResponse(response, schemaDefinition = {}, endpointContext = "API") {
  if (!response || typeof response !== "object") {
    throw new ApiValidationError(
      `[${endpointContext}] Response is not an object`,
      endpointContext,
      schemaDefinition,
      response
    );
  }

  // Handle Binary / Blob responses
  if (schemaDefinition.__isBlob) {
    if (!response.data || (typeof Blob !== "undefined" && !(response.data instanceof Blob))) {
      throw new ApiValidationError(
        `[${endpointContext}] Expected Blob binary response, received: ${typeof response.data}`,
        endpointContext,
        schemaDefinition,
        response.data
      );
    }
    return response.data;
  }

  const payload = response.data;

  if (!payload || typeof payload !== "object") {
    throw new ApiValidationError(
      `[${endpointContext}] Response payload body is empty or malformed`,
      endpointContext,
      schemaDefinition,
      payload
    );
  }

  if (payload.success === false) {
    throw new ApiError(
      payload.error || `[${endpointContext}] Server reported failure`,
      response.status || 400,
      payload.code || "SERVER_FAILURE",
      payload.details
    );
  }

  // Verify each defined field
  for (const [field, rule] of Object.entries(schemaDefinition)) {
    if (field.startsWith("__")) continue;

    const value = payload[field];
    const { type, required = true } = rule;

    if (required && (value === undefined || value === null)) {
      throw new ApiValidationError(
        `[${endpointContext}] Missing required response field "${field}"`,
        endpointContext,
        schemaDefinition,
        payload
      );
    }

    if (value !== undefined && value !== null && type) {
      let isTypeValid = false;
      if (type === "array") {
        isTypeValid = Array.isArray(value);
      } else if (type === "object") {
        isTypeValid = typeof value === "object" && !Array.isArray(value);
      } else if (type === "string") {
        isTypeValid = typeof value === "string";
      } else if (type === "number") {
        isTypeValid = typeof value === "number";
      } else if (type === "boolean") {
        isTypeValid = typeof value === "boolean";
      } else if (type === "any") {
        isTypeValid = true;
      }

      if (!isTypeValid) {
        throw new ApiValidationError(
          `[${endpointContext}] Field "${field}" failed type check: expected ${type}, got ${Array.isArray(value) ? "array" : typeof value}`,
          endpointContext,
          schemaDefinition,
          payload
        );
      }
    }
  }

  return payload;
}

/**
 * Structured API Client Gateway
 */
export const apiClient = {
  /**
   * Fetch all resource schemas catalog.
   */
  async getResources() {
    const res = await http.get("/resources");
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        data: { type: "array", required: true },
      },
      "GET /resources"
    );
    return verified.data;
  },

  /**
   * Fetch schema for a specific resource and version.
   */
  async getSchema(resourceId, version) {
    const url = version ? `/schema/${resourceId}?version=${version}` : `/schema/${resourceId}`;
    const res = await http.get(url);
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        data: { type: "object", required: true },
      },
      `GET /schema/${resourceId}`
    );
    return verified.data;
  },

  /**
   * Fetch available versions for a resource.
   */
  async getSchemaVersions(resourceId) {
    const res = await http.get(`/schema/${resourceId}/versions`);
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        data: { type: "array", required: true },
      },
      `GET /schema/${resourceId}/versions`
    );
    return verified.data;
  },

  /**
   * Generate multi-file Terraform configuration from visual canvas graph.
   */
  async generateCanvas({ provider = "aws", nodes = [], edges = [] }) {
    const res = await http.post("/terraform/canvas", { provider, nodes, edges });
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        terraform: { type: "string", required: true },
        files: { type: "object", required: true },
        sortedNodes: { type: "array", required: true },
      },
      "POST /terraform/canvas"
    );
    return {
      terraform: verified.terraform,
      files: verified.files,
      sortedNodes: verified.sortedNodes,
    };
  },

  /**
   * Estimate cloud infrastructure costs.
   */
  async estimateCost({ provider = "aws", nodes = [], terraform = "", days = 30 }) {
    const res = await http.post("/terraform/estimate-cost", {
      provider,
      nodes,
      terraform,
      days,
    });
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        data: { type: "object", required: true },
      },
      "POST /terraform/estimate-cost"
    );
    return verified.data;
  },

  /**
   * Download in-memory generated ZIP package.
   */
  async downloadZip({ projectName = "terraform-project", files = {} }) {
    const res = await http.post(
      "/terraform/download-zip",
      { projectName, files },
      { responseType: "blob" }
    );
    return verifyApiResponse(res, { __isBlob: true }, "POST /terraform/download-zip");
  },

  /**
   * Fetch dynamic dropdown choices with offline fallback.
   */
  async fetchDynamicOptions(endpoint, params = {}) {
    const cleanEndpoint = endpoint.replace(/^\/?api\//, "/");
    const res = await http.get(cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`, { params });
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        data: { type: "any", required: true },
      },
      `GET ${endpoint}`
    );
    return verified.data;
  },

  /**
   * Resolve multi-resource dependencies.
   */
  async resolveDependencies(payload) {
    const res = await http.post("/dependencies/resolve-multi", payload);
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
      },
      "POST /dependencies/resolve-multi"
    );
    return verified;
  },

  /**
   * Generate single-resource Terraform.
   */
  async generateResource(resourceId, formData) {
    const res = await http.post(`/terraform/${resourceId}`, formData);
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        terraform: { type: "string", required: true },
      },
      `POST /terraform/${resourceId}`
    );
    return verified.terraform;
  },

  /**
   * Generate multi-resource Terraform.
   */
  async generateMultiResource(resourceId, payload) {
    const res = await http.post(`/terraform/multi/${resourceId}`, payload);
    const verified = verifyApiResponse(
      res,
      {
        success: { type: "boolean", required: true },
        terraform: { type: "string", required: true },
      },
      `POST /terraform/multi/${resourceId}`
    );
    return verified;
  },
};

export default apiClient;
