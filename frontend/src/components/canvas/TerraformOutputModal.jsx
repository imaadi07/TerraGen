import { useState } from "react";
import { LightningIcon, CopyIcon, CheckIcon, DownloadIcon, CloseIcon } from "../ui/Icons";

export default function TerraformOutputModal({
  isOpen,
  onClose,
  terraform,
  sortedNodes = [],
  providerKey,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  function handleCopy() {
    navigator.clipboard.writeText(terraform);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([terraform], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.tf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 900,
          maxHeight: "88vh",
          background: "#0d1117",
          border: "1px solid #30363d",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #30363d",
            background: "#161b22",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(88, 166, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LightningIcon size={18} color="#58a6ff" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e6edf3", margin: 0 }}>
                Generated Terraform Configuration (main.tf)
              </h2>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 2 }}>
                Resolved {sortedNodes.length} resource{sortedNodes.length !== 1 ? "s" : ""} in DAG dependency order
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: copied ? "#1a7f37" : "#238636",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
                transition: "background 0.15s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {copied ? (
                <>
                  <CheckIcon size={13} color="#ffffff" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon size={13} />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              style={{
                background: "#21262d",
                border: "1px solid #30363d",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "#c9d1d9",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <DownloadIcon size={13} />
              <span>Download main.tf</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#8b949e",
                cursor: "pointer",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        {/* ── Execution Order Sequence ──────────────────────────────────── */}
        {sortedNodes.length > 0 && (
          <div
            style={{
              padding: "10px 24px",
              background: "#12171f",
              borderBottom: "1px solid #21262d",
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              fontSize: 11,
              fontFamily: "var(--mono)",
            }}
          >
            <span style={{ color: "#8b949e", fontWeight: 700, flexShrink: 0 }}>
              DAG Order:
            </span>
            {sortedNodes.map((n, idx) => (
              <span key={n.id} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span
                  style={{
                    background: "#21262d",
                    color: "#58a6ff",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {idx + 1}. {n.instanceName} ({n.terraformType})
                </span>
                {idx < sortedNodes.length - 1 && (
                  <span style={{ color: "#484f58" }}>→</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* ── Code Display ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--mono)",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#c9d1d9",
              whiteSpace: "pre-wrap",
            }}
          >
            {terraform}
          </pre>
        </div>
      </div>
    </div>
  );
}

