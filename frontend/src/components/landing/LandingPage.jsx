import { useState } from "react";
import { getProvider } from "../../config/providers.jsx";
import {
  LayersIcon,
  DollarIcon,
  CpuChipIcon,
  LockIcon,
} from "../ui/Icons";

export default function LandingPage({
  providers = [],
  loading = false,
  error = null,
  onSelect,
}) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const providerDetails = {
    aws: {
      tagline: "Amazon Web Services",
      description: "Architect scalable compute, virtual private networks, EKS clusters, and managed databases with official AWS v5.0 schemas.",
      badge: "AWS",
      count: "50 Schemas",
    },
    azure: {
      tagline: "Microsoft Azure",
      description: "Build enterprise VNets, virtual machines, AKS clusters, and Azure SQL databases with official AzureRM schemas.",
      badge: "Azure",
      count: "35 Schemas",
    },
    gcp: {
      tagline: "Google Cloud Platform",
      description: "Compose global VPC topologies, Compute Engine instances, GKE, and load balancers with official Google Cloud v6.0 schemas.",
      badge: "GCP",
      count: "42 Schemas",
    },
  };

  const capabilities = [
    {
      title: "Visual Canvas Studio",
      icon: <LayersIcon size={18} color="var(--text)" />,
      description: "Drag-and-drop hardware connector ports with automated multi-link wire routing.",
    },
    {
      title: "Topological Compilation",
      icon: <CpuChipIcon size={18} color="var(--text)" />,
      description: "Kahn's topological sort orders declarations to prevent circular reference bugs.",
    },
    {
      title: "Cloud Cost Estimation",
      icon: <DollarIcon size={18} color="var(--text)" />,
      description: "Calculate hourly burn rates, monthly baselines, and custom retention schedule expenses.",
    },
    {
      title: "Offline Catalog Security",
      icon: <LockIcon size={18} color="var(--text)" />,
      description: "Generate verified Terraform code without exposing cloud credentials or API tokens.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* ── Unified Hero & Provider Hub (Single Cohesive View) ─────────────── */}
      <main
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "44px 32px 48px",
          width: "100%",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        {/* Compact, High-Impact Hero Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 20,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              marginBottom: 16,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#16a34a",
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--text)", fontWeight: 800 }}>TerraGen Studio</span>
            <span style={{ color: "var(--border-strong)" }}>|</span>
            <span>Multi-Cloud Infrastructure Generator</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4.2vw, 44px)",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: "0 0 12px 0",
            }}
          >
            Architect, Connect, and Generate Production Terraform
          </h1>

          <p
            style={{
              fontSize: "clamp(14px, 1.8vw, 16px)",
              color: "var(--text-muted)",
              lineHeight: 1.5,
              maxWidth: 680,
              margin: "0 auto",
            }}
          >
            Visual topology studio with automated dependency resolution, multi-version
            provider validation, and real-time cloud cost estimation.
          </p>
        </div>

        {/* ── 3 Cloud Provider Cards (High Contrast, Immediate Visibility) ── */}
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 48 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "3px solid var(--border)",
                borderTopColor: "var(--text)",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            Loading cloud provider schemas...
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: 24,
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: 12,
              color: "var(--error)",
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            <strong>Error connecting to backend API:</strong> {error}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
              marginBottom: 48,
            }}
          >
            {providers.map((key) => {
              const p = getProvider(key);
              const details = providerDetails[key] || {
                tagline: p.label,
                description: `Design production-ready infrastructure components for ${p.label}.`,
                badge: p.shortLabel,
                count: "Active",
              };
              const isHovered = hoveredCard === key;

              return (
                <div
                  key={key}
                  onMouseEnter={() => setHoveredCard(key)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => onSelect(key)}
                  style={{
                    background: "var(--surface)",
                    border: `1.5px solid ${isHovered ? p.color : "var(--border)"}`,
                    borderRadius: 14,
                    padding: "30px 28px 24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                    boxShadow: isHovered ? "var(--shadow-lg)" : "var(--shadow-sm)",
                    transform: isHovered ? "translateY(-3px)" : "none",
                  }}
                >
                  <div>
                    {/* Header: Brand Badge & Schema Count */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 20,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          background: p.color,
                          color: key === "aws" ? "#000000" : "#FFFFFF",
                        }}
                      >
                        {details.badge}
                      </span>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        {details.count}
                      </span>
                    </div>

                    {/* Provider Title */}
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "var(--text)",
                        margin: "0 0 10px 0",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {details.tagline}
                    </h2>

                    {/* Concise Summary */}
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {details.description}
                    </p>
                  </div>

                  {/* High-Contrast Interactive CTA Button */}
                  <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <button
                      type="button"
                      style={{
                        width: "100%",
                        padding: "11px 18px",
                        borderRadius: 8,
                        background: isHovered ? "var(--btn-hover-bg)" : "var(--btn-bg)",
                        color: "var(--btn-text)",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        cursor: "pointer",
                        transition: "all var(--transition)",
                        boxShadow: isHovered
                          ? "0 4px 12px rgba(0, 0, 0, 0.25)"
                          : "var(--shadow-sm)",
                      }}
                    >
                      <span>Open Visual Canvas</span>
                      <span style={{ fontSize: 14 }}>&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Compact Capabilities Strip ─────────────────────────────────── */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 36,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {capabilities.map((c, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {c.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 4px 0" }}>
                    {c.title}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, margin: 0 }}>
                    {c.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Minimalist Solid Footer ──────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "20px 32px",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, color: "var(--text)" }}>TerraGen Studio</span>
            <span>&bull;</span>
            <span>Multi-Cloud Infrastructure as Code Generator</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span>AWS Provider v5.0</span>
            <span>AzureRM v4.0</span>
            <span>Google Cloud v6.0</span>
            <span style={{ color: "var(--text)", fontWeight: 700, fontFamily: "var(--mono)" }}>
              127 Schemas
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
