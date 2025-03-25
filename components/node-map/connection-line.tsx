import { memo } from "react"
import { calculateConnectionPoints } from "@/lib/utils/text-boundary"

interface ConnectionLineProps {
  nodeId: string
  nodeText: string
  nodeX: number
  nodeY: number
  signalId: string
  signalText: string
  signalX: number
  signalY: number
}

export const ConnectionLine = memo(function ConnectionLine({
  nodeId,
  nodeText,
  nodeX,
  nodeY,
  signalId,
  signalText,
  signalX,
  signalY
}: ConnectionLineProps) {
  // Calculate connection points based on text boundaries
  const { start, end, signalLines } = calculateConnectionPoints(
    nodeText,
    nodeX,
    nodeY,
    signalText,
    signalX,
    signalY
  );

  return (
    <g key={`connection-${nodeId}-${signalId}`}>
      <line
        key={`line-${nodeId}-${signalId}`}
        id={`line-${nodeId}-${signalId}`}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#A4A1FF"
        strokeWidth={1.5}
      />
      <circle
        key={`dot-${nodeId}-${signalId}`}
        id={`dot-${nodeId}-${signalId}`}
        cx={end.x}
        cy={end.y}
        r={3}
        fill="#A4A1FF"
      />
    </g>
  );
}); 