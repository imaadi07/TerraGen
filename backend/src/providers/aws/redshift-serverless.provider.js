import {
  ListNamespacesCommand,
  RedshiftServerlessClient,
} from "@aws-sdk/client-redshift-serverless";

const client = new RedshiftServerlessClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const FALLBACK_NAMESPACES = [
  { label: "default-namespace (Redshift Serverless Default)", value: "default-namespace" },
  { label: "analytics-namespace (Analytics Workgroup)", value: "analytics-namespace" },
  { label: "prod-datawarehouse (Production DW)", value: "prod-datawarehouse" },
];

export async function getNamespaces() {
  try {
    const namespaces = [];
    let nextToken;

    do {
      const response = await client.send(
        new ListNamespacesCommand({ nextToken })
      );

      namespaces.push(...(response.namespaces || []));
      nextToken = response.nextToken;
    } while (nextToken);

    if (namespaces.length > 0) {
      return namespaces
        .map((item) => ({
          label: item.namespaceName,
          value: item.namespaceName,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch (_err) {
    // Offline fallback
  }

  return FALLBACK_NAMESPACES;
}
