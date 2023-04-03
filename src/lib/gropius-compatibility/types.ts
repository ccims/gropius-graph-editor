export interface GropiusShape {
  grId: string,
  grType: string,
  label?: string
}

export interface GropiusShapeStyle {
  width: number,
  height: number,
  color: string,
  strokeWidth: number,
  strokeDasharray: string,
  radius?: number,
}

export interface GropiusConnectionStyle {
  stroke: string,
  fill: string,
}