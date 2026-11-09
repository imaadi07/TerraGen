import { useState, useEffect, useMemo } from "react";
import DynamicForm from "../DynamicForm";
import { SettingsIcon, CloseIcon, RefreshIcon, CheckIcon, AlertIcon } from "../ui/Icons";

export default function ResourceConfigModal({
  isOpen,
  node,
  onClose,
  onSave,
  onResetDefaults,
  lockedFields = {},
}) {
  const [formData, setFormData] = useState({});
  const [instanceName, setInstanceName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("5.0");

  const schema = node?.schema || {};

  // Initialize draft values whenever a node opens
  useEffect(() => {
    if (node) {
      setFormData(node.values || {});
      setInstanceName(node.instanceName || "");
      setSelectedVersion(node.version || schema.version || "5.0");
    }
  }, [node, isOpen]);

  // Keyboard shortcut listener: Escape to close, Ctrl+Enter to save
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, formData, instanceName, selectedVersion]);

  // Count missing required fields (excluding canvas-locked fields)
  const missingCount = useMemo(() => {
    if (!schema.fields) return 0;
    let count = 0;
    for (const f of schema.fields) {
      if (!f.required || f.uiOnly) continue;
      if (lockedFields[f.key]?.isLocked) continue;
      const v = formData[f.key];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        count++;
      }
    }
    return count;
  }, [schema.fields, formData, lockedFields]);

  if (!isOpen || !node) return null;

  function handleSave() {
    onSave({
      ...node,
      instanceName: instanceName.trim() || node.instanceName,
      version: selectedVersion,
      values: formData,
    });
    onClose();
  }

  function handleReset() {
    const defaults = {};
    for (const field of schema.fields || []) {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      }
    }
    setFormData(defaults);
    if (onResetDefaults) onResetDefaults();
  }

  const accentColor = schema.color || (node.resourceType?.startsWith("gcp") ? "#4285F4" : "#FF9900");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 880,
          maxHeight: "90vh",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${accentColor}18`,
                border: `1.5px solid ${accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <SettingsIcon size={18} color={accentColor} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  {schema.displayName || node.resourceType}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                    background: "var(--surface-3)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    color: "var(--text-dim)",
                  }}
                >
                  {schema.terraformType}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Configure parameters and Terraform properties
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--mono)",
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "4px 8px",
                color: "var(--text-muted)",
              }}
            >
              v{selectedVersion}
            </span>

            <button
              type="button"
              onClick={onClose}
              title="Close dialog (Esc)"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-dim)",
                padding: 6,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* ── Instance Name Bar ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 24px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>
            Resource Identifier:
          </label>
          <input
            type="text"
            value={instanceName}
            onChange={(e) =>
              setInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))
            }
            placeholder="e.g. web_server_primary"
            style={{
              flex: 1,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 13,
              fontFamily: "var(--mono)",
              color: "var(--text)",
              fontWeight: 600,
              outline: "none",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>
            Terraform block name
          </span>
        </div>

        {/* ── Modal Body: Scrollable DynamicForm ─────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <DynamicForm
            schema={schema}
            formData={formData}
            setFormData={setFormData}
            lockedFields={lockedFields}
          />
        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshIcon size={13} />
              <span>Reset to Defaults</span>
            </button>

            {missingCount > 0 ? (
              <span
                style={{
                  fontSize: 12,
                  color: "#f59e0b",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <AlertIcon size={13} color="#f59e0b" />
                <span>{missingCount} required field{missingCount !== 1 ? "s" : ""} pending</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: "#10b981",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <CheckIcon size={13} color="#10b981" />
                <span>All required fields satisfied</span>
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{
                background: accentColor,
                border: "none",
                borderRadius: 8,
                padding: "8px 22px",
                fontSize: 13,
                fontWeight: 800,
                color: (node.resourceType?.startsWith("gcp") || node.resourceType?.startsWith("azure")) ? "#ffffff" : "#000000",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckIcon size={14} color={(node.resourceType?.startsWith("gcp") || node.resourceType?.startsWith("azure")) ? "#ffffff" : "#000000"} />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
