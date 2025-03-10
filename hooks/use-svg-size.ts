"use client"

import { useState, useEffect, type RefObject } from "react"

export function useSvgSize(svgRef: RefObject<SVGSVGElement>) {
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

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
  }, [svgRef])

  return svgSize
}

