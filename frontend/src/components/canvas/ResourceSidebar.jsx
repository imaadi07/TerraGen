import { useState, useMemo } from "react";
import { getProvider } from "../../config/providers.jsx";
import {
  ServerRackIcon,
  SearchIcon,
  CloseIcon,
  getResourceBadgeIcon,
  PackageIcon,
} from "../ui/Icons";

const CATEGORY_LABELS = {
  compute: "Compute",
  serverless: "Serverless",
  storage: "Storage",
  database: "Database",
  networking: "Networking",
  security: "Security",
  analytics: "Analytics",
  general: "General",
};

const CATEGORY_ORDER = [
  "compute",
  "serverless",
  "storage",
  "database",
  "networking",
  "security",
  "analytics",
  "general",
];

function sortCategories(cats) {
  return [...cats].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

function getCleanDisplayName(displayName) {
  if (!displayName) return "Resource";
  return displayName.replace(/^AWS\s+|^GCP\s+|^Azure\s+/i, "");
}

export default function ResourceSidebar({
  providerKey,
  resources = [],
  onAddResource,
  isCollapsed,
  onToggleCollapse,
}) {
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const provider = getProvider(providerKey);

  // Cloud-specific badge and border colors (generic & provider-driven)
  const badgeColor = provider.badgeColor || provider.color || "#FF9900";
  const nodeBorder = provider.nodeBorder || "#18181B";

  // Filter resources based on search query
  const filtered = useMemo(() => {
    if (!search.trim()) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.displayName?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.terraformType?.toLowerCase().includes(q)
    );
  }, [resources, search]);

  // Group resources by architectural category
  const grouped = useMemo(() => {
    const map = {};
    for (const r of filtered) {
      const cat = (r.category || r.terraformType?.split("_")[1] || "general").toLowerCase();
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    }
    return map;
  }, [filtered]);

  const categories = sortCategories(Object.keys(grouped));

  function toggleCategory(cat) {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  }

  // Collapsed Sidebar View
  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        title="Open Resource Palette"
        style={{
          width: 44,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          margin: "14px 0 14px 14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          cursor: "pointer",
          gap: 16,
          zIndex: 10,
          boxShadow: "var(--shadow-sm)",
          transition: "background var(--transition), border-color var(--transition)",
        }}
      >
        <ServerRackIcon size={18} color="var(--text-muted)" />
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 11,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "0.08em",
          }}
        >
          RESOURCES
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 300,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        margin: "14px 0 14px 14px",
        display: "flex",
        flexDirection: "column",
        height: "calc(100% - 28px)",
        zIndex: 10,
        flexShrink: 0,
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
        transition: "background var(--transition), border-color var(--transition)",
      }}
    >
      {/* ── Top Header & Collapse Toggle ───────────────────────────────── */}
      <div
        style={{
          padding: "12px 14px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: badgeColor,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
            {provider.shortLabel || provider.name} Palette
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: "var(--text-dim)",
              marginLeft: 2,
            }}
          >
            ({resources.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: "2px 6px",
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1,
            transition: "color var(--transition)",
          }}
        >
          «
        </button>
      </div>

      {/* ── Search Input ────────────────────────────────────────────────── */}
      <div style={{ padding: "0 14px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0 12px",
            height: 40,
            transition: "background var(--transition), border-color var(--transition)",
          }}
        >
          <SearchIcon size={16} color="var(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 500,
              outline: "none",
              fontFamily: "var(--sans)",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Containers List ──────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {categories.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: 13,
              marginTop: 40,
            }}
          >
            No resources match "{search}"
          </div>
        ) : (
          categories.map((cat) => {
            const isGroupCollapsed = Boolean(collapsedCategories[cat]);
            const label = CATEGORY_LABELS[cat] || cat;
            const items = grouped[cat];

            return (
              <div
                key={cat}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 10px",
                  background: "var(--surface-2)",
                  transition: "background var(--transition), border-color var(--transition)",
                }}
              >
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(cat)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "2px 4px 6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ServerRackIcon size={16} color="var(--text-muted)" />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--mono)",
                      color: "var(--text-dim)",
                    }}
                  >
                    {isGroupCollapsed ? `+${items.length}` : items.length}
                  </span>
                </div>

                {/* Resource Item Pills */}
                {!isGroupCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
                    {items.map((res) => {
                      const cleanName = getCleanDisplayName(res.displayName);

                      return (
                        <div
                          key={res.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/json", JSON.stringify(res));
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => onAddResource(res)}
                          title={`Drag to canvas or click to add ${cleanName}`}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "6px 10px",
                            cursor: "grab",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            transition: "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease",
                            userSelect: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                            e.currentTarget.style.background = "var(--surface-3)";
                            e.currentTarget.style.borderColor = "var(--border-strong)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.background = "var(--surface)";
                            e.currentTarget.style.borderColor = "var(--border)";
                          }}
                        >
                          {/* Cloud Provider Colored Square Icon Box */}
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: badgeColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {getResourceBadgeIcon(res, 16, "#FFFFFF")}
                          </div>

                          {/* Resource Name Label */}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              flex: 1,
                            }}
                          >
                            {cleanName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
