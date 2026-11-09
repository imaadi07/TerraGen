terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

variable "gcp_project_id" {
  description = "The GCP project ID to deploy resources into."
  type        = string
}

resource "google_compute_global_address" "lb_ip" {
  name = "app-global-ip"
}

resource "google_compute_health_check" "http_hc" {
  name                = "app-health-check"
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 2
  http_health_check {
    port         = 80
    request_path = "/healthz"
  }
}

resource "google_compute_backend_service" "app_backend" {
  name                  = "app-backend-svc"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  health_checks         = [google_compute_health_check.http_hc.id]
  load_balancing_scheme = "EXTERNAL_MANAGED"
  enable_cdn            = false
}

resource "google_compute_url_map" "app_url_map" {
  name            = "app-web-map"
  default_service = google_compute_backend_service.app_backend.id
  description     = "Global URL Map load balancer routing"
}

resource "google_compute_target_http_proxy" "app_proxy" {
  name        = "app-target-proxy"
  url_map     = google_compute_url_map.app_url_map.id
  description = "Target HTTP Proxy for Application Load Balancer"
}

resource "google_compute_global_forwarding_rule" "app_fwd_rule" {
  name                  = "app-http-forwarding-rule"
  target                = google_compute_target_http_proxy.app_proxy.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_protocol           = "TCP"
}
