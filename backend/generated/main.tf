resource "google_compute_network" "custom_vpc" {
  name = "prod-vpc-network"
  auto_create_subnetworks = false
  routing_mode = "REGIONAL"
}

resource "google_container_cluster" "prod_gke" {
  name = "prod-k8s-cluster"
  location = "us-central1"
  deletion_protection = false
}

resource "google_sql_database_instance" "prod_cloudsql" {
  name = "prod-db-instance"
  database_version = "POSTGRES_15"
  region = "us-central1"
  settings {
    0 {
      tier = "db-custom-4-16384"
    }
  }
  deletion_protection = false
}
