"use client"

import { useCallback } from "react"
import { useNodeMap } from "@/contexts/node-map-context"
import { useViewport } from "@/hooks/use-viewport"
import { useNodeTracking } from "@/hooks/use-node-tracking"
import { useAnimations } from "@/hooks/use-animations"
import { useDragOperations } from "@/hooks/use-drag-operations"
import { Toolbar } from "./toolbar"
import { Canvas } from "./canvas"
import { ContextMenu } from "@/components/context-menu"

export default function NodeMap() {
  const {
    nodes,
    isLiveMode,
    contextMenu,
    addNode,
    addSignal,
    updateNodeText,
    updateSignalText,
    deleteNode,
    deleteSignal,
    updateNodePosition,
    updateSignalPosition,
    closeContextMenu,
  } = useNodeMap()

  // Custom hooks
  const { viewportOffset, isDraggingViewport, handleViewportDragStart, handleViewportDragMove, handleViewportDragEnd } =
    useViewport(isLiveMode)

  const {
    nodeRefsMap,
    signalRefsMap,
    updateNodePosition: updateNodePos,
    updateSignalPosition: updateSignalPos,
    getNodePosition,
    getSignalPosition,
  } = useNodeTracking(nodes)

  // Update line function for animations
  const updateLine = useCallback(
    (nodeId: string, signalId: string) => {
      // This is now handled by the ConnectionLine component
      // Just ensure we have the positions updated in the refs
    },
    [nodes],
  )

  // Initialize animations
  const { startAnimations, stopAnimations } = useAnimations(
    nodes,
    isLiveMode,
    updateNodePos,
    updateSignalPos,
    updateLine,
  )

  // Initialize drag operations
  const { handleDragStart } = useDragOperations(
    nodes,
    isLiveMode,
    updateNodePosition,
    updateSignalPosition,
    updateNodePos,
    updateSignalPos,
    updateLine,
  )

  // Handle context menu actions
  const handleContextMenuAction = {
    onAddNode: () => {
      if (contextMenu.x !== undefined && contextMenu.y !== undefined) {
        addNode(contextMenu.x, contextMenu.y)
      }
      closeContextMenu()
    },
    onAddSignal: () => {
      if (contextMenu.id) {
        addSignal(contextMenu.id)
      }
      closeContextMenu()
    },
    onEditText: (text: string) => {
      if (contextMenu.type === "node" && contextMenu.id) {
        updateNodeText(contextMenu.id, text)
      } else if (contextMenu.type === "signal" && contextMenu.id && contextMenu.parentId) {
        updateSignalText(contextMenu.id, contextMenu.parentId, text)
      }
      closeContextMenu()
    },
    onDelete: () => {
      if (contextMenu.type === "node" && contextMenu.id) {
        deleteNode(contextMenu.id)
      } else if (contextMenu.type === "signal" && contextMenu.id && contextMenu.parentId) {
        deleteSignal(contextMenu.id, contextMenu.parentId)
      }
      closeContextMenu()
    },
  }

  return (
    <div className="w-full">
      <Toolbar />

      <Canvas
        viewportOffset={viewportOffset}
        isDraggingViewport={isDraggingViewport}
        handleViewportDragStart={handleViewportDragStart}
        handleViewportDragMove={handleViewportDragMove}
        handleViewportDragEnd={handleViewportDragEnd}
        nodeRefsMap={nodeRefsMap}
        signalRefsMap={signalRefsMap}
        handleDragStart={handleDragStart}
        updateLine={updateLine}
      />

      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.clientX || 0}
          y={contextMenu.clientY || 0}
          svgX={contextMenu.x || 0}
          svgY={contextMenu.y || 0}
          type={contextMenu.type}
          id={contextMenu.id}
          parentId={contextMenu.parentId}
          currentText={contextMenu.currentText}
          onClose={closeContextMenu}
          onAddNode={handleContextMenuAction.onAddNode}
          onAddSignal={handleContextMenuAction.onAddSignal}
          onEditText={handleContextMenuAction.onEditText}
          onDelete={handleContextMenuAction.onDelete}
        />
      )}
    </div>
  )
}

