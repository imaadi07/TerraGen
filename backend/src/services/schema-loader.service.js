import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolve SCHEMA_DIR relative to this file to avoid cwd discrepancies
const SCHEMA_DIR = path.resolve(__dirname, "../schemas");

/**
 * Cache structures:
 * - resourceMap: Map<resourceId, Map<version, schemaObject>>
 * - metaMap: Map<resourceId, ResourceMeta>
 */
let resourceMap = null;
let metaMap = null;

/**
 * Recursively collect all .json file paths under a directory,
 * skipping any folder named "_deprecated".
 */
function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "_deprecated") continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Normalize version strings (e.g. "v5.0" -> "5.0", "5" -> "5.0")
 */
function normalizeVersion(ver) {
  if (!ver) return "5.0";
  const cleaned = String(ver).trim().replace(/^v/i, "");
  return cleaned || "5.0";
}

/**
 * Compare two semver-like version strings ("5.0", "5.1", "6.0") descending
 */
function compareVersionsDesc(a, b) {
  const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numB - numA;
  }
  return 0;
}

/**
 * Derive high-level architectural classification category for a schema.
 */
function deriveCategory(schema) {
  if (schema.category) return String(schema.category).toLowerCase();
  const type = (schema.canvasType || schema.terraformType || "").toLowerCase();
  if (type.includes("lambda") || type.includes("sqs") || type.includes("sns") || type.includes("apigateway") || type.includes("event")) return "serverless";
  if (type.includes("ec2") || type.includes("eks") || type.includes("ecs") || type.includes("instance") || type.includes("compute")) return "compute";
  if (type.includes("db") || type.includes("rds") || type.includes("dynamo") || type.includes("redshift") || type.includes("sql")) return "database";
  if (type.includes("s3") || type.includes("storage") || type.includes("bucket")) return "storage";
  if (type.includes("iam") || type.includes("secret") || type.includes("trail") || type.includes("firewall") || type.includes("security")) return "security";
  if (type.includes("vpc") || type.includes("subnet") || type.includes("network") || type.includes("gateway") || type.includes("route")) return "networking";
  return "general";
}

/**
 * Build or rebuild the in-memory schema index.
 */
function buildIndex() {
  const files = collectJsonFiles(SCHEMA_DIR);
  const newResourceMap = new Map();
  const newMetaMap = new Map();

  for (const fullPath of files) {
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const schema = JSON.parse(raw);

      if (!schema.canvasType) continue;

      const resourceId = schema.canvasType;
      // Derive version from parent directory name or schema content
      const parentDirName = path.basename(path.dirname(fullPath));
      const version = normalizeVersion(schema.version || parentDirName || "5.0");
      schema.version = version;
      schema.category = deriveCategory(schema);

      if (!newResourceMap.has(resourceId)) {
        newResourceMap.set(resourceId, new Map());
      }
      newResourceMap.get(resourceId).set(version, schema);

      // Collect metadata
      if (!newMetaMap.has(resourceId)) {
        newMetaMap.set(resourceId, {
          id: resourceId,
          terraformType: schema.terraformType,
          displayName: schema.displayName,
          provider:
            schema.providerKey ||
            (fullPath.includes(`${path.sep}azure${path.sep}`) || resourceId.startsWith("azure")
              ? "azure"
              : fullPath.includes(`${path.sep}gcp${path.sep}`) || resourceId.startsWith("gcp")
              ? "gcp"
              : "aws"),
          category: schema.category,
          icon: schema.icon,
          color: schema.color,
          file: path.relative(SCHEMA_DIR, fullPath),
          versions: [],
        });
      }

      const meta = newMetaMap.get(resourceId);
      if (!meta.versions.includes(version)) {
        meta.versions.push(version);
      }
    } catch (err) {
      console.error(`[schema-loader] Error reading schema at ${fullPath}:`, err.message);
    }
  }

  // Sort versions descending and determine latest/default version
  for (const [, meta] of newMetaMap) {
    meta.versions.sort(compareVersionsDesc);
    meta.defaultVersion = meta.versions[0] || "5.0";
    meta.availableVersions = [...meta.versions];
  }

  resourceMap = newResourceMap;
  metaMap = newMetaMap;
}

function ensureIndex() {
  if (!resourceMap || !metaMap) {
    buildIndex();
  }
}

/**
 * Reload schemas from disk (resets index).
 */
export function reloadSchemas() {
  buildIndex();
}

/**
 * Return summary list of all available resources across all providers.
 */
export function getAllSchemas() {
  ensureIndex();
  return Array.from(metaMap.values());
}

/**
 * Get schema by resource ID and optional version.
 * If version is omitted, returns the latest/default version.
 *
 * @param {string} resourceId  - e.g. "aws-ec2", "gcp-compute-instance"
 * @param {string} [version]   - e.g. "5.0", "v5.0"
 * @returns {object|null}
 */
export function getSchemaById(resourceId, version = null) {
  ensureIndex();

  const versionsMap = resourceMap.get(resourceId);
  if (!versionsMap || versionsMap.size === 0) {
    return null;
  }

  if (version) {
    const norm = normalizeVersion(version);
    if (versionsMap.has(norm)) {
      return versionsMap.get(norm);
    }
  }

  // Return default (latest) version
  const meta = metaMap.get(resourceId);
  const defaultVer = meta?.defaultVersion || Array.from(versionsMap.keys())[0];
  return versionsMap.get(defaultVer) || null;
}

/**
 * Get available version tags for a given resource ID.
 *
 * @param {string} resourceId
 * @returns {string[]}
 */
export function getResourceVersions(resourceId) {
  ensureIndex();
  const meta = metaMap.get(resourceId);
  return meta?.availableVersions || [];
}
