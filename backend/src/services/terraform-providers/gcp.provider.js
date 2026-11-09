import { BaseTerraformProvider } from "./base.provider.js";

const GCP_OUTPUT_MAP = {
  google_compute_network: [
    { attr: "id", desc: "The ID of the VPC network." },
    { attr: "gateway_ipv4", desc: "The IPv4 address of the default gateway." },
  ],
  google_compute_subnetwork: [
    { attr: "id", desc: "The ID of the subnetwork." },
    { attr: "ip_cidr_range", desc: "The IP range of the subnetwork." },
  ],
  google_compute_instance: [
    { attr: "id", desc: "The server-assigned unique identifier of the instance." },
    { attr: "self_link", desc: "The URI of the created compute instance." },
  ],
  google_container_cluster: [
    { attr: "id", desc: "The identifier of the GKE cluster." },
    { attr: "endpoint", desc: "The IP address of the GKE cluster master." },
  ],
  google_sql_database_instance: [
    { attr: "id", desc: "The identifier of the Cloud SQL instance." },
    { attr: "connection_name", desc: "The connection name of the Cloud SQL instance for Cloud SQL Proxy." },
  ],
  google_storage_bucket: [
    { attr: "id", desc: "The ID of the Cloud Storage bucket." },
    { attr: "url", desc: "The base URL of the bucket in gs://format." },
  ],
  google_cloud_run_v2_service: [
    { attr: "id", desc: "The identifier of the Cloud Run service." },
    { attr: "uri", desc: "The main URI at which the service is callable." },
  ],
  google_cloudfunctions2_function: [
    { attr: "id", desc: "The identifier of the Cloud Function." },
    { attr: "url", desc: "The URL of the Cloud Function." },
  ],
  google_compute_global_forwarding_rule: [
    { attr: "id", desc: "The identifier of the global forwarding rule." },
    { attr: "ip_address", desc: "The IP address allocated to the global forwarding rule." },
  ],
  google_compute_forwarding_rule: [
    { attr: "id", desc: "The identifier of the regional forwarding rule." },
    { attr: "ip_address", desc: "The IP address allocated to the regional forwarding rule." },
  ],
  google_compute_global_address: [
    { attr: "id", desc: "The identifier of the global address." },
    { attr: "address", desc: "The reserved public IP address." },
  ],
  google_compute_backend_service: [
    { attr: "id", desc: "The identifier of the backend service." },
    { attr: "self_link", desc: "The URI of the backend service." },
  ],
  google_compute_region_backend_service: [
    { attr: "id", desc: "The identifier of the regional backend service." },
    { attr: "self_link", desc: "The URI of the regional backend service." },
  ],
  google_compute_url_map: [
    { attr: "id", desc: "The identifier of the URL map." },
    { attr: "map_id", desc: "The internal map ID." },
  ],
  google_compute_target_http_proxy: [
    { attr: "id", desc: "The identifier of the Target HTTP proxy." },
    { attr: "self_link", desc: "The URI of the Target HTTP proxy." },
  ],
  google_compute_target_https_proxy: [
    { attr: "id", desc: "The identifier of the Target HTTPS proxy." },
    { attr: "self_link", desc: "The URI of the Target HTTPS proxy." },
  ],
  google_compute_health_check: [
    { attr: "id", desc: "The identifier of the health check." },
    { attr: "self_link", desc: "The URI of the health check." },
  ],
  google_compute_region_neg: [
    { attr: "id", desc: "The identifier of the serverless network endpoint group." },
    { attr: "self_link", desc: "The URI of the network endpoint group." },
  ],
  google_pubsub_topic: [
    { attr: "id", desc: "The identifier of the Pub/Sub topic." },
  ],
  google_pubsub_subscription: [
    { attr: "id", desc: "The identifier of the Pub/Sub subscription." },
  ],
  google_artifact_registry_repository: [
    { attr: "id", desc: "The identifier of the Artifact Registry repository." },
    { attr: "name", desc: "The resource name of the repository." },
  ],
  google_secret_manager_secret: [
    { attr: "id", desc: "The identifier of the Secret Manager secret." },
  ],
  google_kms_key_ring: [
    { attr: "id", desc: "The identifier of the KMS Key Ring." },
  ],
  google_kms_crypto_key: [
    { attr: "id", desc: "The identifier of the KMS Crypto Key." },
  ],
  google_service_account: [
    { attr: "id", desc: "The identifier of the Service Account." },
    { attr: "email", desc: "The e-mail address of the Service Account." },
  ],
  google_redis_instance: [
    { attr: "id", desc: "The identifier of the Memorystore Redis instance." },
    { attr: "host", desc: "The IP address of the instance." },
    { attr: "port", desc: "The port number on which the Redis instance accepts connections." },
  ],
  google_bigquery_dataset: [
    { attr: "id", desc: "The identifier of the BigQuery dataset." },
    { attr: "dataset_id", desc: "A unique ID for this dataset." },
  ],
  google_dns_managed_zone: [
    { attr: "id", desc: "The identifier of the DNS Managed Zone." },
    { attr: "name_servers", desc: "The list of nameservers that have been assigned to the zone." },
  ],
};

export class GcpTerraformProvider extends BaseTerraformProvider {
  constructor() {
    super({
      key: "google",
      name: "Google Cloud Platform",
      source: "hashicorp/google",
      defaultVersion: "6.0",
      resourceOutputMappings: GCP_OUTPUT_MAP,
    });
  }

  getProviderBlock() {
    return [
      `provider "google" {`,
      `  project = var.gcp_project_id`,
      `  region  = var.gcp_region`,
      ``,
      `  default_labels = {`,
      `    environment = var.environment`,
      `    managed_by  = "terraform"`,
      `  }`,
      `}`,
      ``,
    ].join("\n");
  }

  getVariables() {
    return [
      {
        name: "environment",
        type: "string",
        default: "production",
        description: "Target deployment environment",
      },
      {
        name: "gcp_project_id",
        type: "string",
        default: "my-production-project",
        description: "The GCP project ID to deploy resources into",
      },
      {
        name: "gcp_region",
        type: "string",
        default: "us-central1",
        description: "Default GCP compute region",
      },
    ];
  }

  getTfVars() {
    return [
      `environment    = "production"`,
      `gcp_project_id = "my-production-project"`,
      `gcp_region     = "us-central1"`,
      ``,
    ].join("\n");
  }

  applyCustomHardening(schema, tfConfig) {
    const tType = schema?.terraformType;
    if (tType === "google_storage_bucket") {
      if (tfConfig.uniform_bucket_level_access === undefined) tfConfig.uniform_bucket_level_access = true;
    } else if (tType === "google_sql_database_instance") {
      if (tfConfig.deletion_protection === undefined) tfConfig.deletion_protection = false;
    }
    return tfConfig;
  }
}
