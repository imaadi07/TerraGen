import { BaseTerraformProvider } from "./base.provider.js";

const AZURE_OUTPUT_MAP = {
  azurerm_resource_group: [
    { attr: "id", desc: "The ID of the Resource Group." },
    { attr: "name", desc: "The name of the Resource Group." },
  ],
  azurerm_virtual_network: [
    { attr: "id", desc: "The ID of the Virtual Network." },
    { attr: "name", desc: "The name of the Virtual Network." },
    { attr: "address_space", desc: "The address space of the Virtual Network." },
  ],
  azurerm_subnet: [
    { attr: "id", desc: "The ID of the Subnet." },
    { attr: "name", desc: "The name of the Subnet." },
    { attr: "address_prefixes", desc: "The address prefixes of the Subnet." },
  ],
  azurerm_network_security_group: [
    { attr: "id", desc: "The ID of the Network Security Group." },
    { attr: "name", desc: "The name of the Network Security Group." },
  ],
  azurerm_public_ip: [
    { attr: "id", desc: "The ID of the Public IP." },
    { attr: "ip_address", desc: "The allocated IP address." },
  ],
  azurerm_network_interface: [
    { attr: "id", desc: "The ID of the Network Interface." },
    { attr: "private_ip_address", desc: "The private IP address of the Network Interface." },
  ],
  azurerm_linux_virtual_machine: [
    { attr: "id", desc: "The ID of the Linux Virtual Machine." },
    { attr: "private_ip_address", desc: "The primary private IP address of the Linux VM." },
    { attr: "public_ip_address", desc: "The primary public IP address of the Linux VM." },
  ],
  azurerm_windows_virtual_machine: [
    { attr: "id", desc: "The ID of the Windows Virtual Machine." },
    { attr: "private_ip_address", desc: "The primary private IP address of the Windows VM." },
    { attr: "public_ip_address", desc: "The primary public IP address of the Windows VM." },
  ],
  azurerm_kubernetes_cluster: [
    { attr: "id", desc: "The ID of the AKS Cluster." },
    { attr: "oidc_issuer_url", desc: "The OIDC issuer URL for Workload Identity." },
    { attr: "node_resource_group", desc: "The auto-generated Resource Group containing agent pool nodes." },
  ],
  azurerm_storage_account: [
    { attr: "id", desc: "The ID of the Storage Account." },
    { attr: "primary_blob_endpoint", desc: "The primary Blob service endpoint." },
  ],
  azurerm_storage_container: [
    { attr: "id", desc: "The ID of the Storage Container." },
    { attr: "name", desc: "The name of the Storage Container." },
  ],
  azurerm_mssql_server: [
    { attr: "id", desc: "The ID of the Microsoft SQL Server." },
    { attr: "fully_qualified_domain_name", desc: "The FQDN of the Microsoft SQL Server." },
  ],
  azurerm_mssql_database: [
    { attr: "id", desc: "The ID of the Microsoft SQL Database." },
    { attr: "name", desc: "The name of the Microsoft SQL Database." },
  ],
  azurerm_key_vault: [
    { attr: "id", desc: "The ID of the Key Vault." },
    { attr: "vault_uri", desc: "The URI of the Key Vault for key/secret operations." },
  ],
  azurerm_container_registry: [
    { attr: "id", desc: "The ID of the Azure Container Registry." },
    { attr: "login_server", desc: "The URL that can be used to log into the container registry." },
  ],
  azurerm_cosmosdb_account: [
    { attr: "id", desc: "The ID of the CosmosDB Account." },
    { attr: "endpoint", desc: "The endpoint used to connect to the CosmosDB Account." },
  ],
  azurerm_postgresql_flexible_server: [
    { attr: "id", desc: "The ID of the PostgreSQL Flexible Server." },
    { attr: "fqdn", desc: "The FQDN of the PostgreSQL Flexible Server." },
  ],
  azurerm_redis_cache: [
    { attr: "id", desc: "The ID of the Redis Cache." },
    { attr: "hostname", desc: "The Hostname of the Redis Instance." },
    { attr: "ssl_port", desc: "The SSL Port of the Redis Instance." },
  ],
  azurerm_service_plan: [
    { attr: "id", desc: "The ID of the App Service Plan." },
  ],
  azurerm_linux_web_app: [
    { attr: "id", desc: "The ID of the Linux Web App." },
    { attr: "default_hostname", desc: "The default hostname of the Linux Web App." },
  ],
  azurerm_linux_function_app: [
    { attr: "id", desc: "The ID of the Linux Function App." },
    { attr: "default_hostname", desc: "The default hostname of the Linux Function App." },
  ],
  azurerm_log_analytics_workspace: [
    { attr: "id", desc: "The ID of the Log Analytics Workspace." },
    { attr: "workspace_id", desc: "The Workspace (Customer) ID for the Log Analytics Workspace." },
  ],
  azurerm_application_insights: [
    { attr: "id", desc: "The ID of the Application Insights component." },
    { attr: "app_id", desc: "The App ID associated with this Application Insights component." },
  ],
  azurerm_user_assigned_identity: [
    { attr: "id", desc: "The ID of the User Assigned Identity." },
    { attr: "principal_id", desc: "The Principal ID of the User Assigned Identity." },
    { attr: "client_id", desc: "The Client ID of the User Assigned Identity." },
  ],
  azurerm_nat_gateway: [
    { attr: "id", desc: "The ID of the NAT Gateway." },
  ],
  azurerm_lb: [
    { attr: "id", desc: "The ID of the Load Balancer." },
  ],
  azurerm_private_endpoint: [
    { attr: "id", desc: "The ID of the Private Endpoint." },
  ],
  azurerm_dns_zone: [
    { attr: "id", desc: "The ID of the DNS Zone." },
    { attr: "name_servers", desc: "The list of name servers for the DNS Zone." },
  ],
  azurerm_dns_a_record: [
    { attr: "id", desc: "The ID of the DNS A Record." },
    { attr: "fqdn", desc: "The FQDN of the DNS A Record." },
  ],
};

export class AzureTerraformProvider extends BaseTerraformProvider {
  constructor() {
    super({
      key: "azurerm",
      name: "Microsoft Azure",
      source: "hashicorp/azurerm",
      defaultVersion: "4.0",
      resourceOutputMappings: AZURE_OUTPUT_MAP,
    });
  }

  getRequiredProvider(version) {
    const cleanVer = String(version || this.defaultVersion).trim().replace(/^v/i, "");
    const constraint = cleanVer.startsWith("3") ? "~> 3.80" : `~> ${cleanVer}`;
    return {
      source: this.source,
      version: constraint,
    };
  }

  getProviderBlock() {
    return [
      `provider "azurerm" {`,
      `  features {`,
      `    resource_group {`,
      `      prevent_deletion_if_contains_resources = false`,
      `    }`,
      `    key_vault {`,
      `      purge_soft_delete_on_destroy    = false`,
      `      recover_soft_deleted_key_vaults = true`,
      `    }`,
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
        name: "azure_location",
        type: "string",
        default: "eastus",
        description: "Target Azure region",
      },
    ];
  }

  getTfVars() {
    return [
      `environment    = "production"`,
      `azure_location = "eastus"`,
      ``,
    ].join("\n");
  }

  applyCustomHardening(schema, tfConfig) {
    const tType = schema?.terraformType;
    if (tType === "azurerm_storage_account") {
      if (!tfConfig.min_tls_version) tfConfig.min_tls_version = "TLS1_2";
    } else if (tType === "azurerm_mssql_server") {
      if (!tfConfig.minimum_tls_version) tfConfig.minimum_tls_version = "1.2";
    } else if (tType === "azurerm_postgresql_flexible_server") {
      if (!tfConfig.backup_retention_days) tfConfig.backup_retention_days = 7;
    } else if (tType === "azurerm_key_vault") {
      if (tfConfig.soft_delete_retention_days === undefined) tfConfig.soft_delete_retention_days = 90;
      if (tfConfig.purge_protection_enabled === undefined) tfConfig.purge_protection_enabled = false;
    }
    return tfConfig;
  }
}
