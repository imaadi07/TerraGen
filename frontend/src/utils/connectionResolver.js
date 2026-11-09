/**
 * Centralized Connection and Field Inheritance Resolver.
 * Decoupled, schema-driven, and unbiased for any resource or cloud provider.
 */

/**
 * Validates whether a proposed connection between source and target nodes is permissible.
 *
 * @param {Object} sourceNode - Node initiating the dependency.
 * @param {Object} targetNode - Node dependent on the source.
 * @param {Array} existingEdges - Array of current canvas edges.
 * @returns {Object} { allowed: boolean, reason?: string, targetField?: string, isMulti?: boolean }
 */
export function canConnectNodes(sourceNode, targetNode, existingEdges = []) {
  if (!sourceNode || !targetNode) {
    return { allowed: false, reason: "Invalid node selection." };
  }

  if (sourceNode.id === targetNode.id) {
    return { allowed: false, reason: "A resource cannot connect to itself." };
  }

  // Prevent exact duplicate wire between the same two nodes (in either direction)
  const isDuplicate = existingEdges.some(
    (e) =>
      (e.source === sourceNode.id && e.target === targetNode.id) ||
      (e.source === targetNode.id && e.target === sourceNode.id)
  );
  if (isDuplicate) {
    return { allowed: false, reason: "A connection between these resources already exists." };
  }

  // 1. Direct dependency: targetNode depends on sourceNode (e.g. VPC -> Subnet)
  const dependencies = targetNode.schema?.dependencies || [];
  const matchedDep = dependencies.find(
    (d) =>
      d.resourceType === sourceNode.resourceType ||
      d.terraformType === sourceNode.schema?.terraformType ||
      (d.resourceType && sourceNode.resourceType?.includes(d.resourceType))
  );

  let targetField = matchedDep?.linkField || "";
  let isMulti = Boolean(matchedDep?.isMulti);
  let inverted = false;

  // 2. Reverse dependency: sourceNode depends on targetNode (e.g. Subnet -> VPC)
  if (!matchedDep) {
    const reverseDependencies = sourceNode.schema?.dependencies || [];
    const reverseDep = reverseDependencies.find(
      (d) =>
        d.resourceType === targetNode.resourceType ||
        d.terraformType === targetNode.schema?.terraformType ||
        (d.resourceType && targetNode.resourceType?.includes(d.resourceType))
    );
    if (reverseDep) {
      targetField = reverseDep.linkField || "";
      isMulti = Boolean(reverseDep.isMulti);
      inverted = true;
    }
  }

  const effectiveTargetId = inverted ? sourceNode.id : targetNode.id;

  // If the dependency is single-select, check if another edge already binds this field
  if (targetField && !isMulti) {
    const existingBinding = existingEdges.find(
      (e) => e.target === effectiveTargetId && e.targetField === targetField
    );
    if (existingBinding) {
      return {
        allowed: true,
        replacesEdgeId: existingBinding.id,
        targetField,
        isMulti: false,
        inverted,
        reason: "Replaces existing single dependency connection.",
      };
    }
  }

  return {
    allowed: true,
    targetField,
    isMulti,
    inverted,
  };
}

/**
 * Resolves all incoming connection edges for a target node,
 * computing locked fields and inherited reference values.
 *
 * @param {Object} targetNode - Active canvas node.
 * @param {Array} allNodes - All nodes on the canvas.
 * @param {Array} allEdges - All edges on the canvas.
 * @returns {Object} { lockedFields: Object, inheritedValues: Object }
 */
export function resolveNodeConnections(targetNode, allNodes = [], allEdges = []) {
  if (!targetNode || !targetNode.schema) {
    return { lockedFields: {}, inheritedValues: {} };
  }

  const incomingEdges = allEdges.filter((e) => e.target === targetNode.id);
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const dependencies = targetNode.schema.dependencies || [];
  const schemaFields = targetNode.schema.fields || [];

  const lockedFields = {};
  const inheritedValues = {};

  for (const edge of incomingEdges) {
    const sourceNode = nodeMap.get(edge.source);
    if (!sourceNode) continue;

    // Find schema dependency definition
    const matchedDep = dependencies.find(
      (d) =>
        d.resourceType === sourceNode.resourceType ||
        d.terraformType === sourceNode.schema?.terraformType ||
        (d.resourceType && sourceNode.resourceType?.includes(d.resourceType))
    );

    const targetFieldKey = edge.targetField || matchedDep?.linkField;
    if (!targetFieldKey) continue;

    const fieldDef = schemaFields.find((f) => f.key === targetFieldKey);
    const isMulti =
      Boolean(matchedDep?.isMulti) ||
      fieldDef?.validation?.selectionMode === "multi" ||
      fieldDef?.type === "list" ||
      fieldDef?.type === "array";

    const sourceName = sourceNode.instanceName || sourceNode.id;
    const outputProp = edge.sourceOutput || matchedDep?.sourceOutput || "id";
    const sourceRef = matchedDep?.tfOutputRef
      ? matchedDep.tfOutputRef.replace("{resourceName}", sourceName)
      : `${sourceNode.schema?.terraformType || sourceNode.resourceType}.${sourceName}.${outputProp}`;

    const connectionInfo = {
      edgeId: edge.id,
      sourceNodeId: sourceNode.id,
      sourceInstanceName: sourceName,
      sourceDisplayName: sourceNode.schema?.displayName || sourceNode.resourceType,
      tfOutputRef: sourceRef,
      color: sourceNode.schema?.color || (sourceNode.resourceType?.startsWith("azure") ? "#0078D4" : sourceNode.resourceType?.startsWith("gcp") ? "#4285F4" : "#FF9900"),
    };

    if (!lockedFields[targetFieldKey]) {
      lockedFields[targetFieldKey] = {
        isLocked: true,
        isMulti,
        fieldKey: targetFieldKey,
        label: fieldDef?.label || targetFieldKey,
        sources: [connectionInfo],
      };
    } else {
      lockedFields[targetFieldKey].sources.push(connectionInfo);
    }
  }

  // Compute inherited values from locked fields
  for (const [key, lockInfo] of Object.entries(lockedFields)) {
    if (lockInfo.isMulti) {
      inheritedValues[key] = lockInfo.sources.map((s) => s.sourceInstanceName);
    } else {
      inheritedValues[key] = lockInfo.sources[0]?.sourceInstanceName || "";
    }
  }

  return {
    lockedFields,
    inheritedValues,
  };
}

