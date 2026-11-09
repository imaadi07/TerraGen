import { useState, useEffect, useMemo, useRef } from "react";
import { apiClient } from "../../services/api.service.js";
import { getProvider } from "../../config/providers.jsx";
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  DollarIcon,
  LayersIcon,
  EditIcon,
  RefreshIcon,
  FileCodeIcon,
  ArchiveIcon,
} from "../ui/Icons";

const TAB_CONFIG = [
  { key: "main.tf", label: "main.tf", role: "Resources" },
  { key: "variables.tf", label: "variables.tf", role: "Variables" },
  { key: "outputs.tf", label: "outputs.tf", role: "Outputs" },
  { key: "providers.tf", label: "providers.tf", role: "Providers" },
  { key: "terraform.tfvars", label: "terraform.tfvars", role: "Values" },
];

export default function TerraformOutputPage({
  providerKey = "aws",
  terraform = "",
  files = null,
  sortedNodes = [],
  onUpdateTerraform,
  onUpdateFiles,
  onBackToCanvas,
  onEstimateCost,
}) {
  const provider = getProvider(providerKey);

  // Initialize initial files map
  const initialFilesMap = useMemo(() => {
    return {
      "main.tf": files?.["main.tf"] || "",
      "variables.tf": files?.["variables.tf"] || "",
      "outputs.tf": files?.["outputs.tf"] || "",
      "providers.tf": files?.["providers.tf"] || "",
      "terraform.tfvars": files?.["terraform.tfvars"] || "",
    };
  }, [files]);

  const [activeTab, setActiveTab] = useState("main.tf");
  const [fileContents, setFileContents] = useState(initialFilesMap);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyAllCopied, setCopyAllCopied] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const textareaRef = useRef(null);

  // Sync state if props change from outside
  useEffect(() => {
    setFileContents(initialFilesMap);
  }, [initialFilesMap]);

  const activeContent = fileContents[activeTab] || "";
  const initialActiveContent = initialFilesMap[activeTab] || "";
  const isActiveDirty = activeContent !== initialActiveContent;

  const anyDirty = useMemo(() => {
    return Object.keys(initialFilesMap).some(
      (k) => (fileContents[k] || "") !== (initialFilesMap[k] || "")
    );
  }, [fileContents, initialFilesMap]);

  // Split lines for line-numbered view
  const lines = useMemo(() => {
    return (activeContent || "").split("\n");
  }, [activeContent]);

  function handleContentChange(val) {
    const updated = {
      ...fileContents,
      [activeTab]: val,
    };

    // Recombine HCL for cost calculator & parent state
    const combined = [
      (updated["providers.tf"] || "").trimEnd(),
      "",
      (updated["variables.tf"] || "").trimEnd(),
      "",
      (updated["main.tf"] || "").trimEnd(),
    ];
    if (updated["outputs.tf"] && updated["outputs.tf"].trim()) {
      combined.push(
        "",
        "# ------------------------------------------------------------------------------",
        "# Outputs",
        "# ------------------------------------------------------------------------------",
        "",
        updated["outputs.tf"].trimEnd()
      );
    }
    const recombinedHcl = combined.filter((p) => p !== undefined).join("\n") + "\n";

    setFileContents(updated);

    if (onUpdateFiles) {
      onUpdateFiles({
        "main.tf": updated["main.tf"],
        "variables.tf": updated["variables.tf"],
        "outputs.tf": updated["outputs.tf"],
        "providers.tf": updated["providers.tf"],
        "terraform.tfvars": updated["terraform.tfvars"],
      });
    }

    if (onUpdateTerraform) {
      onUpdateTerraform(recombinedHcl);
    }
  }

  function handleResetActive() {
    const reverted = {
      ...fileContents,
      [activeTab]: initialFilesMap[activeTab] || "",
    };
    setFileContents(reverted);

    if (onUpdateFiles) {
      onUpdateFiles(reverted);
    }

    if (onUpdateTerraform) {
      const combined = [
        (reverted["providers.tf"] || "").trimEnd(),
        "",
        (reverted["variables.tf"] || "").trimEnd(),
        "",
        (reverted["main.tf"] || "").trimEnd(),
      ];
      if (reverted["outputs.tf"] && reverted["outputs.tf"].trim()) {
        combined.push(
          "",
          "# ------------------------------------------------------------------------------",
          "# Outputs",
          "# ------------------------------------------------------------------------------",
          "",
          reverted["outputs.tf"].trimEnd()
        );
      }
      onUpdateTerraform(combined.filter((p) => p !== undefined).join("\n") + "\n");
    }
    setIsEditing(false);
  }

  function handleResetAll() {
    setFileContents(initialFilesMap);
    if (onUpdateFiles) onUpdateFiles(files);
    if (onUpdateTerraform) onUpdateTerraform(terraform);
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + "  " + val.substring(end);
      handleContentChange(updated);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }

  function handleCopyActive() {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  function handleCopyAll() {
    const allText = TAB_CONFIG
      .map((t) => `# === ${t.key} ===\n${fileContents[t.key] || ""}`)
      .join("\n\n");
    navigator.clipboard.writeText(allText);
    setCopyAllCopied(true);
    setTimeout(() => setCopyAllCopied(false), 2200);
  }

  function handleDownloadActiveFile() {
    const filename = activeTab;
    const blob = new Blob([activeContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadZip() {
    try {
      setIsDownloadingZip(true);
      const projectName = `${providerKey}-production-stack`;
      const blob = await apiClient.downloadZip({
        projectName,
        files: {
          "main.tf": fileContents["main.tf"] || "",
          "variables.tf": fileContents["variables.tf"] || "",
          "outputs.tf": fileContents["outputs.tf"] || "",
          "providers.tf": fileContents["providers.tf"] || "",
          "terraform.tfvars": fileContents["terraform.tfvars"] || "",
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ZIP archive:", err);
    } finally {
      setIsDownloadingZip(false);
    }
  }

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* ── Top Header Toolbar ──────────────────────────────────────────────── */}
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
        {/* Left: Back button & Breadcrumb Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Return to the Visual Canvas"
          >
            <ArrowLeftIcon size={16} />
            <span>Back to Canvas</span>
          </button>

          <div style={{ width: 1, height: 24, background: "var(--border)" }} />

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>
                Generated Terraform Configuration
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
              Resolved {sortedNodes.length} resource{sortedNodes.length !== 1 ? "s" : ""} in topological dependency order across 5 modular files
            </div>
          </div>
        </div>

        {/* Right: Actions (Edit, Reset, Copy, Download File, Download ZIP, Cost Calculator) */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Edit / Done Toggle Button */}
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 15px",
              background: isEditing ? "#238636" : "var(--surface-2)",
              border: `1px solid ${isEditing ? "#2ea043" : "var(--border)"}`,
              borderRadius: 8,
              color: isEditing ? "#ffffff" : "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title={isEditing ? `Finish editing ${activeTab}` : `Edit ${activeTab} in place`}
          >
            {isEditing ? <CheckIcon size={15} color="#fff" /> : <EditIcon size={15} />}
            <span>{isEditing ? `Done Editing` : `Edit ${activeTab}`}</span>
          </button>

          {/* Reset Active Button */}
          {isActiveDirty && (
            <button
              onClick={handleResetActive}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title={`Revert ${activeTab} to auto-generated code`}
            >
              <RefreshIcon size={14} />
              <span>Reset {activeTab}</span>
            </button>
          )}

          {/* Copy Active File */}
          <button
            onClick={handleCopyActive}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 15px",
              background: copied ? "#1a7f37" : "var(--surface-2)",
              border: `1px solid ${copied ? "#1a7f37" : "var(--border)"}`,
              borderRadius: 8,
              color: copied ? "#ffffff" : "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title={`Copy ${activeTab} contents`}
          >
            {copied ? <CheckIcon size={15} color="#fff" /> : <CopyIcon size={15} />}
            <span>{copied ? "Copied!" : `Copy ${activeTab}`}</span>
          </button>

          {/* Copy All Files */}
          <button
            onClick={handleCopyAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              background: copyAllCopied ? "#1a7f37" : "var(--surface-2)",
              border: `1px solid ${copyAllCopied ? "#1a7f37" : "var(--border)"}`,
              borderRadius: 8,
              color: copyAllCopied ? "#ffffff" : "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Copy all 5 modular files to clipboard"
          >
            {copyAllCopied ? <CheckIcon size={15} color="#fff" /> : <CopyIcon size={15} />}
            <span>{copyAllCopied ? "All Copied!" : "Copy All"}</span>
          </button>

          {/* Download Active File */}
          <button
            onClick={handleDownloadActiveFile}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 15px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title={`Download ${activeTab}`}
          >
            <DownloadIcon size={15} />
            <span>{activeTab}</span>
          </button>

          {/* Download All as ZIP */}
          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 800,
              cursor: isDownloadingZip ? "wait" : "pointer",
              transition: "all 0.15s ease",
            }}
            title="Download full multi-file project as a production-ready ZIP archive"
          >
            <ArchiveIcon size={16} />
            <span>{isDownloadingZip ? "Archiving..." : "Download ZIP"}</span>
          </button>

          {/* Cost Calculator CTA */}
          <button
            onClick={onEstimateCost}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              background: "#16a34a",
              border: "1px solid #15803d",
              borderRadius: 8,
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <DollarIcon size={16} color="#fff" />
            <span>Estimate Cost</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Multi-File Code Studio & DAG Sidebar ─────────────── */}
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          padding: "24px 32px",
          maxWidth: 1600,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Left Column: Multi-File Navigation Tabs + Code Area */}
        <section
          style={{
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          {/* Multi-File Tab Bar */}
          <div
            style={{
              background: "#161b22",
              borderBottom: "1px solid #30363d",
              padding: "4px 8px 0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              overflowX: "auto",
            }}
          >
            {/* File Tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {TAB_CONFIG.map((tab) => {
                const isActive = activeTab === tab.key;
                const tabDirty = (fileContents[tab.key] || "") !== (initialFilesMap[tab.key] || "");

                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setIsEditing(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      background: isActive ? "#0d1117" : "transparent",
                      borderTop: isActive ? `2px solid ${provider.color}` : "2px solid transparent",
                      borderLeft: isActive ? "1px solid #30363d" : "1px solid transparent",
                      borderRight: isActive ? "1px solid #30363d" : "1px solid transparent",
                      borderBottom: "none",
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                      color: isActive ? "#ffffff" : "#8b949e",
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      fontFamily: "var(--mono)",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      position: "relative",
                      top: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FileCodeIcon size={14} color={isActive ? provider.color : "#8b949e"} />
                    <span style={{ whiteSpace: "nowrap" }}>{tab.label}</span>
                    {tabDirty && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#e3b341",
                          display: "inline-block",
                        }}
                        title="File has unsaved edits"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Tab Controls: Edit status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 8 }}>
              {isActiveDirty && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                    color: "#e3b341",
                    background: "rgba(227, 179, 65, 0.12)",
                    border: "1px solid rgba(227, 179, 65, 0.35)",
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  edited
                </span>
              )}
              <span style={{ fontSize: 11, color: "#8b949e", fontFamily: "var(--mono)" }}>
                {isEditing ? "Editing Mode" : "Read-Only View"}
              </span>
            </div>
          </div>

          {/* Line-Numbered Code Content / Editor */}
          <div
            style={{
              padding: "16px 0",
              overflowX: "auto",
              flex: 1,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.6,
              display: "flex",
            }}
          >
            {isEditing ? (
              <div style={{ display: "flex", width: "100%", minHeight: 520 }}>
                {/* Synchronized Line Numbers for Editor */}
                <div
                  style={{
                    userSelect: "none",
                    textAlign: "right",
                    paddingRight: 18,
                    paddingLeft: 16,
                    color: "#484f58",
                    minWidth: 44,
                    fontSize: 12,
                    borderRight: "1px solid #21262d",
                    lineHeight: 1.6,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  }}
                >
                  {lines.map((_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>

                {/* Editable Code Textarea */}
                <textarea
                  ref={textareaRef}
                  value={activeContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  placeholder={`Write or edit ${activeTab} content...`}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: "#c9d1d9",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: "0 24px 0 16px",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre",
                    tabSize: 2,
                    boxSizing: "border-box",
                    minHeight: Math.max(lines.length * 21 + 40, 520),
                  }}
                />
              </div>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "auto" }}>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} style={{ verticalAlign: "top" }}>
                      <td
                        style={{
                          userSelect: "none",
                          textAlign: "right",
                          paddingRight: 18,
                          paddingLeft: 16,
                          color: "#484f58",
                          width: 44,
                          fontSize: 12,
                          borderRight: "1px solid #21262d",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          paddingLeft: 18,
                          paddingRight: 24,
                          whiteSpace: "pre",
                          color: "#c9d1d9",
                        }}
                      >
                        {formatLine(line)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Right Column: Execution Order & Cost Estimation Callout */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cost Estimation Banner Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1.5px solid #16a34a",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 4px 14px rgba(22, 163, 74, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(22, 163, 74, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                }}
              >
                <DollarIcon size={18} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                Cost Estimation
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Calculate hourly, monthly, and custom retention schedule expenses for these resources before provisioning.
            </p>
            <button
              onClick={onEstimateCost}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "#16a34a",
                border: "none",
                borderRadius: 8,
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s ease",
              }}
            >
              <DollarIcon size={15} color="#fff" />
              <span>Launch Cost Calculator</span>
            </button>
          </div>

          {/* DAG Topology Execution Order */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <LayersIcon size={16} color="var(--primary)" />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                DAG Provisioning Sequence
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px 0", lineHeight: 1.4 }}>
              Terraform will provision resources in this exact topological order to satisfy dependency references:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sortedNodes.map((node, index) => (
                <div
                  key={node.id || index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--surface-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text)",
                        fontFamily: "var(--mono)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={node.instanceName}
                    >
                      {node.instanceName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {node.resourceType}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

/**
 * Basic syntax highlighter helper for Terraform HCL lines.
 */
function formatLine(line) {
  if (!line || line.trim() === "") return " ";

  // Comment line
  if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
    return <span style={{ color: "#8b949e", fontStyle: "italic" }}>{line}</span>;
  }

  // Block declaration: resource "aws_instance" "web" {
  if (/^\s*(resource|provider|terraform|variable|output|data)\s+"/.test(line)) {
    const parts = line.split(/("(?:[^"\\]|\\.)*")/g);
    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return <span key={i} style={{ color: "#79c0ff" }}>{part}</span>;
      }
      return <span key={i} style={{ color: "#ff7b72", fontWeight: 700 }}>{part}</span>;
    });
  }

  // Key-value assignment: key = "value"
  if (line.includes("=")) {
    const eqIdx = line.indexOf("=");
    const key = line.slice(0, eqIdx);
    const rest = line.slice(eqIdx);
    return (
      <span>
        <span style={{ color: "#e6edf3" }}>{key}</span>
        <span style={{ color: "#79c0ff" }}>=</span>
        <span style={{ color: "#a5d6ff" }}>{rest.slice(1)}</span>
      </span>
    );
  }

  return line;
}
