"use client"

import { memo } from "react"
import { useNodeMap } from "@/contexts/node-map-context"

interface ModeIndicatorProps {
  isDraggingViewport: boolean
}

export const ModeIndicator = memo(function ModeIndicator({ isDraggingViewport }: ModeIndicatorProps) {
  const { isLiveMode } = useNodeMap()

  if (isLiveMode) {
    return (
      <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-md text-sm z-10 opacity-80">
        Live Mode Active
      </div>
    )
  }

  return (
    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-md text-sm z-10 opacity-80">
      Edit Mode: {isDraggingViewport ? "Panning" : "Drag empty space to pan"}
    </div>
  )
})

