# 0001 - Schema Versioning and Generic Dynamic Form Architecture

## Status
Accepted

## Context
The Auto Terraform Generator previously stored all resource JSON schemas flat inside provider directories (`backend/src/schemas/AWS/*.base.json` and `backend/src/schemas/GCP/*.base.json`). This structure had no versioning support, suffered from directory path resolution bugs, and used an ad-hoc form renderer in the frontend.

## Decision
1. **Direct `<resource_name>/<version>/base.json` Format**:
   Organize schemas directly under `src/schemas/` by resource name and version:
   ```
   src/schemas/
   ├── <resource_name>/
   │   └── <version>/
   │       └── base.json
   ```
   Example:
   - `src/schemas/aws-ec2/5.0/base.json`
   - `src/schemas/aws-ec2/6.0/base.json` (for upcoming versions)
   - `src/schemas/gcp-compute-instance/5.0/base.json`

2. **Schema Loader Enhancement**:
   - Resolve schema directory relative to `import.meta.url` rather than `process.cwd()`.
   - Build a multi-level in-memory index: `schemaIndex.get(resourceId).get(version)`.
   - Automatically extract version from the parent `<version>` folder or schema content.
   - Maintain 100% backwards compatibility for `getSchemaById(resourceId)` by returning the default/latest version when no version is specified.

3. **Generic UI Form Engine**:
   - Declarative schema interpreter in `DynamicForm.jsx` supporting strings, passwords, numbers, booleans, enums, multi-select, tag lists, key-value maps, and multiline scripts.
   - Live validation, regex checks, and warning callouts for immutable properties.
