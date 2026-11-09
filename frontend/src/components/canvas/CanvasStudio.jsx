import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { apiClient } from "../../services/api.service.js";

import { getProvider } from "../../config/providers.jsx";
import ResourceSidebar from "./ResourceSidebar";
import CanvasNode from "./CanvasNode";
import ConnectionWires from "./ConnectionWires";
import ResourceConfigModal from "./ResourceConfigModal";
import TerraformOutputModal from "./TerraformOutputModal";
import { useCanvasKeyboard } from "../../hooks/useCanvasKeyboard";
import { canConnectNodes, resolveNodeConnections } from "../../utils/connectionResolver";
import {
  TerraformIcon,
  AlertIcon,
  CloseIcon,
  ArrowLeftIcon,
} from "../ui/Icons";

const NODE_WIDTH = 224;
const NODE_PORT_Y = 30;

// Schema cache to avoid re-fetching the same schema multiple times
const schemaCache = new Map();

/**
 * Extracts default values from a schema definition.
 */
function initFormData(schema) {
  const data = {};
  for (const field of schema?.fields || []) {
    if (field.default !== undefined) {
      data[field.key] = field.default;
    }
  }
  return data;
}

/**
 * Generates a unique, clean Terraform identifier for a new node.
 */
function generateUniqueInstanceName(resourceType, displayName, existingNodes) {
  const base = (displayName || resourceType)
    .toLowerCase()
    .replace(/^aws[-_]|^gcp[-_]/, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/^_+|_+$/g, "") || "resource";

  let candidate = base;
  let counter = 1;
  const existingNames = new Set(existingNodes.map((n) => n.instanceName));

  while (existingNames.has(candidate)) {
    counter++;
    candidate = `${base}_${counter}`;
  }
  return candidate;
}

export default function CanvasStudio({
  providerKey = "aws",
  onBack,
  onOpenOutput,
  initialNodes = [],
  initialEdges = [],
  onStateChange,
}) {
  const provider = getProvider(providerKey);

  // ── State ──────────────────────────────────────────────────────────────────
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [nodes, setNodes] = useState(initialNodes || []);
  const [edges, setEdges] = useState(initialEdges || []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  // Sync state changes with parent container if callback provided
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ nodes, edges });
    }
  }, [nodes, edges, onStateChange]);

  // Modals & Panels
  const [modalNode, setModalNode] = useState(null);
  const [generatedModal, setGeneratedModal] = useState({
    isOpen: false,
    terraform: "",
    sortedNodes: [],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [errorToast, setErrorToast] = useState(null);

  // Canvas Pan & Zoom
  const [pan, setPan] = useState({ x: 80, y: 80 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Live Wire Dragging
  const [dragWire, setDragWire] = useState(null);
  const dragWireRef = useRef(null);

  // Cancel connection wire on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && dragWireRef.current) {
        dragWireRef.current = null;
        setDragWire(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Node Dragging Ref
  const draggingNodeRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 6000);
    return () => clearTimeout(timer);
  }, [errorToast]);

  // ── Fetch Provider Resources on Mount ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function fetchResources() {
      try {
        setLoadingResources(true);
        const all = await apiClient.getResources();
        if (!isMounted) return;
        const filtered = all.filter((r) => r.provider === providerKey);
        setResources(filtered);
      } catch (err) {
        console.error("Failed to load resources:", err);
        setErrorToast("Failed to fetch available cloud resources.");
      } finally {
        if (isMounted) setLoadingResources(false);
      }
    }
    fetchResources();
    return () => {
      isMounted = false;
    };
  }, [providerKey]);

  // ── Coordinate Converter ───────────────────────────────────────────────────
  const screenToCanvas = useCallback(
    (clientX, clientY) => {
      if (!canvasRef.current) return { x: clientX, y: clientY };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // ── Load Schema Helper ─────────────────────────────────────────────────────
  const loadSchema = useCallback(async (resourceId, version = "5.0") => {
    const cacheKey = `${resourceId}@${version}`;
    if (schemaCache.has(cacheKey)) {
      return schemaCache.get(cacheKey);
    }
    try {
      const schemaData = await apiClient.getSchema(resourceId, version);
      schemaCache.set(cacheKey, schemaData);
      return schemaData;
    } catch (err) {
      console.error(`Failed to load schema for ${resourceId}:`, err);
      throw err;
    }
  }, []);

  // ── Create and Add Node ────────────────────────────────────────────────────
  const addNodeAtPosition = useCallback(
    async (resourceItem, canvasX, canvasY) => {
      try {
        const schema = await loadSchema(resourceItem.id);
        const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const instanceName = generateUniqueInstanceName(
          resourceItem.id,
          resourceItem.displayName,
          nodes
        );
        const newNode = {
          id: newNodeId,
          resourceType: resourceItem.id,
          instanceName,
          x: Math.round(canvasX - NODE_WIDTH / 2),
          y: Math.round(canvasY - 30),
          schema,
          values: initFormData(schema),
          version: schema.version || "5.0",
        };

        setNodes((prev) => [...prev, newNode]);
        setSelectedNodeId(newNodeId);
      } catch (err) {
        setErrorToast(`Could not load schema for ${resourceItem.displayName || resourceItem.id}`);
      }
    },
    [loadSchema, nodes]
  );

  // ── Drop Handler (from Dragging Sidebar Item) ───────────────────────────────
  function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleCanvasDrop(e) {
    e.preventDefault();
    const rawData = e.dataTransfer.getData("application/json");
    if (!rawData) return;
    try {
      const resourceItem = JSON.parse(rawData);
      const coords = screenToCanvas(e.clientX, e.clientY);
      addNodeAtPosition(resourceItem, coords.x, coords.y);
    } catch (err) {
      console.error("Drop parsing error:", err);
    }
  }

  // ── Click '+' in Sidebar Handler ───────────────────────────────────────────
  function handleAddFromSidebar(resourceItem) {
    const centerX = (-pan.x + 400) / zoom;
    const centerY = (-pan.y + 250) / zoom;
    addNodeAtPosition(resourceItem, centerX, centerY);
  }

  // ── Canvas Background Dragging (Pan) ───────────────────────────────────────
  function handleCanvasMouseDown(e) {
    if (e.target !== canvasRef.current && !e.target.classList?.contains("canvas-grid-bg")) {
      return;
    }
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  }

  useEffect(() => {
    function handleMouseMove(e) {
      // 1. Canvas Panning
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
      }

      // 2. Node Dragging
      if (draggingNodeRef.current) {
        const { nodeId, startMouseX, startMouseY, initialNodeX, initialNodeY } =
          draggingNodeRef.current;
        const dx = (e.clientX - startMouseX) / zoom;
        const dy = (e.clientY - startMouseY) / zoom;

        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  x: Math.round(initialNodeX + dx),
                  y: Math.round(initialNodeY + dy),
                }
              : n
          )
        );
      }

      // 3. Connection Wire Dragging
      if (dragWireRef.current) {
        const coords = screenToCanvas(e.clientX, e.clientY);
        const updated = { ...dragWireRef.current, currentX: coords.x, currentY: coords.y };
        dragWireRef.current = updated;
        setDragWire(updated);
      }
    }

    function handleMouseUp() {
      if (isPanning) setIsPanning(false);
      if (draggingNodeRef.current) draggingNodeRef.current = null;

      // Allow child onMouseUp / onCompleteConnect handlers to process first before clearing wire
      if (dragWireRef.current) {
        setTimeout(() => {
          if (dragWireRef.current) {
            dragWireRef.current = null;
            setDragWire(null);
          }
        }, 150);
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, zoom, dragWire, screenToCanvas]);

  // ── Mouse Wheel Zoom ───────────────────────────────────────────────────────
  function handleWheel(e) {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 40) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(Math.max(Number((prev * zoomFactor).toFixed(2)), 0.35), 2.2));
    }
  }

  // ── Node Actions (Hover Toolbar) ───────────────────────────────────────────
  const handleOpenSettings = useCallback(
    (node) => {
      // Resolve latest connections and inherit connected fields before opening modal
      const { inheritedValues } = resolveNodeConnections(node, nodes, edges);
      const updatedNode = {
        ...node,
        values: { ...(node.values || {}), ...inheritedValues },
      };
      setModalNode(updatedNode);
    },
    [nodes, edges]
  );

  const handleDuplicateNode = useCallback(
    (node) => {
      if (!node) return;
      const duplicatedId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const instanceName = generateUniqueInstanceName(
        node.resourceType,
        node.instanceName,
        nodes
      );

      const duplicatedNode = {
        ...node,
        id: duplicatedId,
        instanceName,
        x: node.x + 40,
        y: node.y + 40,
        values: JSON.parse(JSON.stringify(node.values || {})),
      };

      setNodes((prev) => [...prev, duplicatedNode]);
      setSelectedNodeId(duplicatedId);
    },
    [nodes]
  );

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }, []);

  const handleDeleteEdge = useCallback(
    (edgeId) => {
      const edgeToDelete = edges.find((e) => e.id === edgeId);
      const updatedEdges = edges.filter((e) => e.id !== edgeId);
      setEdges(updatedEdges);
      setSelectedEdgeId(null);

      if (edgeToDelete) {
        // Unlock and re-resolve target node values after wire removal
        const targetNode = nodes.find((n) => n.id === edgeToDelete.target);
        if (targetNode) {
          const { lockedFields, inheritedValues } = resolveNodeConnections(
            targetNode,
            nodes,
            updatedEdges
          );

          setNodes((prev) =>
            prev.map((n) => {
              if (n.id !== targetNode.id) return n;
              const nextValues = { ...(n.values || {}) };
              if (edgeToDelete.targetField && !lockedFields[edgeToDelete.targetField]) {
                delete nextValues[edgeToDelete.targetField];
              }
              return { ...n, values: { ...nextValues, ...inheritedValues } };
            })
          );
        }
      }
    },
    [edges, nodes]
  );

  // ── Node Drag Start ────────────────────────────────────────────────────────
  function handleNodeDragStart(e, nodeId) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    draggingNodeRef.current = {
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialNodeX: node.x,
      initialNodeY: node.y,
    };
  }

  // ── Connection Wire Handlers ───────────────────────────────────────────────
  function handleStartConnect(sourceId, e) {
    if (e) e.stopPropagation();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return;

    const startX = sourceNode.x + NODE_WIDTH;
    const startY = sourceNode.y + NODE_PORT_Y;
    const coords = e ? screenToCanvas(e.clientX, e.clientY) : { x: startX, y: startY };

    const wireData = {
      sourceId,
      startX,
      startY,
      currentX: coords.x,
      currentY: coords.y,
    };

    dragWireRef.current = wireData;
    setDragWire(wireData);
  }

  function handleCompleteConnect(targetId) {
    const activeWire = dragWireRef.current || dragWire;
    if (!activeWire) return;
    const { sourceId } = activeWire;

    // Immediately consume and clear wire to prevent race conditions or double connection
    dragWireRef.current = null;
    setDragWire(null);

    if (sourceId === targetId) return;

    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) return;

    // Centralized schema-driven connection check (supports bidirectional auto-detection)
    const check = canConnectNodes(sourceNode, targetNode, edges);
    if (!check.allowed) {
      setErrorToast(check.reason);
      return;
    }

    const effectiveSourceId = check.inverted ? targetId : sourceId;
    const effectiveTargetId = check.inverted ? sourceId : targetId;
    const effectiveTargetNode = check.inverted ? sourceNode : targetNode;

    const newEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      source: effectiveSourceId,
      target: effectiveTargetId,
      targetField: check.targetField || "",
    };

    let updatedEdges = check.replacesEdgeId
      ? edges.filter((e) => e.id !== check.replacesEdgeId)
      : [...edges];
    updatedEdges.push(newEdge);

    setEdges(updatedEdges);

    // Compute inherited values for target node and lock the connected field
    const { inheritedValues } = resolveNodeConnections(effectiveTargetNode, nodes, updatedEdges);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === effectiveTargetId
          ? { ...n, values: { ...(n.values || {}), ...inheritedValues } }
          : n
      )
    );
  }

  // Active modal locked fields resolution
  const activeModalConnections = useMemo(() => {
    if (!modalNode) return { lockedFields: {}, inheritedValues: {} };
    return resolveNodeConnections(modalNode, nodes, edges);
  }, [modalNode, nodes, edges]);

  // ── Hotkey Integration ─────────────────────────────────────────────────────
  useCanvasKeyboard({
    selectedNodeId,
    selectedEdgeId,
    nodes,
    onDuplicateNode: handleDuplicateNode,
    onDeleteNode: handleDeleteNode,
    onDeleteEdge: handleDeleteEdge,
    onOpenSettings: handleOpenSettings,
    onDeselectAll: () => {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setDragWire(null);
    },
    isModalOpen: !!modalNode || generatedModal.isOpen,
  });

  // ── Generate Terraform HCL from Graph ──────────────────────────────────────
  async function handleGenerateTerraform() {
    if (nodes.length === 0) {
      setErrorToast("Canvas is empty. Drag at least one resource onto the canvas first.");
      return;
    }

    try {
      setIsGenerating(true);
      setErrorToast(null);

      const payload = {
        provider: providerKey,
        nodes: nodes.map((n) => ({
          id: n.id,
          resourceType: n.resourceType,
          instanceName: n.instanceName,
          version: n.version || "5.0",
          values: n.values || {},
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          targetField: e.targetField,
        })),
      };

      const res = await apiClient.generateCanvas(payload);
      if (onOpenOutput) {
        onOpenOutput({
          terraform: res.terraform,
          files: res.files || null,
          sortedNodes: res.sortedNodes || [],
          nodes,
          edges,
        });
      } else {
        setGeneratedModal({
          isOpen: true,
          terraform: res.terraform,
          files: res.files || null,
          sortedNodes: res.sortedNodes || [],
        });
      }
    } catch (err) {
      console.error("Generation error:", err);
      const msg = err.message || "Failed to generate Terraform HCL.";
      setErrorToast(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Starter Architecture Templates ────────────────────────────────────────
  async function loadStarterTemplate(templateType = "3tier") {
    try {
      setLoadingResources(true);
      if (providerKey === "aws" && templateType === "serverless") {
        const [roleSchema, lambdaSchema, ddbSchema] = await Promise.all([
          loadSchema("aws-iam-role"),
          loadSchema("aws-lambda-function"),
          loadSchema("aws-dynamodb-table"),
        ]);

        const roleId = "node_aws_role_1";
        const lambdaId = "node_aws_lambda_1";
        const ddbId = "node_aws_ddb_1";

        const templateNodes = [
          {
            id: roleId,
            resourceType: "aws-iam-role",
            instanceName: "lambda_exec_role",
            x: 80,
            y: 120,
            schema: roleSchema,
            values: {
              ...initFormData(roleSchema),
              name: "lambda_execution_role",
              assumeRolePolicy: JSON.stringify(
                {
                  Version: "2012-10-17",
                  Statement: [
                    {
                      Action: "sts:AssumeRole",
                      Effect: "Allow",
                      Principal: { Service: "lambda.amazonaws.com" },
                    },
                  ],
                },
                null,
                2
              ),
            },
            version: "5.0",
          },
          {
            id: lambdaId,
            resourceType: "aws-lambda-function",
            instanceName: "order_processor",
            x: 460,
            y: 120,
            schema: lambdaSchema,
            values: {
              ...initFormData(lambdaSchema),
              functionName: "order_processor_service",
              runtime: "nodejs20.x",
              handler: "index.handler",
              role: "lambda_execution_role",
            },
            version: "5.0",
          },
          {
            id: ddbId,
            resourceType: "aws-dynamodb-table",
            instanceName: "orders_database",
            x: 840,
            y: 120,
            schema: ddbSchema,
            values: {
              ...initFormData(ddbSchema),
              name: "orders_store",
              billingMode: "PAY_PER_REQUEST",
              hashKey: "order_id",
            },
            version: "5.0",
          },
        ];

        const templateEdges = [
          { id: "edge_role_lambda", source: roleId, target: lambdaId, targetField: "role" },
        ];

        setNodes(templateNodes);
        setEdges(templateEdges);
      } else if (providerKey === "aws") {
        const [vpcSchema, subnetSchema, ec2Schema] = await Promise.all([
          loadSchema("aws-vpc"),
          loadSchema("aws-subnet"),
          loadSchema("aws-ec2"),
        ]);

        const vpcId = "node_aws_vpc_1";
        const subnetId = "node_aws_subnet_1";
        const ec2Id = "node_aws_ec2_1";

        const templateNodes = [
          {
            id: vpcId,
            resourceType: "aws-vpc",
            instanceName: "main_vpc",
            x: 80,
            y: 120,
            schema: vpcSchema,
            values: { ...initFormData(vpcSchema), cidrBlock: "10.0.0.0/16" },
            version: "5.0",
          },
          {
            id: subnetId,
            resourceType: "aws-subnet",
            instanceName: "public_subnet",
            x: 440,
            y: 120,
            schema: subnetSchema,
            values: {
              ...initFormData(subnetSchema),
              cidrBlock: "10.0.1.0/24",
              vpcId: "main_vpc",
            },
            version: "5.0",
          },
          {
            id: ec2Id,
            resourceType: "aws-ec2",
            instanceName: "web_server",
            x: 800,
            y: 120,
            schema: ec2Schema,
            values: {
              ...initFormData(ec2Schema),
              ami: "ami-0c55b159cbfafe1f0",
              instanceType: "t3.micro",
              subnetId: "public_subnet",
            },
            version: "5.0",
          },
        ];

        const templateEdges = [
          { id: "edge_vpc_subnet", source: vpcId, target: subnetId, targetField: "vpcId" },
          { id: "edge_subnet_ec2", source: subnetId, target: ec2Id, targetField: "subnetId" },
        ];

        setNodes(templateNodes);
        setEdges(templateEdges);
      } else {
        const [netSchema, subSchema, vmSchema] = await Promise.all([
          loadSchema("gcp-compute-network"),
          loadSchema("gcp-compute-subnetwork"),
          loadSchema("gcp-compute-instance"),
        ]);

        const netId = "node_gcp_net_1";
        const subId = "node_gcp_sub_1";
        const vmId = "node_gcp_vm_1";

        const templateNodes = [
          {
            id: netId,
            resourceType: "gcp-compute-network",
            instanceName: "custom_network",
            x: 80,
            y: 120,
            schema: netSchema,
            values: { ...initFormData(netSchema), name: "prod-network", autoCreateSubnetworks: false },
            version: "5.0",
          },
          {
            id: subId,
            resourceType: "gcp-compute-subnetwork",
            instanceName: "app_subnet",
            x: 440,
            y: 120,
            schema: subSchema,
            values: {
              ...initFormData(subSchema),
              name: "prod-subnetwork",
              ipCidrRange: "10.10.0.0/20",
              region: "us-central1",
              network: "custom_network",
            },
            version: "5.0",
          },
          {
            id: vmId,
            resourceType: "gcp-compute-instance",
            instanceName: "app_instance",
            x: 800,
            y: 120,
            schema: vmSchema,
            values: {
              ...initFormData(vmSchema),
              name: "prod-vm",
              machineType: "e2-medium",
              zone: "us-central1-a",
              bootDiskImage: "debian-cloud/debian-11",
              subnetwork: "app_subnet",
            },
            version: "5.0",
          },
        ];

        const templateEdges = [
          { id: "edge_net_sub", source: netId, target: subId, targetField: "network" },
          { id: "edge_sub_vm", source: subId, target: vmId, targetField: "subnetwork" },
        ];

        setNodes(templateNodes);
        setEdges(templateEdges);
      }
    } catch (err) {
      console.error(err);
      setErrorToast("Failed to load starter architecture template.");
    } finally {
      setLoadingResources(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "calc(100vh - var(--nav-h))",
        overflow: "hidden",
        position: "relative",
        background: "var(--bg)",
      }}
    >
      {/* ── Left Sidebar (Resource Palette) ─────────────────────────────────── */}
      <ResourceSidebar
        providerKey={providerKey}
        resources={resources}
        onAddResource={handleAddFromSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* ── Main Canvas Viewport ───────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="canvas-grid-bg"
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{
          flex: 1,
          height: "100%",
          position: "relative",
          overflow: "hidden",
          cursor: isPanning ? "grabbing" : "default",
          backgroundColor: "var(--bg)",
          backgroundImage: `radial-gradient(circle, var(--border) 1.2px, transparent 1.2px)`,
          backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* ── Floating Top Control Bar ───────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 20,
            right: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pointerEvents: "none",
            zIndex: 30,
            gap: 12,
          }}
        >
          {/* Left Controls: Back button & Breadcrumb / Provider info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              pointerEvents: "auto",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "6px 14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <button
              type="button"
              onClick={onBack}
              title="Return to Cloud Provider Selection"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-muted)",
                padding: "4px 6px",
                borderRadius: 6,
                transition: "color 0.15s",
              }}
            >
              <ArrowLeftIcon size={14} />
              <span>Providers</span>
            </button>

            <span style={{ color: "var(--border)", fontWeight: 300 }}>|</span>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: provider.color,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                {provider.name} Studio
              </span>
            </div>

            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--mono)",
                background: "var(--surface-2)",
                padding: "2px 8px",
                borderRadius: 10,
                color: "var(--text-muted)",
              }}
            >
              {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {edges.length} {edges.length === 1 ? "wire" : "wires"}
            </div>
          </div>

          {/* Right Controls: Zoom, Clear, & Generate Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              pointerEvents: "auto",
            }}
          >
            {/* Zoom Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.35))}
                title="Zoom Out"
                style={{
                  background: "transparent",
                  border: "none",
                  borderRight: "1px solid var(--border)",
                  padding: "7px 11px",
                  cursor: "pointer",
                  color: "var(--text)",
                  fontWeight: 700,
                }}
              >
                −
              </button>
              <span
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 80, y: 80 });
                }}
                title="Reset View"
                style={{
                  padding: "0 10px",
                  fontSize: 12,
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(Number((z + 0.1).toFixed(2)), 2.2))}
                title="Zoom In"
                style={{
                  background: "transparent",
                  border: "none",
                  borderLeft: "1px solid var(--border)",
                  padding: "7px 11px",
                  cursor: "pointer",
                  color: "var(--text)",
                  fontWeight: 700,
                }}
              >
                +
              </button>
            </div>

            {/* Clear Button */}
            {nodes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all resources from the canvas?")) {
                    setNodes([]);
                    setEdges([]);
                    setSelectedNodeId(null);
                  }
                }}
                title="Clear Canvas"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Clear
              </button>
            )}

            {/* Generate Terraform Button */}
            <button
              type="button"
              onClick={handleGenerateTerraform}
              disabled={isGenerating || nodes.length === 0}
              style={{
                background:
                  nodes.length === 0
                    ? "var(--surface-2)"
                    : "#16a34a",
                border: "none",
                borderRadius: 10,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 800,
                color: nodes.length === 0 ? "var(--text-dim)" : "#ffffff",
                cursor: nodes.length === 0 || isGenerating ? "not-allowed" : "pointer",
                boxShadow:
                  nodes.length === 0 ? "none" : "0 4px 14px rgba(16, 185, 129, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.18s ease",
              }}
            >
              <TerraformIcon size={16} color={nodes.length === 0 ? "var(--text-dim)" : "#ffffff"} />
              <span>{isGenerating ? "Resolving DAG..." : "Generate Terraform"}</span>
            </button>
          </div>
        </div>

        {/* ── Error Toast Alert ──────────────────────────────────────────────── */}
        {errorToast && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#b91c1c",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <AlertIcon size={16} color="#ffffff" />
            <span>{errorToast}</span>
            <button
              type="button"
              onClick={() => setErrorToast(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
              }}
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}

        {/* ── Empty State Tip ────────────────────────────────────────────────── */}
        {nodes.length === 0 && !loadingResources && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
              userSelect: "none",
              maxWidth: 420,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: "var(--surface-2)",
                border: "1px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--text-muted)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="16" y="2" width="6" height="6" rx="1" />
                <rect x="9" y="16" width="6" height="6" rx="1" />
                <path d="M5 8v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                <line x1="12" y1="12" x2="12" y2="16" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>
              Your Infrastructure Canvas is Empty
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              Drag resources from the left palette onto the canvas, connect dependencies with wires,
              and click <strong>Generate Terraform</strong>.
            </p>
          </div>
        )}

        {/* ── Scaled & Panned Canvas Workspace Surface ───────────────────────── */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {/* Connection Wires Layer */}
          <ConnectionWires
            edges={edges}
            nodes={nodes}
            onDeleteEdge={handleDeleteEdge}
            dragWire={dragWire}
          />

          {/* Canvas Nodes Layer */}
          {nodes.map((node) => (
            <div key={node.id} style={{ pointerEvents: "auto" }}>
              <CanvasNode
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={setSelectedNodeId}
                onOpenSettings={handleOpenSettings}
                onDuplicate={handleDuplicateNode}
                onDelete={handleDeleteNode}
                onStartConnect={handleStartConnect}
                onCompleteConnect={handleCompleteConnect}
                onNodeDragStart={handleNodeDragStart}
                isConnecting={!!dragWire}
                isConnectSource={dragWire?.sourceId === node.id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Configuration Settings Popup Modal ─────────────────────────────── */}
      <ResourceConfigModal
        isOpen={!!modalNode}
        node={modalNode}
        lockedFields={activeModalConnections.lockedFields}
        onClose={() => setModalNode(null)}
        onSave={(updatedNode) => {
          setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
          setModalNode(null);
        }}
        onResetDefaults={() => {
          if (modalNode) {
            setNodes((prev) =>
              prev.map((n) =>
                n.id === modalNode.id
                  ? { ...n, values: initFormData(modalNode.schema) }
                  : n
              )
            );
          }
        }}
      />

      {/* ── Terraform Generation Output Modal ──────────────────────────────── */}
      <TerraformOutputModal
        isOpen={generatedModal.isOpen}
        onClose={() =>
          setGeneratedModal({ isOpen: false, terraform: "", sortedNodes: [] })
        }
        terraform={generatedModal.terraform}
        sortedNodes={generatedModal.sortedNodes}
        providerKey={providerKey}
      />
    </div>
  );
}
