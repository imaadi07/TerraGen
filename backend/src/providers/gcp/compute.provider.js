/**
 * File: backend/src/providers/gcp/compute.provider.js
 * GCP Compute provider with resilient offline defaults when credentials are not configured.
 */

import { google } from "googleapis";

function getProject() {
  return process.env.GOOGLE_CLOUD_PROJECT || "my-gcp-project";
}

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return auth.getClient();
}

const FALLBACK_ZONES = [
  { label: "us-central1-a (Iowa)", value: "us-central1-a" },
  { label: "us-central1-b (Iowa)", value: "us-central1-b" },
  { label: "us-central1-c (Iowa)", value: "us-central1-c" },
  { label: "us-central1-f (Iowa)", value: "us-central1-f" },
  { label: "us-east1-b (South Carolina)", value: "us-east1-b" },
  { label: "us-east1-c (South Carolina)", value: "us-east1-c" },
  { label: "us-west1-a (Oregon)", value: "us-west1-a" },
  { label: "europe-west1-b (Belgium)", value: "europe-west1-b" },
];

const FALLBACK_REGIONS = [
  { label: "us-central1 (Iowa)", value: "us-central1" },
  { label: "us-east1 (South Carolina)", value: "us-east1" },
  { label: "us-east4 (N. Virginia)", value: "us-east4" },
  { label: "us-west1 (Oregon)", value: "us-west1" },
  { label: "europe-west1 (Belgium)", value: "europe-west1" },
  { label: "asia-east1 (Taiwan)", value: "asia-east1" },
];

const FALLBACK_MACHINE_TYPES = [
  { label: "e2-micro (2 vCPU, 1 GB RAM Shared)", value: "e2-micro" },
  { label: "e2-small (2 vCPU, 2 GB RAM Shared)", value: "e2-small" },
  { label: "e2-medium (2 vCPU, 4 GB RAM Shared)", value: "e2-medium" },
  { label: "e2-standard-2 (2 vCPU, 8 GB RAM)", value: "e2-standard-2" },
  { label: "e2-standard-4 (4 vCPU, 16 GB RAM)", value: "e2-standard-4" },
  { label: "n2-standard-2 (2 vCPU, 8 GB RAM Intel)", value: "n2-standard-2" },
  { label: "n2-standard-4 (4 vCPU, 16 GB RAM Intel)", value: "n2-standard-4" },
  { label: "n2d-standard-2 (2 vCPU, 8 GB RAM AMD)", value: "n2d-standard-2" },
  { label: "c2-standard-4 (4 vCPU, 16 GB RAM Compute)", value: "c2-standard-4" },
];

const FALLBACK_IMAGES = [
  { label: "Debian 11 Bullseye (debian-cloud/debian-11)", value: "debian-cloud/debian-11" },
  { label: "Debian 12 Bookworm (debian-cloud/debian-12)", value: "debian-cloud/debian-12" },
  { label: "Ubuntu 22.04 LTS (ubuntu-os-cloud/ubuntu-2204-lts)", value: "ubuntu-os-cloud/ubuntu-2204-lts" },
  { label: "Ubuntu 24.04 LTS (ubuntu-os-cloud/ubuntu-2404-lts)", value: "ubuntu-os-cloud/ubuntu-2404-lts" },
  { label: "Rocky Linux 9 (rocky-linux-cloud/rocky-linux-9)", value: "rocky-linux-cloud/rocky-linux-9" },
  { label: "Windows Server 2022 Datacenter (windows-cloud/windows-2022)", value: "windows-cloud/windows-2022" },
];

export async function getZones() {
  try {
    const auth = await getAuthClient();
    const compute = google.compute({ version: "v1", auth });
    const response = await compute.zones.list({ project: getProject() });
    const zones = response.data.items || [];
    if (zones.length > 0) {
      return zones
        .filter((z) => z.status === "UP")
        .map((z) => ({ label: z.name, value: z.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch (_err) {
    // Offline fallback
  }
  return FALLBACK_ZONES;
}

export async function getRegions() {
  try {
    const auth = await getAuthClient();
    const compute = google.compute({ version: "v1", auth });
    const response = await compute.regions.list({ project: getProject() });
    const regions = response.data.items || [];
    if (regions.length > 0) {
      return regions
        .filter((r) => r.status === "UP")
        .map((r) => ({ label: r.name, value: r.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch (_err) {
    // Offline fallback
  }
  return FALLBACK_REGIONS;
}

export async function getMachineTypes(zone = "us-central1-a") {
  try {
    const auth = await getAuthClient();
    const compute = google.compute({ version: "v1", auth });
    const response = await compute.machineTypes.list({ project: getProject(), zone });
    const types = response.data.items || [];
    if (types.length > 0) {
      return types
        .map((t) => ({
          label: `${t.name} (${t.guestCpus} vCPU, ${Math.round(t.memoryMb / 1024)} GB RAM)`,
          value: t.name,
        }))
        .sort((a, b) => a.value.localeCompare(b.value));
    }
  } catch (_err) {
    // Offline fallback
  }
  return FALLBACK_MACHINE_TYPES;
}

export async function getImages() {
  try {
    const auth = await getAuthClient();
    const compute = google.compute({ version: "v1", auth });
    const imageProjects = ["ubuntu-os-cloud", "debian-cloud"];
    const results = [];
    for (const imageProject of imageProjects) {
      const response = await compute.images.list({ project: imageProject, maxResults: 10 });
      const images = response.data.items || [];
      results.push(
        ...images.map((img) => ({
          label: `${img.name} (${imageProject})`,
          value: `${imageProject}/${img.family || img.name}`,
        }))
      );
    }
    if (results.length > 0) {
      return results.sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch (_err) {
    // Offline fallback
  }
  return FALLBACK_IMAGES;
}

export async function getNetworks() {
  try {
    const auth = await getAuthClient();
    const compute = google.compute({ version: "v1", auth });
    const response = await compute.networks.list({ project: getProject() });
    const networks = response.data.items || [];
    if (networks.length > 0) {
      return networks.map((n) => ({ label: n.name, value: n.name }));
    }
  } catch (_err) {
    // Offline fallback
  }
  return [
    { label: "Connect VPC Network on canvas (Recommended)", value: "canvas-network" },
    { label: "default (projects/my-project/global/networks/default)", value: "default" },
  ];
}

export async function getSubnetworks(zone) {
  try {
    const auth = await getAuthClient();
    const compute = google.compute({ version: "v1", auth });
    let region = null;
    if (zone) {
      const parts = zone.split("-");
      if (parts.length >= 2) region = `${parts[0]}-${parts[1]}`;
    }
    const response = await compute.subnetworks.list({
      project: getProject(),
      region: region || "us-central1",
    });
    const subnets = response.data.items || [];
    if (subnets.length > 0) {
      return subnets.map((s) => ({
        label: `${s.name} (${s.ipCidrRange || ""})`,
        value: s.name,
      }));
    }
  } catch (_err) {
    // Offline fallback
  }
  return [
    { label: "Connect Subnetwork on canvas (Recommended)", value: "canvas-subnetwork" },
    { label: "default-subnet-us-central1 (10.128.0.0/20)", value: "default-subnet-us-central1" },
  ];
}
