export interface Signal {
  id: string
  text: string
  x: number
  y: number
}

export interface NodeData {
  id: string
  text: string
  x: number
  y: number
  signals: Signal[]
}

export interface ViewportOffset {
  x: number
  y: number
} 