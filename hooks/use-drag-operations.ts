"use client"

import type React from "react"

import { useCallback } from "react"
import { gsap } from "gsap"
import type { NodeData } from "@/lib/types/node-types"

export function useDragOperations(
  nodes: NodeData[],
  isLiveMode: boolean,
  updateNodePosition: (id: string, x: number, y: number) => void,
  updateSignalPosition: (id: string, parentId: string, x: number, y: number) => void,
  updateNodePos: (id: string, x: number, y: number) => void,
  updateSignalPos: (id: string, x: number, y: number) => void,
  updateLine: (nodeId: string, signalId: string) => void,
) {
  const handleDragStart = useCallback(
    (e: React.MouseEvent, id: string, type: "node" | "signal", parentId?: string) => {
      if (isLiveMode) return

      const startX = e.clientX
      const startY = e.clientY

      let initialX: number, initialY: number

      if (type === "node") {
        const node = nodes.find((n) => n.id === id)
        if (!node) return
        initialX = node.x
        initialY = node.y
      } else {
        const parentNode = nodes.find((n) => n.id === parentId)
        const signal = parentNode?.signals.find((s) => s.id === id)
        if (!signal) return
        initialX = signal.x
        initialY = signal.y
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        const newX = initialX + dx
        const newY = initialY + dy

        if (type === "node") {
          // Update node position in state
          updateNodePosition(id, newX, newY)

          // Update node position in DOM and tracking map
          gsap.set(`#${id}`, { x: newX, y: newY })
          updateNodePos(id, newX, newY)

          // Update all connecting lines for this node
          const node = nodes.find((n) => n.id === id)
          if (node) {
            node.signals.forEach((signal) => {
              updateLine(id, signal.id)
            })
          }
        } else if (parentId) {
          // Update signal position in state
          updateSignalPosition(id, parentId, newX, newY)

          // Update signal position in DOM and tracking map
          gsap.set(`#${id}`, { x: newX, y: newY })
          updateSignalPos(id, newX, newY)

          // Update the connecting line
          updateLine(parentId, id)
        }
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [isLiveMode, nodes, updateNodePosition, updateSignalPosition, updateNodePos, updateSignalPos, updateLine],
  )

  return { handleDragStart }
}

