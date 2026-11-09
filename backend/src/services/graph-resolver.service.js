import { sanitizeTerraformName } from "../utils/naming.util.js";
import { getSchemaById } from "./schema-loader.service.js";

/**
 * Service to resolve an arbitrary Directed Acyclic Graph (DAG) of infrastructure resources,
 * topologically sort them (leaves/dependencies first), detect cycles, and bind reference outputs.
 */
export class GraphResolverService {
  /**
   * Resolves a canvas graph.
   *
   * @param {Array} nodes - Array of canvas nodes:
   *   [{ id: "node-1", resourceType: "aws-vpc", instanceName: "main_vpc", version: "5.0", values: {...} }]
   * @param {Array} edges - Array of connection edges:
   *   [{ id: "edge-1", source: "node-1", target: "node-2", sourceOutput: "id", targetField: "vpcId" }]
   * @returns {Object} { sortedNodes: [...], refMaps: { [nodeId]: { [fieldKey]: tfRef } } }
   */
  resolveGraph(nodes = [], edges = []) {
    if (!nodes || nodes.length === 0) {
      return { sortedNodes: [], refMaps: {} };
    }

    const nodeMap = new Map();
    const inDegree = new Map();
    const adjacencyList = new Map(); // sourceId -> array of targetIds
    const edgeBindings = new Map(); // targetId -> array of { sourceId, sourceOutput, targetField }

    // Initialize data structures
    for (const node of nodes) {
      nodeMap.set(node.id, node);
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
      edgeBindings.set(node.id, []);
    }

    // Process edges: source is the dependency, target is the dependent
    // e.g., VPC (source) -> Subnet (target)
    for (const edge of edges) {
      const { source, target } = edge;
      if (!nodeMap.has(source) || !nodeMap.has(target)) {
        continue;
      }

      // Add to adjacency list (source -> target means target depends on source)
      adjacencyList.get(source).push(target);
      inDegree.set(target, inDegree.get(target) + 1);

      edgeBindings.get(target).push(edge);
    }

    // Kahn's Algorithm for Topological Sort
    const queue = [];
    for (const [nodeId, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(nodeId);
      }
    }

    const sortedNodeIds = [];
    while (queue.length > 0) {
      const currentId = queue.shift();
      sortedNodeIds.push(currentId);

      for (const neighborId of adjacencyList.get(currentId)) {
        inDegree.set(neighborId, inDegree.get(neighborId) - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      }
    }

    // Cycle detection check
    if (sortedNodeIds.length !== nodes.length) {
      const cyclicNodes = nodes
        .filter((n) => inDegree.get(n.id) > 0)
        .map((n) => n.instanceName || n.resourceType || n.id)
        .join(", ");
      const error = new Error(
        `Circular dependency detected in infrastructure canvas graph involving: [${cyclicNodes}]. ` +
        `Dependencies must form a Directed Acyclic Graph (DAG).`
      );
      error.statusCode = 400;
      throw error;
    }

    // Build Terraform reference bindings for each node
    // refMaps: { [nodeId]: { [fieldKey]: "aws_subnet.my_subnet.id" } }
    const refMaps = {};
    const sortedNodes = [];

    for (const nodeId of sortedNodeIds) {
      const node = nodeMap.get(nodeId);
      const schema = getSchemaById(node.resourceType, node.version);

      if (!schema) {
        const err = new Error(
          `Schema not found for resourceType "${node.resourceType}" (version "${node.version || '5.0'}")`
        );
        err.statusCode = 404;
        throw err;
      }

      // Compute stable sanitized Terraform resource name
      const instanceName = sanitizeTerraformName(
        node.instanceName || `${schema.canvasType}_${node.id.slice(-4)}`
      );

      const nodeRefMap = {};
      const incomingEdges = edgeBindings.get(nodeId) || [];

      for (const edge of incomingEdges) {
        const sourceNode = nodeMap.get(edge.source);
        if (!sourceNode) continue;

        const sourceSchema = getSchemaById(sourceNode.resourceType, sourceNode.version);
        const sourceResourceName = sanitizeTerraformName(
          sourceNode.instanceName || `${sourceSchema.canvasType}_${sourceNode.id.slice(-4)}`
        );

        // Find dependency declaration in target schema matching source resource type
        const depDecl = (schema.dependencies || []).find(
          (d) => d.resourceType === sourceSchema.canvasType
        );

        const targetField = edge.targetField || depDecl?.linkField;
        if (!targetField) continue;

        let tfRef = null;
        if (depDecl && depDecl.tfOutputRef) {
          tfRef = depDecl.tfOutputRef.replace("{resourceName}", sourceResourceName);
        } else {
          // Default convention: e.g. aws_subnet.subnet_name.id or specified source output (arn, name, zone_id)
          const outputProp = edge.sourceOutput || depDecl?.sourceOutput || "id";
          tfRef = `${sourceSchema.terraformType}.${sourceResourceName}.${outputProp}`;
        }

        const isMulti = Boolean(depDecl?.isMulti);

        if (isMulti) {
          if (!nodeRefMap[targetField]) {
            nodeRefMap[targetField] = [tfRef];
          } else if (Array.isArray(nodeRefMap[targetField])) {
            if (!nodeRefMap[targetField].includes(tfRef)) {
              nodeRefMap[targetField].push(tfRef);
            }
          } else {
            nodeRefMap[targetField] = [nodeRefMap[targetField], tfRef];
          }
        } else {
          nodeRefMap[targetField] = tfRef;
        }
      }

      refMaps[node.id] = nodeRefMap;
      sortedNodes.push({
        ...node,
        instanceName,
        schema,
      });
    }

    return {
      sortedNodes,
      refMaps,
    };
  }
}

