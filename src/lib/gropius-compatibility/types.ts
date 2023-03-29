export interface GropiusShape {
  grId: string,
  grType: string,
  label?: string
}

export interface GropiusShapeStyle {
  width: number,
  height: number,
  color: string,
  stroke: string,
  strokeWidth: number,
  strokeDasharray: string,
  radius?: number,
  rx?: string,
  ry?: string,
  cx?: string,
  cy?: string
}

export interface GropiusConnectionStyle {
  stroke: string,
  fill: string,
}