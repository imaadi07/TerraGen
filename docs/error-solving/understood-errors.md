# Understood Errors & Failure Modes

## Error Patterns

### Relative Working Directory Path Resolution with `process.cwd()`
- **Cause**: Using `path.join(process.cwd(), "src/schemas")` assumes the Node process is always launched from the `backend/` directory. Running scripts from root or other working directories triggers `ENOENT: no such file or directory, scandir '.../src/schemas'`.
- **Solution**: Derive base paths using module-relative resolution: `fileURLToPath(new URL("../schemas", import.meta.url))`.
- **Prevention**: Never use `process.cwd()` for internal assets and static schemas bundled with the application. Always resolve paths relative to `import.meta.url`.

### Duplicate Extension in Schema Filename
- **Cause**: Schema file named `aws-redshiftserverless-namespace.base.json.json` had accidental double `.json.json` extension.
- **Solution**: Normalize file names during migration to `base_v_<version>.json`.
- **Prevention**: Validate file extensions with automated schema tests.

### Condition Evaluator Operator Mismatch
- **Cause**: Some schemas used `{ "field": "key", "equals": val }` while others (e.g. `aws_eks_cluster.base.json`) used `{ "field": "key", "operator": "equals", "value": val }`.
- **Solution**: Write a normalized condition evaluation helper that handles both `{ equals }` and `{ operator, value }` seamlessly.
- **Prevention**: Create schema validation test to check conformity of conditional visibility rules.

### S3 Bucket DNS Rule Precedence
- **Cause**: Generic regex `^[a-z0-9-]+$` rejects periods before the IP-address pattern validator runs, masking the specific "Cannot be formatted as an IP address" error message.
- **Solution**: Execute the specific IP pattern check (`^(\d{1,3}\.){3}\d{1,3}$`) prior to the general character set validation.
- **Prevention**: Order validation rules from most specific domain constraints to broadest syntax constraints.

### Credential-Free Cloud Catalog Architecture
- **Cause**: Relying solely on live cloud SDK or Boto3 calls fails on systems without cloud credentials configured, blocking UI form rendering and option population.
- **Solution**: Provide a bundled catalog of standard public AWS Managed Policies and Service Trust Principals, serving them without credential requirements with an optional live-enrichment path.
- **Prevention**: Design UI dynamic data feeds to always degrade gracefully to curated offline catalogs when environment credentials are unavailable.

## Known Failure Modes

### Hardcoded Flat Schema Names in Loaders
- **What looks correct**: Loading schema by single static file name (e.g. `path.join(SCHEMA_DIR, `${resourceId}.base.json`)`).
- **Why it's wrong**: Breaks when schemas are versioned (e.g. `base_v_5.0.json`, `base_v_6.0.json`) and fails to support multi-provider/multi-version evolution.
- **Correct approach**: Recursive directory traversal that indexes resources by `(resourceId, version)` with default fallback to the latest version.

