/**
 * Structured API Response Utility
 *
 * Enforces Clean Architecture boundary standards and SecOps response consistency.
 * All API controllers and route handlers use this utility to emit predictable,
 * typed envelopes with timestamps and sanitized error states.
 */
export class ApiResponse {
  /**
   * Emits a standardized successful response.
   *
   * @param {import("express").Response} res Express response object
   * @param {any} [data] Primary response payload
   * @param {object} [options]
   * @param {number} [options.status=200] HTTP status code
   * @param {object} [options.extra] Additional top-level fields (e.g. files, terraform, sortedNodes)
   * @param {object} [options.meta] Optional metadata (pagination, timings, etc.)
   */
  static success(res, data, { status = 200, extra = {}, meta = null } = {}) {
    const payload = {
      success: true,
      timestamp: new Date().toISOString(),
      ...(data !== undefined ? { data } : {}),
      ...(extra && typeof extra === "object" ? extra : {}),
      ...(meta ? { meta } : {}),
    };

    if (typeof res.status === "function") {
      res.status(status);
    }
    return res.json(payload);
  }

  /**
   * Emits a standardized error response.
   *
   * @param {import("express").Response} res Express response object
   * @param {string} message User-facing error message
   * @param {object} [options]
   * @param {number} [options.status=400] HTTP status code
   * @param {string} [options.code="REQUEST_FAILED"] Machine-readable error code
   * @param {any} [options.details=null] Optional sanitized error details
   */
  static error(res, message, { status = 400, code = "REQUEST_FAILED", details = null } = {}) {
    const payload = {
      success: false,
      error: message || "An unexpected error occurred",
      code,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    };

    if (typeof res.status === "function") {
      res.status(status);
    }
    return res.json(payload);
  }
}
