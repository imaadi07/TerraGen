import { getProvider } from "../config/providers.jsx";
import { getCategoryIcon } from "./ui/Icons";

const CATEGORY_LABELS = {
  compute: "Compute & Containers",
  serverless: "Serverless & EDA",
  storage: "Storage",
  database: "Databases",
  networking: "Networking",
  security: "Security & IAM",
  analytics: "Analytics",
  general: "General Resources",
};

const CATEGORY_ORDER = [
  "compute",
  "serverless",
  "storage",
  "database",
  "networking",
  "security",
  "analytics",
  "general",
];

function sortCategories(cats) {
  return [...cats].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

export default function ResourceListPage({ providerKey, resources, onSelect }) {
  const provider = getProvider(providerKey);

  // Group resources by category
  const grouped = {};
  for (const r of resources) {
    const cat = (r.category || r.terraformType?.split("_")[1] || "general").toLowerCase();
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  }

  const categories = sortCategories(Object.keys(grouped));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px 80px" }}>
      {/* Page header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 40,
        flexWrap: "wrap",
      }}>
        {/* Provider badge */}
        <div style={{
          width: 52, height: 52,
          borderRadius: "50%",
          background: provider.bgColor,
          border: `2px solid ${provider.borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 16,
          color: provider.color,
          flexShrink: 0,
        }}>
          {providerKey.toUpperCase()}
        </div>

        <div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.5px",
            lineHeight: 1.2,
          }}>
            {provider.name} Resources
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            {resources.length} resource{resources.length !== 1 ? "s" : ""} available across {categories.length} categories — click one to configure
          </p>
        </div>
      </div>

      {/* Categorised grid */}
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 40 }}>
          {/* Category label */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)" }}>
              {getCategoryIcon(cat, 18)}
            </span>
            <h2 style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
            }}>
              {CATEGORY_LABELS[cat] || cat}
            </h2>
            <span style={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              background: "var(--surface-3)",
              color: "var(--text-dim)",
              padding: "1px 6px",
              borderRadius: 10,
            }}>
              {grouped[cat].length}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 16,
          }}>
            {grouped[cat].map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                provider={provider}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceCard({ resource, provider, onSelect }) {
  const versions = resource.versions || [resource.defaultVersion || "5.0"];

  return (
    <div
      onClick={() => onSelect(resource.id)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 22px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "all var(--transition)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = provider.color;
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          display: "inline-block",
          width: 8, height: 8,
          borderRadius: "50%",
          background: provider.color,
        }} />
        <span style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          color: "var(--text-dim)",
          background: "var(--surface-2)",
          padding: "2px 6px",
          borderRadius: 4,
          border: "1px solid var(--border)",
        }}>
          {resource.terraformType}
        </span>
      </div>

      <div style={{
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text)",
        lineHeight: 1.3,
      }}>
        {resource.displayName}
      </div>

      <div style={{
        fontSize: 12,
        color: "var(--text-dim)",
        fontFamily: "var(--mono)",
      }}>
        {resource.id}
      </div>

      {/* Version tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {versions.map((ver) => (
          <span
            key={ver}
            style={{
              fontSize: 10,
              fontFamily: "var(--mono)",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: ver === resource.defaultVersion ? `${provider.color}18` : "var(--surface-3)",
              color: ver === resource.defaultVersion ? provider.color : "var(--text-dim)",
              border: `1px solid ${ver === resource.defaultVersion ? `${provider.color}40` : "var(--border)"}`,
            }}
          >
            v{ver}
          </span>
        ))}
      </div>
    </div>
  );
}
