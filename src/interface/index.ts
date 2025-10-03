export interface FlipBookProps {
  pages: Array<string | null>
  flipDuration?: number
  zoomDuration?: number
  zooms?: Array<number>
  perspective?: number
  nPolygons?: number
  ambient?: number
  gloss?: number
  swipeMin?: number
  singlePage?: boolean
  forwardDirection?: string
  centering?: boolean
  startPage?: number
  clickToZoom?: boolean
  dragToFlip?: boolean
  wheel?: string
}

export interface FlipBookHandle {
  flipLeft: () => void
  flipRight: () => void
}

export interface SwipeEvent {
  pageX: number
  pageY: number
}
