import { AwsTerraformProvider } from "./aws.provider.js";
import { AzureTerraformProvider } from "./azure.provider.js";
import { GcpTerraformProvider } from "./gcp.provider.js";
import { BaseTerraformProvider } from "./base.provider.js";

const providers = {
  aws: new AwsTerraformProvider(),
  azure: new AzureTerraformProvider(),
  azurerm: new AzureTerraformProvider(),
  gcp: new GcpTerraformProvider(),
  google: new GcpTerraformProvider(),
};

/**
 * Get configured Terraform provider adapter.
 * If an unknown provider is passed, dynamically creates a BaseTerraformProvider instance on the go.
 *
 * @param {string} providerKey - e.g. "aws", "azure", "gcp"
 * @returns {BaseTerraformProvider}
 */
export function getTerraformProvider(providerKey = "aws") {
  const normalized = String(providerKey || "aws").toLowerCase().trim();
  if (providers[normalized]) {
    return providers[normalized];
  }

  // Dynamic fallback for any future provider without hardcoding
  return new BaseTerraformProvider({
    key: normalized,
    name: normalized.toUpperCase(),
    source: `hashicorp/${normalized}`,
    defaultVersion: "1.0",
  });
}

export {
  BaseTerraformProvider,
  AwsTerraformProvider,
  AzureTerraformProvider,
  GcpTerraformProvider,
};

