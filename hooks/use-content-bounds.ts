"use client"

import { useState, useEffect } from "react"
import type { NodeData, BoundingBox } from "@/lib/types/node-types"
import { calculateContentBounds } from "@/lib/utils/geometry"

export function useContentBounds(
  nodes: NodeData[],
  svgWidth: number,
  svgHeight: number,
  viewportOffsetX: number,
  viewportOffsetY: number,
) {
  const [contentBounds, setContentBounds] = useState<BoundingBox>({
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const bounds = calculateContentBounds(nodes, svgWidth, svgHeight)
    setContentBounds(bounds)
  }, [nodes, viewportOffsetX, viewportOffsetY, svgWidth, svgHeight])

  // Get the transformed content bounds (adjusted for viewport offset)
  const getTransformedContentBounds = () => {
    return {
      x: contentBounds.minX + viewportOffsetX,
      y: contentBounds.minY + viewportOffsetY,
      width: contentBounds.width,
      height: contentBounds.height,
    }
  }

  // Get the viewport bounds in content coordinates
  const getViewportInContentCoords = () => {
    return {
      x: -viewportOffsetX,
      y: -viewportOffsetY,
      width: svgWidth,
      height: svgHeight,
    }
  }

  return {
    contentBounds,
    getTransformedContentBounds,
    getViewportInContentCoords,
  }
}

