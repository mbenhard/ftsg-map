"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { gsap } from "gsap"
import { Button } from "@/components/ui/button"
import { ContextMenu } from "@/components/context-menu"
import saveAs from "file-saver"
import initialNodesData from "@/data/node-map.json"
import { ConnectionLine } from "./node-map/connection-line"
import { calculateConnectionPoints } from "@/lib/utils/text-boundary"

// Types
export interface NodeData {
  id: string
  text: string
  x: number
  y: number
  signals: SignalData[]
}

export interface SignalData {
  id: string
  text: string
  x: number
  y: number
  parentId: string
}

export interface Position {
  x: number
  y: number
}

export interface ViewportOffset {
  x: number
  y: number
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

// Initial data
const initialNodes: NodeData[] = [
  {
    id: "node-1",
    text: "Main Node 1",
    x: 200,
    y: 200,
    signals: [
      { id: "signal-1", text: "Signal 1", x: 300, y: 150, parentId: "node-1" },
      { id: "signal-2", text: "Signal 2", x: 300, y: 250, parentId: "node-1" },
    ],
  },
  {
    id: "node-2",
    text: "Main Node 2",
    x: 500,
    y: 300,
    signals: [
      { id: "signal-3", text: "Signal 3", x: 600, y: 250, parentId: "node-2" },
      { id: "signal-4", text: "Signal 4", x: 600, y: 350, parentId: "node-2" },
    ],
  },
]

export default function NodeMap() {
  const [nodes, setNodes] = useState<NodeData[]>(initialNodesData)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [viewportOffset, setViewportOffset] = useState<ViewportOffset>({ x: 0, y: 0 })
  const [isDraggingViewport, setIsDraggingViewport] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [contentBounds, setContentBounds] = useState<BoundingBox>({
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    width: 0,
    height: 0,
  })

  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    type: "canvas" | "node" | "signal"
    id?: string
    parentId?: string
    clientX?: number // Added for screen position
    clientY?: number // Added for screen position
    currentText?: string // Added to store current text for editing
  }>({
    show: false,
    x: 0,
    y: 0,
    type: "canvas",
  })

  const svgRef = useRef<SVGSVGElement>(null)
  const contentGroupRef = useRef<SVGGElement>(null)
  const animationsRef = useRef<gsap.core.Timeline[]>([])
  const nodeRefsMap = useRef<Map<string, { x: number; y: number }>>(new Map())
  const signalRefsMap = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Update SVG size on resize and initial render
  useEffect(() => {
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

  // Calculate content bounds whenever nodes change or viewport is panned
  useEffect(() => {
    calculateContentBounds()
  }, [nodes, viewportOffset])

  // Reset viewport offset when switching to live mode
  useEffect(() => {
    if (isLiveMode) {
      setViewportOffset({ x: 0, y: 0 })
    }
  }, [isLiveMode])

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

  // Handle animations
  useEffect(() => {
    if (isLiveMode) {
      startAnimations()
    } else {
      stopAnimations()
    }

    return () => {
      stopAnimations()
    }
  }, [isLiveMode, nodes])

  // Calculate the bounding box of all content
  const calculateContentBounds = () => {
    if (nodes.length === 0) {
      setContentBounds({
        minX: 0,
        minY: 0,
        maxX: svgSize.width,
        maxY: svgSize.height,
        width: svgSize.width,
        height: svgSize.height,
      })
      return
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    // Add padding to ensure text is fully visible
    const padding = 50

    nodes.forEach((node) => {
      // Consider the text width (approximate)
      const textWidth = node.text.length * 8
      const textHeight = 20

      minX = Math.min(minX, node.x - textWidth / 2 - padding)
      minY = Math.min(minY, node.y - textHeight / 2 - padding)
      maxX = Math.max(maxX, node.x + textWidth / 2 + padding)
      maxY = Math.max(maxY, node.y + textHeight / 2 + padding)

      node.signals.forEach((signal) => {
        const signalTextWidth = signal.text.length * 7
        const signalTextHeight = 16

        minX = Math.min(minX, signal.x - signalTextWidth / 2 - padding)
        minY = Math.min(minY, signal.y - signalTextHeight / 2 - padding)
        maxX = Math.max(maxX, signal.x + signalTextWidth / 2 + padding)
        maxY = Math.max(maxY, signal.y + signalTextHeight / 2 + padding)
      })
    })

    // Ensure we have valid bounds even with extreme values
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      minX = 0
      minY = 0
      maxX = svgSize.width
      maxY = svgSize.height
    }

    setContentBounds({
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    })
  }

  // Get the transformed content bounds (adjusted for viewport offset)
  const getTransformedContentBounds = () => {
    return {
      x: contentBounds.minX + viewportOffset.x,
      y: contentBounds.minY + viewportOffset.y,
      width: contentBounds.width,
      height: contentBounds.height,
    }
  }

  // Get the viewport bounds in content coordinates
  const getViewportInContentCoords = () => {
    return {
      x: -viewportOffset.x,
      y: -viewportOffset.y,
      width: svgSize.width,
      height: svgSize.height,
    }
  }

  // Remove the calculateLineOffsets function and update the updateLine function
  const updateLine = (nodeId: string, signalId: string) => {
    const lineElement = document.getElementById(`line-${nodeId}-${signalId}`)
    const dotElement = document.getElementById(`dot-${nodeId}-${signalId}`)
    const nodePos = nodeRefsMap.current.get(nodeId)
    const signalPos = signalRefsMap.current.get(signalId)

    // Find the node and signal text
    const node = nodes.find((n) => n.id === nodeId)
    const signal = node?.signals.find((s) => s.id === signalId)

    if (lineElement && dotElement && nodePos && signalPos && node && signal) {
      // Calculate connection points using the same function as the ConnectionLine component
      const { start, end } = calculateConnectionPoints(
        node.text,
        nodePos.x,
        nodePos.y,
        signal.text,
        signalPos.x,
        signalPos.y
      )

      // Update line position
      lineElement.setAttribute("x1", start.x.toString())
      lineElement.setAttribute("y1", start.y.toString())
      lineElement.setAttribute("x2", end.x.toString())
      lineElement.setAttribute("y2", end.y.toString())

      // Update dot position
      dotElement.setAttribute("cx", end.x.toString())
      dotElement.setAttribute("cy", end.y.toString())
    }
  }

  const startAnimations = () => {
    stopAnimations()

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
              updateLine(node.id, signal.id)
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
              updateLine(node.id, signal.id)
            }
          },
        })

        masterTimeline.add(signalAnimation, 0)
      })
    })
  }

  // Update the stopAnimations function to pass text content to calculateLineOffsets
  const stopAnimations = () => {
    animationsRef.current.forEach((timeline) => {
      timeline.kill()
    })
    animationsRef.current = []

    // Reset positions
    nodes.forEach((node) => {
      gsap.set(`#${node.id}`, { x: node.x, y: node.y })
      nodeRefsMap.current.set(node.id, { x: node.x, y: node.y })

      node.signals.forEach((signal) => {
        gsap.set(`#${signal.id}`, { x: signal.x, y: signal.y })
        signalRefsMap.current.set(signal.id, { x: signal.x, y: signal.y })
      })

      // Reset lines and dots
      node.signals.forEach((signal) => {
        const lineElement = document.getElementById(`line-${node.id}-${signal.id}`)
        const dotElement = document.getElementById(`dot-${node.id}-${signal.id}`)
        if (lineElement && dotElement) {
          // Calculate connection points using the same function as the ConnectionLine component
          const { start, end } = calculateConnectionPoints(
            node.text,
            node.x,
            node.y,
            signal.text,
            signal.x,
            signal.y
          )

          // Update line position
          lineElement.setAttribute("x1", start.x.toString())
          lineElement.setAttribute("y1", start.y.toString())
          lineElement.setAttribute("x2", end.x.toString())
          lineElement.setAttribute("y2", end.y.toString())

          // Update dot position
          dotElement.setAttribute("cx", end.x.toString())
          dotElement.setAttribute("cy", end.y.toString())
        }
      })
    })
  }

  // Handle viewport dragging
  const handleViewportDragStart = (e: React.MouseEvent) => {
    if (isLiveMode || isDraggingViewport) return

    // Only start dragging if we're clicking on the background, not on a node or signal
    if ((e.target as Element).tagName === "svg" || (e.target as Element).tagName === "rect") {
      setIsDraggingViewport(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  // Helper function to ensure smooth panning
  const smoothPan = (dx: number, dy: number) => {
    // Apply a small damping factor to make panning smoother
    const damping = 0.95
    const smoothDx = dx * damping
    const smoothDy = dy * damping

    setViewportOffset((prev) => ({
      x: prev.x + smoothDx,
      y: prev.y + smoothDy,
    }))
  }

  const handleViewportDragMove = (e: React.MouseEvent) => {
    if (!isDraggingViewport) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    // Use the smooth panning function
    smoothPan(dx, dy)

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleViewportDragEnd = () => {
    setIsDraggingViewport(false)
  }

  // Handle context menu
  const handleContextMenu = (
    e: React.MouseEvent,
    type: "canvas" | "node" | "signal",
    id?: string,
    parentId?: string,
  ) => {
    // Prevent context menu in Live Mode
    if (isLiveMode) {
      e.preventDefault()
      return
    }

    // Stop event propagation to prevent the canvas handler from overriding
    e.stopPropagation()
    e.preventDefault()

    // Get position relative to SVG
    const svgRect = svgRef.current?.getBoundingClientRect()
    const x = e.clientX - (svgRect?.left || 0)
    const y = e.clientY - (svgRect?.top || 0)

    // Adjust for viewport offset to get the true position in the coordinate system
    const adjustedX = x - viewportOffset.x
    const adjustedY = y - viewportOffset.y

    // Get current text for the element if it's a node or signal
    let currentText = ""
    if (type === "node" && id) {
      const node = nodes.find((n) => n.id === id)
      if (node) {
        currentText = node.text
      }
    } else if (type === "signal" && id && parentId) {
      const node = nodes.find((n) => n.id === parentId)
      if (node) {
        const signal = node.signals.find((s) => s.id === id)
        if (signal) {
          currentText = signal.text
        }
      }
    }

    setContextMenu({
      show: true,
      x: adjustedX,
      y: adjustedY,
      type,
      id,
      parentId,
      clientX: e.clientX, // Store actual screen coordinates
      clientY: e.clientY,
      currentText, // Store current text for editing
    })
  }

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, show: false }))
  }

  // Node operations
  const addNode = (x: number, y: number) => {
    const newId = `node-${Date.now()}`
    setNodes((prev) => [
      ...prev,
      {
        id: newId,
        text: "New Node",
        x,
        y,
        signals: [],
      },
    ])

    // Add to tracking map
    nodeRefsMap.current.set(newId, { x, y })
  }

  // Enhanced addSignal function with better positioning
  const addSignal = (parentId: string) => {
    const parent = nodes.find((node) => node.id === parentId)
    if (!parent) return

    const newId = `signal-${Date.now()}`

    // Calculate a good position for the new signal
    // Get existing signals for this node to avoid overlap
    const existingSignals = parent.signals.length

    // Calculate angle based on number of existing signals
    // This will distribute signals in a semi-circle around the node
    const angleStep = Math.PI / (existingSignals + 2) // +2 to leave space on both ends
    const angle = angleStep * (existingSignals + 1)

    // Distance from node
    const distance = 100

    // Calculate position using polar coordinates
    const offsetX = Math.cos(angle) * distance
    const offsetY = Math.sin(angle) * distance

    const newX = parent.x + offsetX
    const newY = parent.y + offsetY

    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            signals: [
              ...node.signals,
              {
                id: newId,
                text: "New Signal",
                x: newX,
                y: newY,
                parentId,
              },
            ],
          }
        }
        return node
      }),
    )

    // Add to tracking map
    signalRefsMap.current.set(newId, { x: newX, y: newY })
  }

  const updateNodeText = (id: string, text: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === id) {
          return { ...node, text }
        }
        return node
      }),
    )
  }

  const updateSignalText = (id: string, parentId: string, text: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            signals: node.signals.map((signal) => {
              if (signal.id === id) {
                return { ...signal, text }
              }
              return signal
            }),
          }
        }
        return node
      }),
    )
  }

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== id))

    // Remove from tracking map
    nodeRefsMap.current.delete(id)
  }

  const deleteSignal = (id: string, parentId: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            signals: node.signals.filter((signal) => signal.id !== id),
          }
        }
        return node
      }),
    )

    // Remove from tracking map
    signalRefsMap.current.delete(id)
  }

  // Drag operations
  const handleDragStart = (e: React.MouseEvent, id: string, type: "node" | "signal", parentId?: string) => {
    if (isLiveMode) return

    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return

    const startX = e.clientX
    const startY = e.clientY

    let element: NodeData | SignalData | undefined

    if (type === "node") {
      element = nodes.find((node) => node.id === id)
    } else {
      const parentNode = nodes.find((node) => node.id === parentId)
      element = parentNode?.signals.find((signal) => signal.id === id)
    }

    if (!element) return

    const initialX = element.x
    const initialY = element.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      const newX = initialX + dx
      const newY = initialY + dy

      if (type === "node") {
        // Update node position
        setNodes((prev) =>
          prev.map((node) => {
            if (node.id === id) {
              return { ...node, x: newX, y: newY }
            }
            return node
          }),
        )

        // Update node position in DOM and tracking map
        gsap.set(`#${id}`, { x: newX, y: newY })
        nodeRefsMap.current.set(id, { x: newX, y: newY })

        // Update all connecting lines for this node
        const node = nodes.find((n) => n.id === id)
        if (node) {
          node.signals.forEach((signal) => {
            updateLine(id, signal.id)
          })
        }
      } else if (parentId) {
        // Update signal position
        setNodes((prev) =>
          prev.map((node) => {
            if (node.id === parentId) {
              return {
                ...node,
                signals: node.signals.map((signal) => {
                  if (signal.id === id) {
                    return { ...signal, x: newX, y: newY }
                  }
                  return signal
                }),
              }
            }
            return node
          }),
        )

        // Update signal position in DOM and tracking map
        gsap.set(`#${id}`, { x: newX, y: newY })
        signalRefsMap.current.set(id, { x: newX, y: newY })

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
  }

  // Reset viewport to center on all nodes
  const resetViewport = () => {
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
  }

  // Fit content to viewport
  const fitContentToViewport = () => {
    if (nodes.length === 0) {
      setViewportOffset({ x: 0, y: 0 })
      return
    }

    // Calculate the scale needed to fit the content
    const scaleX = svgSize.width / contentBounds.width
    const scaleY = svgSize.height / contentBounds.height
    const scale = Math.min(scaleX, scaleY) * 0.9 // 90% to leave some margin

    // Calculate the center of the content
    const contentCenterX = (contentBounds.minX + contentBounds.maxX) / 2
    const contentCenterY = (contentBounds.minY + contentBounds.maxY) / 2

    // Calculate the center of the viewport
    const viewportCenterX = svgSize.width / 2
    const viewportCenterY = svgSize.height / 2

    // Set offset to center the content
    setViewportOffset({
      x: viewportCenterX - contentCenterX,
      y: viewportCenterY - contentCenterY,
    })

    // Note: In a real implementation, we would also apply the scale factor
    // But for this example, we're just centering without scaling
  }

  // JSON import/export
  const exportToJson = (saveToFile: boolean = false) => {
    const dataStr = JSON.stringify(nodes, null, 2)
    
    if (saveToFile) {
      // Save to project data file
      fetch('/api/save-node-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: dataStr,
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save to project file')
        }
        alert('Successfully saved to project file')
      })
      .catch(error => {
        console.error('Error saving to project file:', error)
        alert('Failed to save to project file')
      })
    } else {
      // Export as download
      const blob = new Blob([dataStr], { type: "application/json" })
      saveAs(blob, "node-map.json")
    }
  }

  const importFromJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          const importedNodes = JSON.parse(event.target.result as string)
          
          // Validate the imported data structure
          if (!Array.isArray(importedNodes)) {
            throw new Error("Invalid JSON format: expected an array of nodes")
          }

          // Update nodes state
          setNodes(importedNodes)

          // Update tracking maps
          nodeRefsMap.current.clear()
          signalRefsMap.current.clear()
          
          importedNodes.forEach(node => {
            nodeRefsMap.current.set(node.id, { x: node.x, y: node.y })
            node.signals.forEach((signal: SignalData) => {
              signalRefsMap.current.set(signal.id, { x: signal.x, y: signal.y })
            })
          })

          // Reset viewport to center on the imported nodes
          fitContentToViewport()
        }
      } catch (error) {
        console.error("Failed to import JSON:", error)
        alert("Failed to import JSON file. Please make sure it's a valid node map JSON file.")
      }
    }
    reader.onerror = () => {
      console.error("Failed to read file")
      alert("Failed to read the file. Please try again.")
    }
    reader.readAsText(file)
  }

  return (
    <div className="w-full">
      <div className="flex justify-between mb-4">
        <div className="space-x-2 bg-gray-900 p-1 rounded-md">
          <Button
            variant={isLiveMode ? "outline" : "default"}
            onClick={() => setIsLiveMode(false)}
            className={`${
              !isLiveMode
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            Edit Mode
          </Button>
          <Button
            variant={isLiveMode ? "default" : "outline"}
            onClick={() => setIsLiveMode(true)}
            className={`${
              isLiveMode
                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                : "bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            Live Mode
          </Button>
        </div>
        <div className="space-x-2">
          {!isLiveMode && <></>}
          <Button onClick={() => exportToJson(false)}>Export JSON</Button>
          <Button onClick={() => exportToJson(true)}>Save to Project</Button>
          <input
            id="import-json"
            type="file"
            accept=".json"
            className="hidden"
            onChange={importFromJson}
          />
          <Button onClick={() => document.getElementById('import-json')?.click()}>
            Import JSON
          </Button>
        </div>
      </div>

      <div className="w-full h-screen relative">
        {isLiveMode && (
          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-md text-sm z-10 opacity-80">
            Live Mode Active
          </div>
        )}
        {!isLiveMode && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-md text-sm z-10 opacity-80">
            Edit Mode: {isDraggingViewport ? "Panning" : "Drag empty space to pan"}
          </div>
        )}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url("/images/starry-sky.jpg")',
            opacity: 0.5,
          }}
        />
        <svg
          ref={svgRef}
          className={`w-full h-full bg-transparent relative ${isLiveMode ? "cursor-default" : isDraggingViewport ? "cursor-grabbing" : "cursor-grab"}`}
          onContextMenu={(e) => handleContextMenu(e, "canvas")}
          onClick={closeContextMenu}
          onMouseDown={!isLiveMode ? handleViewportDragStart : undefined}
          onMouseMove={!isLiveMode ? handleViewportDragMove : undefined}
          onMouseUp={!isLiveMode ? handleViewportDragEnd : undefined}
          onMouseLeave={!isLiveMode ? handleViewportDragEnd : undefined}
        >
          {/* SVG content is divided into multiple layers: 
              1. Fixed viewport boundary (blue dashed line)
              2. Content boundary (green dashed line)
              3. The content group that transforms during panning */}

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
                  onContextMenu={(e) => handleContextMenu(e, "node", node.id)}
                  onMouseDown={(e) => {
                    e.stopPropagation() // Prevent viewport dragging when clicking on a node
                    handleDragStart(e, node.id, "node")
                  }}
                  style={{ cursor: isLiveMode ? "default" : "move" }}
                  className={isLiveMode ? "" : "hover:text-blue-300"}
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
                      onContextMenu={(e) => handleContextMenu(e, "signal", signal.id, node.id)}
                      onMouseDown={(e) => {
                        e.stopPropagation() // Prevent viewport dragging when clicking on a signal
                        handleDragStart(e, signal.id, "signal", node.id)
                      }}
                      style={{ cursor: isLiveMode ? "default" : "move" }}
                      className={isLiveMode ? "" : "hover:text-green-300"}
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

      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.clientX || 0} // Use screen coordinates for positioning
          y={contextMenu.clientY || 0}
          svgX={contextMenu.x} // Pass SVG coordinates for operations
          svgY={contextMenu.y}
          type={contextMenu.type}
          id={contextMenu.id}
          parentId={contextMenu.parentId}
          currentText={contextMenu.currentText} // Pass current text for editing
          onClose={closeContextMenu}
          onAddNode={() => {
            addNode(contextMenu.x, contextMenu.y)
            closeContextMenu()
          }}
          onAddSignal={() => {
            if (contextMenu.id) {
              addSignal(contextMenu.id)
              closeContextMenu()
            }
          }}
          onEditText={(text) => {
            if (contextMenu.type === "node" && contextMenu.id) {
              updateNodeText(contextMenu.id, text)
            } else if (contextMenu.type === "signal" && contextMenu.id && contextMenu.parentId) {
              updateSignalText(contextMenu.id, contextMenu.parentId, text)
            }
            closeContextMenu()
          }}
          onDelete={() => {
            if (contextMenu.type === "node" && contextMenu.id) {
              deleteNode(contextMenu.id)
            } else if (contextMenu.type === "signal" && contextMenu.id && contextMenu.parentId) {
              deleteSignal(contextMenu.id, contextMenu.parentId)
            }
            closeContextMenu()
          }}
        />
      )}
    </div>
  )
}

