import { useState } from "react";

export default function ConnectionWires({
  edges = [],
  nodes = [],
  onDeleteEdge,
  dragWire = null,
}) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const nodeMap = new Map();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Node dimensions matching CanvasNode.jsx
  const NODE_WIDTH = 224;
  const NODE_PORT_Y = 30; // Vertical center of 60px high node

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 3,
        overflow: "visible",
      }}
    >
      <defs>
        {/* Standard crisp black wire arrowhead from wireframe screenshot */}
        <marker
          id="wireArrow"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#18181B" />
        </marker>

        {/* Hover delete state arrowhead */}
        <marker
          id="wireArrowHover"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--error, #EF4444)" />
        </marker>

        <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── Established Connection Wires ─────────────────────────────────── */}
      {edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) return null;

        const x1 = sourceNode.x + NODE_WIDTH;
        const y1 = sourceNode.y + NODE_PORT_Y;
        const x2 = targetNode.x;
        const y2 = targetNode.y + NODE_PORT_Y;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = Math.max(Math.abs(x2 - x1) * 0.45, 30);

        const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        const isHovered = hoveredEdgeId === edge.id;

        return (
          <g
            key={edge.id}
            onMouseEnter={() => setHoveredEdgeId(edge.id)}
            onMouseLeave={() => setHoveredEdgeId(null)}
            style={{ pointerEvents: "all", cursor: "pointer" }}
          >
            {/* Invisible thick path for easy mouse hover detection */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={22}
            />

            {/* Glowing background stroke on hover */}
            {isHovered && (
              <path
                d={pathD}
                fill="none"
                stroke="var(--error, #EF4444)"
                strokeWidth={5}
                opacity={0.4}
                filter="url(#wireGlow)"
              />
            )}

            {/* Visual wire path with arrowhead pointing into target port */}
            <path
              d={pathD}
              fill="none"
              stroke={isHovered ? "var(--error, #EF4444)" : "#18181B"}
              strokeWidth={isHovered ? 2.5 : 2.2}
              markerEnd={isHovered ? "url(#wireArrowHover)" : "url(#wireArrow)"}
              strokeDasharray={isHovered ? "6 4" : "none"}
              style={{ transition: "stroke 0.15s, stroke-width 0.15s" }}
            />

            {/* Midpoint Delete Handle on Hover */}
            {isHovered && (
              <g
                transform={`translate(${midX}, ${midY})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEdge(edge.id);
                }}
              >
                <circle
                  r={11}
                  fill="#FFFFFF"
                  stroke="var(--error, #EF4444)"
                  strokeWidth={1.8}
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
                />
                <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="var(--error, #EF4444)" strokeWidth="2" strokeLinecap="round" />
                <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="var(--error, #EF4444)" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}

      {/* ── Live Dragging Connection Wire ─────────────────────────────────── */}
      {dragWire && (
        <path
          d={`M ${dragWire.startX} ${dragWire.startY} C ${
            dragWire.startX + Math.max(Math.abs(dragWire.currentX - dragWire.startX) * 0.45, 30)
          } ${dragWire.startY}, ${
            dragWire.currentX - Math.max(Math.abs(dragWire.currentX - dragWire.startX) * 0.45, 30)
          } ${dragWire.currentY}, ${dragWire.currentX} ${dragWire.currentY}`}
          fill="none"
          stroke="#18181B"
          strokeWidth={2}
          strokeDasharray="5 4"
          markerEnd="url(#wireArrow)"
          opacity={0.85}
        />
      )}
    </svg>
  );
}
