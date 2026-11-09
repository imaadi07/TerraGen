output "custom_vpc_id" {
  description = "The ID of the VPC network."
  value       = google_compute_network.custom_vpc.id
}

output "custom_vpc_gateway_ipv4" {
  description = "The IPv4 address of the default gateway."
  value       = google_compute_network.custom_vpc.gateway_ipv4
}

output "prod_gke_id" {
  description = "The identifier of the GKE cluster."
  value       = google_container_cluster.prod_gke.id
}

output "prod_gke_endpoint" {
  description = "The IP address of the GKE cluster master."
  value       = google_container_cluster.prod_gke.endpoint
}

output "prod_cloudsql_id" {
  description = "The identifier of the Cloud SQL instance."
  value       = google_sql_database_instance.prod_cloudsql.id
}

output "prod_cloudsql_connection_name" {
  description = "The connection name of the Cloud SQL instance for Cloud SQL Proxy."
  value       = google_sql_database_instance.prod_cloudsql.connection_name
}
