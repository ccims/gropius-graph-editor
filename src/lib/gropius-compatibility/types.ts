export interface GropiusType {
  name: string,
  shape: Shape,
  style: GropiusShapeStyle
}
export interface GropiusShape {
  name: string
  version: string,
  grType: GropiusType,
}

export interface GropiusShapeStyle {
  minWidth: number,
  minHeight: number,
  maxScale: number,
  color: string,
  stroke: string,
  strokeWidth: number,
  strokeDasharray: string,
  radius: number,
}

export interface GropiusConnectionStyle {
  strokeColor: string,
  strokeWidth: number,
  strokeDasharray: string,
  sourceMarkerType: ConnectionMarker,
  targetMarkerType: ConnectionMarker
}

export enum Shape {
  Rectangle,
  Triangle,
  Circle,
  Diamond,
  Hexagon,
  Octagon,
  Ellipse,
  Parallelogram,
  Trapeze
}

export enum ConnectionMarker {
  None,
  Default,
  Round,
  LessThan,
  OpenArrow,
  Composition,
  Slash,
}