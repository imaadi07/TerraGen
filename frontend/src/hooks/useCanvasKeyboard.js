import { useEffect } from "react";

export function useCanvasKeyboard({
  selectedNodeId,
  selectedEdgeId,
  nodes,
  onDuplicateNode,
  onDeleteNode,
  onDeleteEdge,
  onOpenSettings,
  onDeselectAll,
  isModalOpen,
}) {
  useEffect(() => {
    // If a popup form modal is open, let the modal handle its own keys
    if (isModalOpen) return;

    function handleKeyDown(e) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        document.activeElement?.isContentEditable;

      if (isInputFocused) return;

      // ── Duplicate (Ctrl+C, Cmd+C, or Ctrl+D) ───────────────────────────
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "d" || e.key === "D")) {
        if (selectedNodeId) {
          e.preventDefault();
          const node = nodes.find((n) => n.id === selectedNodeId);
          if (node) {
            onDuplicateNode(node);
          }
        }
      }

      // ── Delete (Delete or Backspace) ────────────────────────────────────
      else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          e.preventDefault();
          onDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          onDeleteEdge(selectedEdgeId);
        }
      }

      // ── Open Settings (Enter or Space) ──────────────────────────────────
      else if (e.key === "Enter") {
        if (selectedNodeId) {
          e.preventDefault();
          const node = nodes.find((n) => n.id === selectedNodeId);
          if (node) {
            onOpenSettings(node);
          }
        }
      }

      // ── Deselect (Escape) ───────────────────────────────────────────────
      else if (e.key === "Escape") {
        e.preventDefault();
        onDeselectAll();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeId,
    selectedEdgeId,
    nodes,
    onDuplicateNode,
    onDeleteNode,
    onDeleteEdge,
    onOpenSettings,
    onDeselectAll,
    isModalOpen,
  ]);
}

