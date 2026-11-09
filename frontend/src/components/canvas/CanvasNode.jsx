import { useState, useMemo } from "react";
import { SettingsIcon, CopyIcon, TrashIcon, CheckIcon, getResourceBadgeIcon } from "../ui/Icons";
import { getProvider } from "../../config/providers.jsx";

/**
 * Validates whether a node has all its required schema fields filled.
 */
function isNodeConfigured(schema, values = {}) {
  if (!schema?.fields) return true;
  for (const field of schema.fields) {
    if (!field.required || field.uiOnly) continue;
    const val = values[field.key];
    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
      return false;
    }
  }
  return true;
}

/**
 * Derives a clean display title for the resource node (e.g. "Cost Budget", "EC2 Instance", "S3 Bucket").
 */
function getNodeDisplayTitle(node, schema) {
  if (schema.displayName) {
    return schema.displayName.replace(/^AWS\s+|^GCP\s+|^Azure\s+/i, "");
  }
  const type = String(node.resourceType || "").toLowerCase();
  if (type.includes("s3")) return "S3 Bucket";
  if (type.includes("ec2")) return "EC2 Instance";
  if (type.includes("vpc")) return "VPC";
  if (type.includes("subnet") && !type.includes("group")) return "Subnet";
  if (type.includes("lambda")) return "Lambda Function";
  if (type.includes("dynamo")) return "DynamoDB Table";
  if (type.includes("db-instance") || type.includes("rds")) return "RDS Database";
  if (type.includes("eks")) return "EKS Cluster";
  if (type.includes("ecs-cluster")) return "ECS Cluster";
  if (type.includes("ecs-service")) return "ECS Service";
  if (type.includes("ecs-task")) return "ECS Task Definition";
  if (type.includes("security-group")) return "Security Group";
  if (type.includes("sqs")) return "SQS Queue";
  if (type.includes("sns")) return "SNS Topic";
  if (type.includes("iam-role")) return "IAM Role";
  if (type.includes("iam-policy")) return "IAM Policy";
  if (type.includes("cloudtrail")) return "CloudTrail";
  if (type.includes("secretsmanager")) return "Secret";
  if (type.includes("budget")) return "Cost Budget";
  if (type.includes("lb") && !type.includes("listener") && !type.includes("target")) return "Load Balancer";
  return node.instanceName || node.resourceType || "Resource";
}

export default function CanvasNode({
  node,
  isSelected,
  onSelect,
  onOpenSettings,
  onDuplicate,
  onDelete,
  onStartConnect,
  onCompleteConnect,
  onNodeDragStart,
  isConnecting,
  isConnectSource,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const schema = node.schema || {};
  const isConfigured = useMemo(
    () => isNodeConfigured(schema, node.values),
    [schema, node.values]
  );

  // Cloud provider styling
  const pKey = schema.providerKey || (node.resourceType?.startsWith("gcp") ? "gcp" : node.resourceType?.startsWith("azure") ? "azure" : "aws");
  const provider = getProvider(pKey);

  const nodeBg = provider.nodeBg || "#FFF7ED";
  const nodeBorder = provider.nodeBorder || "#18181B";
  const badgeColor = provider.badgeColor || provider.color || "#EA580C";

  const displayTitle = getNodeDisplayTitle(node, schema);
  const subtitle = node.instanceName || schema.terraformType || node.resourceType;

  // Active droppable destination target when dragging a wire from another node
  const isDropTarget = isConnecting && !isConnectSource;

  function handleNodeMouseDown(e) {
    if (e.button !== 0) return; // Primary click only
    if (isDropTarget) {
      // In connection mode, mouse-down on target prepares to complete connection
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    onSelect(node.id);
    onNodeDragStart(e, node.id);
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    onOpenSettings(node);
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleNodeMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseUp={(e) => {
        if (isDropTarget) {
          e.stopPropagation();
          onCompleteConnect(node.id);
        }
      }}
      onClick={(e) => {
        if (isDropTarget) {
          e.stopPropagation();
          onCompleteConnect(node.id);
        } else {
          e.stopPropagation();
          onSelect(node.id);
        }
      }}
      title={isDropTarget ? "Release mouse or click to connect here" : ""}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: 224,
        height: 60,
        borderRadius: 12,
        background: isDropTarget
          ? isHovered
            ? "rgba(16, 185, 129, 0.15)"
            : "rgba(16, 185, 129, 0.06)"
          : nodeBg,
        border: isDropTarget
          ? isHovered
            ? "2px solid #10B981"
            : "2px dashed #10B981"
          : `1.6px solid ${nodeBorder}`,
        boxShadow: isDropTarget
          ? isHovered
            ? "0 0 20px rgba(16, 185, 129, 0.45)"
            : "0 0 10px rgba(16, 185, 129, 0.2)"
          : isSelected
          ? "0 0 0 2px #FFFFFF, 0 0 0 4px #18181B, 0 8px 18px -2px rgba(0, 0, 0, 0.12)"
          : isHovered
          ? "0 6px 14px -2px rgba(0, 0, 0, 0.08)"
          : "0 2px 5px -1px rgba(0, 0, 0, 0.04)",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease",
        userSelect: "none",
        cursor: isDropTarget ? "pointer" : "grab",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 10,
        zIndex: isSelected ? 12 : isDropTarget ? 11 : isHovered ? 9 : 4,
      }}
    >
      {/* ── Hover / Selected Action Bar Floating Above (Top-Right) ───────── */}
      <div
        style={{
          position: "absolute",
          top: -38,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "3px 6px",
          boxShadow: "var(--shadow-md)",
          opacity: (isHovered || isSelected) && !isConnecting ? 1 : 0,
          pointerEvents: (isHovered || isSelected) && !isConnecting ? "auto" : "none",
          transition: "opacity 0.18s ease, transform 0.18s ease, background var(--transition), border-color var(--transition)",
          transform: (isHovered || isSelected) && !isConnecting ? "translateY(0)" : "translateY(4px)",
          zIndex: 25,
          whiteSpace: "nowrap",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings(node);
          }}
          title="Configure settings (Double-Click / Enter)"
          style={actionBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <SettingsIcon size={14} color="var(--text)" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(node);
          }}
          title="Duplicate resource (Ctrl+C)"
          style={actionBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <CopyIcon size={14} color="var(--text)" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          title="Delete from canvas (Del)"
          style={{ ...actionBtnStyle, color: "var(--error, #EF4444)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--error-bg, #FEE2E2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <TrashIcon size={14} color="var(--error, #EF4444)" />
        </button>
      </div>

      {/* ── Left Connection Port (Input / Dependency Target) with Expanded 32px Hit Zone ── */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onCompleteConnect(node.id);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onCompleteConnect(node.id);
        }}
        title={isDropTarget ? "Release or click to connect here" : "Input port"}
        style={{
          position: "absolute",
          left: -16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDropTarget ? "pointer" : "default",
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: isDropTarget ? "#10B981" : "#FFFFFF",
            border: `2px solid ${isDropTarget ? "#10B981" : nodeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDropTarget ? "0 0 10px rgba(16, 185, 129, 0.8)" : "0 1px 3px rgba(0,0,0,0.12)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: isDropTarget ? "#FFFFFF" : nodeBorder,
            }}
          />
        </div>
      </div>

      {/* ── Right Connection Port (Output / Reference Source) with Expanded 32px Hit Zone ── */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnect(node.id, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onStartConnect(node.id, e);
        }}
        title="Drag wire or click to connect to dependent resource"
        style={{
          position: "absolute",
          right: -16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "crosshair",
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: isConnectSource ? badgeColor : "#FFFFFF",
            border: `2px solid ${isConnectSource ? badgeColor : nodeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isConnectSource ? `0 0 10px ${badgeColor}` : "0 1px 3px rgba(0,0,0,0.12)",
            transition: "transform 0.15s ease, border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.25)";
            e.currentTarget.style.borderColor = badgeColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.borderColor = isConnectSource ? badgeColor : nodeBorder;
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: isConnectSource ? "#FFFFFF" : badgeColor,
            }}
          />
        </div>
      </div>

      {/* ── Visual Anchor: Cloud Icon Badge ───────────────────────────────── */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: badgeColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}
      >
        {getResourceBadgeIcon(node, 18, "#FFFFFF")}
      </div>

      {/* ── Typography Column: Clean Title + Instance ID ──────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
          flex: 1,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#0F172A",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayTitle}
        </div>

        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--mono)",
            fontWeight: 500,
            color: "#64748B",
            lineHeight: 1.2,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* ── Status Indicator (Configured Check Dot) ───────────────────────── */}
      {isConfigured && !isDropTarget && (
        <span
          title="All required fields configured"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#10B981",
            flexShrink: 0,
            boxShadow: "0 0 4px rgba(16, 185, 129, 0.4)",
          }}
        />
      )}
    </div>
  );
}

const actionBtnStyle = {
  background: "transparent",
  border: "none",
  borderRadius: 5,
  padding: "4px 5px",
  color: "var(--text)",
  cursor: "pointer",
  transition: "background 0.15s ease",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};
