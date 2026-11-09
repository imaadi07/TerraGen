variable "environment" {
  description = "Target deployment environment"
  type        = string
  default     = "production"
}

variable "gcp_project_id" {
  description = "The GCP project ID to deploy resources into"
  type        = string
  default     = "my-production-project"
}

variable "gcp_region" {
  description = "Default GCP compute region"
  type        = string
  default     = "us-central1"
}
