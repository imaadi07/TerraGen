import { useState, useEffect, useMemo, useCallback } from "react";
import { apiClient } from "../../services/api.service.js";
import { getProvider } from "../../config/providers.jsx";
import {
  ArrowLeftIcon,
  DollarIcon,
  CalendarIcon,
  DownloadIcon,
  CheckIcon,
  RefreshIcon,
  LightbulbIcon,
  TrendingDownIcon,
  ServerRackIcon,
  DatabaseIcon,
  NetworkIcon,
  StorageIcon,
} from "../ui/Icons";

const PRESET_DURATIONS = [
  { label: "1 Day (PoC)", days: 1 },
  { label: "7 Days (1 Week)", days: 7 },
  { label: "14 Days (Sprint)", days: 14 },
  { label: "30 Days (1 Month)", days: 30 },
  { label: "90 Days (Quarter)", days: 90 },
  { label: "180 Days", days: 180 },
  { label: "365 Days (1 Year)", days: 365 },
];

export default function CostEstimationPage({
  providerKey = "aws",
  nodes = [],
  terraform = "",
  initialDays = 30,
  onBackToOutput,
  onBackToCanvas,
}) {
  const provider = getProvider(providerKey);
  const [days, setDays] = useState(initialDays || 30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Fetch estimate from backend API
  const fetchEstimate = useCallback(
    async (targetDays) => {
      try {
        setLoading(true);
        setError(null);

        const payload = {
          provider: providerKey,
          nodes: (nodes || []).map((n) => ({
            id: n.id,
            resourceType: n.resourceType,
            instanceName: n.instanceName,
            values: n.values || {},
          })),
          terraform,
          days: targetDays,
        };

        const data = await apiClient.estimateCost(payload);
        setReport(data);
      } catch (err) {
        console.error("Cost estimation error:", err);
        setError(err.message || "Failed to calculate cloud cost estimate.");
      } finally {
        setLoading(false);
      }
    },
    [providerKey, nodes, terraform]
  );

  // Trigger calculation when days or inputs change
  useEffect(() => {
    fetchEstimate(days);
  }, [days, fetchEstimate]);

  function handleDaysSliderChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setDays(val);
    }
  }

  function handleDaysInputChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setDays(Math.max(1, Math.min(3650, val)));
    }
  }

  function handleExportJson() {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-estimate-${providerKey}-${days}days.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  }

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: Navigation Buttons & Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBackToOutput && (
            <button
              onClick={onBackToOutput}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Return to Generated Terraform HCL"
            >
              <ArrowLeftIcon size={16} />
              <span>Back to main.tf</span>
            </button>
          )}

          {onBackToCanvas && (
            <button
              onClick={onBackToCanvas}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Return to Canvas Studio"
            >
              <span>Canvas</span>
            </button>
          )}

          <div style={{ width: 1, height: 24, background: "var(--border)" }} />

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                Cloud Cost Estimation & Optimization
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: "var(--mono)",
                  background: provider.color,
                  color: providerKey === "aws" ? "#000" : "#fff",
                }}
              >
                {provider.name}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Interactive cost model based on generated Terraform resources and planned retention schedule
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => fetchEstimate(days)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <RefreshIcon size={15} />
            <span>{loading ? "Calculating..." : "Refresh"}</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={!report}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: downloadSuccess ? "#1a7f37" : "var(--surface-2)",
              border: `1px solid ${downloadSuccess ? "#1a7f37" : "var(--border)"}`,
              borderRadius: 8,
              color: downloadSuccess ? "#ffffff" : "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: report ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
            }}
          >
            {downloadSuccess ? <CheckIcon size={15} color="#fff" /> : <DownloadIcon size={15} />}
            <span>{downloadSuccess ? "Exported!" : "Export Estimate (JSON)"}</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Container ───────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: "28px 32px",
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Error message banner */}
        {error && (
          <div
            style={{
              padding: "14px 18px",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: 10,
              color: "var(--error)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Section 1: Interactive Retention Duration Controller ────────── */}
        <section
          style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(37, 99, 235, 0.12)",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarIcon size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  Planned Resource Retention Schedule
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  Adjust the duration you intend to keep these cloud resources active to view calculated expenses.
                </p>
              </div>
            </div>

            {/* Days Counter Display */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
                Keep Active:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "4px 8px",
                }}
              >
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={days}
                  onChange={handleDaysInputChange}
                  style={{
                    width: 60,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text)",
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>days</span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  fontFamily: "var(--mono)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "var(--surface-3)",
                }}
              >
                ({days * 24} hours)
              </span>
            </div>
          </div>

          {/* Slider */}
          <div style={{ marginBottom: 18 }}>
            <input
              type="range"
              min="1"
              max="365"
              step="1"
              value={Math.min(365, days)}
              onChange={handleDaysSliderChange}
              style={{
                width: "100%",
                height: 6,
                borderRadius: 4,
                accentColor: provider.color || "#2563eb",
                cursor: "pointer",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--mono)" }}>
              <span>1 Day</span>
              <span>30 Days (1 Month)</span>
              <span>90 Days (Quarter)</span>
              <span>180 Days</span>
              <span>365 Days (1 Year)</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginRight: 4 }}>
              Presets:
            </span>
            {PRESET_DURATIONS.map((preset) => {
              const isActive = days === preset.days;
              return (
                <button
                  key={preset.days}
                  onClick={() => setDays(preset.days)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: isActive ? "var(--text)" : "var(--surface-2)",
                    color: isActive ? "var(--bg)" : "var(--text)",
                    border: `1px solid ${isActive ? "var(--text)" : "var(--border)"}`,
                    transition: "all 0.15s ease",
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Section 2: Summary KPI Cards ─────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {/* Card 1: Total Period Cost for N Days */}
          <div
            style={{
              background: "var(--surface)",
              border: "1.5px solid #16a34a",
              borderRadius: 14,
              padding: "20px 24px",
              boxShadow: "0 4px 16px rgba(22, 163, 74, 0.08)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Estimated Total ({days} Days)
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "var(--text)",
                marginTop: 6,
                fontFamily: "var(--mono)",
                letterSpacing: "-0.02em",
              }}
            >
              ${report ? report.totalPeriodCost.toFixed(2) : "0.00"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Total projected run-cost for {days * 24} operational hours
            </div>
          </div>

          {/* Card 2: Hourly Rate */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Hourly Burn Rate
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--text)",
                marginTop: 6,
                fontFamily: "var(--mono)",
              }}
            >
              ${report ? report.totalHourlyRate.toFixed(4) : "0.0000"}
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginLeft: 4 }}>/hr</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Combined rate across all active resources
            </div>
          </div>

          {/* Card 3: Monthly Projected Cost (730 hrs) */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Monthly Projected Baseline
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--text)",
                marginTop: 6,
                fontFamily: "var(--mono)",
              }}
            >
              ${report ? report.totalMonthlyRate.toFixed(2) : "0.00"}
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginLeft: 4 }}>/mo</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Standard 730-hour monthly cycle
            </div>
          </div>

          {/* Card 4: Resource Composition */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Resource Breakdown
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--text)",
                marginTop: 6,
                fontFamily: "var(--mono)",
              }}
            >
              {report ? report.billableResourceCount : 0}
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-muted)", marginLeft: 4 }}>
                of {report ? report.totalResources : 0} Billable
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {(report?.totalResources || 0) - (report?.billableResourceCount || 0)} resources included free of charge
            </div>
          </div>
        </div>

        {/* ── Section 3: Itemized Resource Cost Breakdown ─────────────────── */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                Itemized Resource Breakdown
              </h2>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Unit hourly pricing and duration-calculated cost per infrastructure component
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              {report?.items?.length || 0} Components
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  <th style={{ padding: "14px 24px", fontWeight: 700 }}>Resource Identifier</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700 }}>Category</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700 }}>Configuration / Specs</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "right" }}>Hourly Rate</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "right" }}>Monthly (730h)</th>
                  <th style={{ padding: "14px 24px", fontWeight: 700, textAlign: "right" }}>
                    Cost for {days} Days
                  </th>
                </tr>
              </thead>
              <tbody>
                {report?.items?.map((item, index) => (
                  <tr
                    key={item.id || index}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: index % 2 === 0 ? "transparent" : "var(--surface-2)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Identifier */}
                    <td style={{ padding: "14px 24px" }}>
                      <div style={{ fontWeight: 800, color: "var(--text)", fontFamily: "var(--mono)" }}>
                        {item.instanceName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {item.resourceType}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "var(--surface-3)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    {/* Specs */}
                    <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: 12 }}>
                      {item.specs}
                    </td>

                    {/* Hourly */}
                    <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--text)" }}>
                      {item.hourlyRate > 0 ? `$${item.hourlyRate.toFixed(4)}` : "$0.0000"}
                    </td>

                    {/* Monthly */}
                    <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--text)" }}>
                      {item.monthlyRate > 0 ? `$${item.monthlyRate.toFixed(2)}` : "$0.00"}
                    </td>

                    {/* Period Cost */}
                    <td style={{ padding: "14px 24px", textAlign: "right", fontFamily: "var(--mono)" }}>
                      {item.isBillable ? (
                        <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 14 }}>
                          ${item.periodCost.toFixed(2)}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(34, 197, 94, 0.12)",
                            color: "#16a34a",
                          }}
                        >
                          Included / Free
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 4: Architecture & Cost Optimization Recommendations ── */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(234, 179, 8, 0.15)",
                color: "#ca8a04",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LightbulbIcon size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                Cost Optimization & Architectural Insights
              </h2>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Recommendations derived from AWS Well-Architected Framework, Azure Cloud Adoption Framework, and Google Cloud Architecture
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {report?.optimizationTips?.map((tip, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: tip.impact === "High" ? "rgba(239, 68, 68, 0.12)" : "rgba(59, 130, 246, 0.12)",
                        color: tip.impact === "High" ? "#dc2626" : "#2563eb",
                      }}
                    >
                      {tip.impact} Impact
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", fontFamily: "var(--mono)" }}>
                      {tip.estimatedSavings}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: "0 0 6px 0" }}>
                    {tip.title}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

