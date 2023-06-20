import { ConnectionMarker, Shape } from "@/lib/diagram/types";
import { Coordinates } from "@/types/HelperTypes";


export interface BusinessObject {
  type: ObjectType,
  data?: any
}

export enum ObjectType {
  ComponentVersion,
  Version,
  Connection,
  SubConnection,
  Interface,
  IssueFolder
}

export interface GropiusType {
  name: string,
  shape: Shape,
  style: GropiusShapeStyle
}
export interface GropiusShape {
  id: string,
  shapeId: string,
  name: string,
  version: string,
  grType: GropiusType,
  interfaces: Array<GropiusInterface>,
  issues: Array<GropiusIssue>
}

export interface GropiusConnection {
  id: string,
  sourceId: string,
  targetId: string
}

export interface GropiusInterface {
  id: string,
  shapeId: string,
  parentId: string,
  connectionId: string,
  name: string
  shape: Shape
  openShape: boolean
  version: string
}

export interface GropiusIssue {
  id: string
  shapeId: string,
  parentId: string,
  connectionId: string,
  path: string
  color: string
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

export interface SerializedShape {
  grShape: GropiusShape,
  x: number,
  y: number,
  interfaces: Array<SerializedInterface>,
  issues: Array<SerializedIssueFolder>
}

export interface SerializedInterface {
  interface: GropiusInterface,
  coordinates: Coordinates,
  waypoints: Array<Coordinates>
}

export interface SerializedIssueFolder {
  issue: GropiusIssue,
  coordinates: Coordinates
}

export  interface SerializedConnection {
  waypoints: Array<Coordinates>,
  sourceId: string,
  targetId: string,
  style: GropiusConnectionStyle
}

export interface SerializedDiagram {
  shapes: Array<SerializedShape>,
  connections: Array<SerializedConnection>
}