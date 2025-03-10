"use client"

import type React from "react"

import { useRef, useCallback } from "react"
import { useNodeMap } from "@/contexts/node-map-context"
import { useSvgSize } from "@/hooks/use-svg-size"
import { useContentBounds } from "@/hooks/use-content-bounds"
import { NodeElement } from "./node-element"
import { SignalElement } from "./signal-element"
import { ConnectionLine } from "./connection-line"
import { ModeIndicator } from "./mode-indicator"

interface CanvasProps {
  viewportOffset: { x: number; y: number }
  isDraggingViewport: boolean
  handleViewportDragStart: (e: React.MouseEvent) => void
  handleViewportDragMove: (e: React.MouseEvent) => void
  handleViewportDragEnd: () => void
  nodeRefsMap: React.MutableRefObject<Map<string, { x: number; y: number }>>
  signalRefsMap: React.MutableRefObject<Map<string, { x: number; y: number }>>
  handleDragStart: (e: React.MouseEvent, id: string, type: "node" | "signal", parentId?: string) => void
  updateLine: (nodeId: string, signalId: string) => void
}

export function Canvas({
  viewportOffset,
  isDraggingViewport,
  handleViewportDragStart,
  handleViewportDragMove,
  handleViewportDragEnd,
  nodeRefsMap,
  signalRefsMap,
  handleDragStart,
  updateLine,
}: CanvasProps) {
  const { nodes, isLiveMode, closeContextMenu, showContextMenu } = useNodeMap()
  const svgRef = useRef<SVGSVGElement>(null)
  const contentGroupRef = useRef<SVGGElement>(null)

  const svgSize = useSvgSize(svgRef)
  const { contentBounds } = useContentBounds(nodes, svgSize.width, svgSize.height, viewportOffset.x, viewportOffset.y)

  // Handle canvas context menu
  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isLiveMode) {
        e.preventDefault()
        return
      }

      e.preventDefault()

      // Get position relative to SVG
      const svgRect = svgRef.current?.getBoundingClientRect()
      const x = e.clientX - (svgRect?.left || 0)
      const y = e.clientY - (svgRect?.top || 0)

      // Adjust for viewport offset to get the true position in the coordinate system
      const adjustedX = x - viewportOffset.x
      const adjustedY = y - viewportOffset.y

      showContextMenu({
        type: "canvas",
        x: adjustedX,
        y: adjustedY,
        clientX: e.clientX,
        clientY: e.clientY,
      })
    },
    [isLiveMode, viewportOffset, showContextMenu],
  )

  return (
    <div className="w-full h-[80vh] border border-gray-800 rounded-lg overflow-hidden relative">
      <ModeIndicator isDraggingViewport={isDraggingViewport} />

      <svg
        ref={svgRef}
        className={`w-full h-full bg-black ${
          isLiveMode ? "cursor-default" : isDraggingViewport ? "cursor-grabbing" : "cursor-grab"
        }`}
        onContextMenu={handleCanvasContextMenu}
        onClick={closeContextMenu}
        onMouseDown={!isLiveMode ? handleViewportDragStart : undefined}
        onMouseMove={!isLiveMode ? handleViewportDragMove : undefined}
        onMouseUp={!isLiveMode ? handleViewportDragEnd : undefined}
        onMouseLeave={!isLiveMode ? handleViewportDragEnd : undefined}
      >
        {/* Content group that will be transformed for panning */}
        <g
          ref={contentGroupRef}
          className={!isLiveMode ? "panning-active" : ""}
          transform={isLiveMode ? "" : `translate(${viewportOffset.x}, ${viewportOffset.y})`}
        >
          {/* Render connections */}
          {nodes.map((node) =>
            node.signals.map((signal) => (
              <ConnectionLine
                key={`connection-${node.id}-${signal.id}`}
                node={node}
                signal={signal}
                nodePosition={nodeRefsMap.current.get(node.id)}
                signalPosition={signalRefsMap.current.get(signal.id)}
              />
            )),
          )}

          {/* Render nodes and signals */}
          {nodes.map((node) => (
            <g key={node.id}>
              <NodeElement node={node} onDragStart={handleDragStart} />

              {/* Render signals */}
              {node.signals.map((signal) => (
                <SignalElement key={signal.id} signal={signal} onDragStart={handleDragStart} />
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

