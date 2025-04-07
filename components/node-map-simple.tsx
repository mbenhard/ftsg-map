"use client"

import { useEffect, useRef, useState } from "react"
import { ConnectionLine } from "./node-map/connection-line"
import initialNodesData from "@/data/node-map.json"
import type { NodeData, ViewportOffset } from "@/lib/types/node-types"
import { gsap } from "gsap"
import { calculateConnectionPoints } from "@/lib/utils/text-boundary"

export default function NodeMapSimple() {
  const [nodes] = useState<NodeData[]>(initialNodesData)
  const [viewportOffset, setViewportOffset] = useState<ViewportOffset>({ x: 0, y: 0 })
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const contentGroupRef = useRef<SVGGElement>(null)
  const animationsRef = useRef<gsap.core.Timeline[]>([])
  const nodeRefsMap = useRef<Map<string, { x: number; y: number }>>(new Map())
  const signalRefsMap = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Update SVG size on resize and initial render
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSvgSize = () => {
      if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect()
        setSvgSize({ width, height })
      }
    }

    // Initial update
    updateSvgSize()

    // Update after a short delay to ensure accurate measurements
    const timeoutId = setTimeout(updateSvgSize, 100)

    // Update on resize
    const resizeObserver = new ResizeObserver(updateSvgSize)
    if (svgRef.current) {
      resizeObserver.observe(svgRef.current)
    }

    // Update on window resize as a fallback
    window.addEventListener("resize", updateSvgSize)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateSvgSize)
    }
  }, [])

  // Initialize position tracking maps
  useEffect(() => {
    // Reset maps when nodes change
    nodeRefsMap.current.clear()
    signalRefsMap.current.clear()

    // Initialize with starting positions
    nodes.forEach((node) => {
      nodeRefsMap.current.set(node.id, { x: node.x, y: node.y })

      node.signals.forEach((signal) => {
        signalRefsMap.current.set(signal.id, { x: signal.x, y: signal.y })
      })
    })
  }, [nodes])

  // Start animations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a master timeline for better synchronization
    const masterTimeline = gsap.timeline()
    animationsRef.current.push(masterTimeline)

    nodes.forEach((node) => {
      // Get initial position
      const nodeInitialX = node.x
      const nodeInitialY = node.y

      // Random movement values
      const nodeOffsetX = Math.random() * 50 - 25
      const nodeOffsetY = Math.random() * 50 - 25
      const nodeDuration = 5 + Math.random() * 5

      // Create node animation with onUpdate callback
      const nodeAnimation = gsap.to(`#${node.id}`, {
        x: nodeInitialX + nodeOffsetX,
        y: nodeInitialY + nodeOffsetY,
        duration: nodeDuration,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        onUpdate: () => {
          // Get current position from GSAP
          const nodeElement = document.getElementById(node.id)
          if (nodeElement) {
            const matrix = new DOMMatrix(window.getComputedStyle(nodeElement).transform)
            const currentX = matrix.e || nodeInitialX
            const currentY = matrix.f || nodeInitialY

            // Update position in our tracking map
            nodeRefsMap.current.set(node.id, { x: currentX, y: currentY })

            // Update all connecting lines for this node
            node.signals.forEach((signal) => {
              const lineElement = document.getElementById(`line-${node.id}-${signal.id}`)
              const dotElement = document.getElementById(`dot-${node.id}-${signal.id}`)
              if (lineElement && dotElement) {
                const { start, end } = calculateConnectionPoints(
                  node.text,
                  currentX,
                  currentY,
                  signal.text,
                  signalRefsMap.current.get(signal.id)?.x || signal.x,
                  signalRefsMap.current.get(signal.id)?.y || signal.y
                )

                lineElement.setAttribute("x1", start.x.toString())
                lineElement.setAttribute("y1", start.y.toString())
                lineElement.setAttribute("x2", end.x.toString())
                lineElement.setAttribute("y2", end.y.toString())
                dotElement.setAttribute("cx", end.x.toString())
                dotElement.setAttribute("cy", end.y.toString())
              }
            })
          }
        },
      })

      masterTimeline.add(nodeAnimation, 0)

      // Animate each signal with its own onUpdate
      node.signals.forEach((signal) => {
        const signalInitialX = signal.x
        const signalInitialY = signal.y

        const signalOffsetX = Math.random() * 30 - 15
        const signalOffsetY = Math.random() * 30 - 15
        const signalDuration = 4 + Math.random() * 3

        const signalAnimation = gsap.to(`#${signal.id}`, {
          x: signalInitialX + signalOffsetX,
          y: signalInitialY + signalOffsetY,
          duration: signalDuration,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          onUpdate: () => {
            // Get current position from GSAP
            const signalElement = document.getElementById(signal.id)
            if (signalElement) {
              const matrix = new DOMMatrix(window.getComputedStyle(signalElement).transform)
              const currentX = matrix.e || signalInitialX
              const currentY = matrix.f || signalInitialY

              // Update position in our tracking map
              signalRefsMap.current.set(signal.id, { x: currentX, y: currentY })

              // Update the connecting line
              const lineElement = document.getElementById(`line-${node.id}-${signal.id}`)
              const dotElement = document.getElementById(`dot-${node.id}-${signal.id}`)
              if (lineElement && dotElement) {
                const { start, end } = calculateConnectionPoints(
                  node.text,
                  nodeRefsMap.current.get(node.id)?.x || node.x,
                  nodeRefsMap.current.get(node.id)?.y || node.y,
                  signal.text,
                  currentX,
                  currentY
                )

                lineElement.setAttribute("x1", start.x.toString())
                lineElement.setAttribute("y1", start.y.toString())
                lineElement.setAttribute("x2", end.x.toString())
                lineElement.setAttribute("y2", end.y.toString())
                dotElement.setAttribute("cx", end.x.toString())
                dotElement.setAttribute("cy", end.y.toString())
              }
            }
          },
        })

        masterTimeline.add(signalAnimation, 0)
      })
    })

    return () => {
      animationsRef.current.forEach((timeline) => {
        timeline.kill()
      })
      animationsRef.current = []
    }
  }, [nodes])

  // Center the content on initial load
  useEffect(() => {
    if (nodes.length === 0) {
      setViewportOffset({ x: 0, y: 0 })
      return
    }

    // Calculate the bounding box of all nodes and signals
    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY

    nodes.forEach((node) => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x)
      maxY = Math.max(maxY, node.y)

      node.signals.forEach((signal) => {
        minX = Math.min(minX, signal.x)
        minY = Math.min(minY, signal.y)
        maxX = Math.max(maxX, signal.x)
        maxY = Math.max(maxY, signal.y)
      })
    })

    // Calculate center of the bounding box
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Calculate center of the viewport
    const viewportCenterX = svgSize.width / 2
    const viewportCenterY = svgSize.height / 2

    // Set offset to center the content
    setViewportOffset({
      x: viewportCenterX - centerX,
      y: viewportCenterY - centerY,
    })
  }, [nodes, svgSize])

  return (
    <div className="w-full min-h-screen relative flex flex-col live-mode">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/images/starry-sky.jpg")',
          opacity: 0.5,
        }}
      />
      <svg
        ref={svgRef}
        className="w-full flex-1 bg-transparent relative"
      >
        {/* Content group that will be transformed for panning */}
        <g
          ref={contentGroupRef}
          transform={`translate(${viewportOffset.x}, ${viewportOffset.y})`}
        >
          {/* Render connections */}
          {nodes.map((node) =>
            node.signals.map((signal) => (
              <ConnectionLine
                key={`connection-${node.id}-${signal.id}`}
                nodeId={node.id}
                nodeText={node.text}
                nodeX={node.x}
                nodeY={node.y}
                signalId={signal.id}
                signalText={signal.text}
                signalX={signal.x}
                signalY={signal.y}
              />
            ))
          )}

          {/* Render nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <text
                id={node.id}
                x={0}
                y={0}
                transform={`translate(${node.x}, ${node.y})`}
                fill="white"
                fontSize="16"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {node.text}
              </text>

              {/* Render signals */}
              {node.signals.map((signal) => {
                const lines = calculateConnectionPoints(
                  node.text,
                  node.x,
                  node.y,
                  signal.text,
                  signal.x,
                  signal.y
                ).signalLines;

                return (
                  <g
                    key={signal.id}
                    id={signal.id}
                    transform={`translate(${signal.x}, ${signal.y})`}
                  >
                    {lines.map((line: string, index: number) => (
                      <text
                        key={`${signal.id}-line-${index}`}
                        x={0}
                        y={index * 16} // 16px line height
                        fill="#A4A1FF"
                        fontSize="12"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
} 