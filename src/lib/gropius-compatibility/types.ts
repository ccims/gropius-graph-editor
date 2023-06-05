import { ConnectionMarker, Shape } from "@/lib/diagram/types";
import { Coordinates } from "@/types/HelperTypes";


export interface BusinessObject {
  type: ObjectType,
  data?: any
}

export enum ObjectType {
  Gropius,
  Version,
  Connection,
  SubConnection,
  InterfaceProvide,
  InterfaceRequire,
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
  issueFolders: Array<GropiusIssueFolder>
}

export interface GropiusInterface {
  id: string,
  shapeId: string,
  connectionId: string,
  name: string
  shape: Shape
  provide: boolean
  version: string
}

export interface GropiusIssueFolder {
  id: string
  shapeId: string,
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
  issueFolders: Array<SerializedIssueFolder>
}

export interface SerializedInterface {
  interface: GropiusInterface,
  coordinates: Coordinates,
  waypoints: Array<Coordinates>
}

export interface SerializedIssueFolder {
  issueFolder: GropiusIssueFolder,
  coordinates: Coordinates,
  waypoints: Array<Coordinates>
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