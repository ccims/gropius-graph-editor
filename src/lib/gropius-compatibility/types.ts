export interface GropiusShape {
  grId: string,
  grType: string,
  version: string,
  label?: string
}

export interface GropiusShapeStyle {
  width: number,
  height: number,
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
}

export enum Shapes {
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

export enum ConnectionMarkers {
  Default
}