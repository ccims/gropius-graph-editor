import { ObjectType, SerializedDiagram, SerializedInterface, SerializedIssueFolder } from "@/lib/gropius-diagram/types";

export function exportDiagram(elementRegistry: any): SerializedDiagram {
  const elements = elementRegistry._elements;

  let diagram: SerializedDiagram = {
    shapes: [],
    connections: []
  };

  Object.values(elements).forEach((element: any) => {
    element = element.element;
    if (element.businessObject) {
      if (element.businessObject.type == ObjectType.ComponentVersion) {// Only serialize main components

        // Serialize interfaces
        const interfaces: Array<SerializedInterface> = serializeInterfaces(element, elementRegistry);
        const issues: Array<SerializedIssueFolder> = serializeIssues(element, elementRegistry);

        // Main (gropius) shape serialized
        const serializedShape = {
          grShape: element.businessObject.data,
          x: element.x,
          y: element.y,
          interfaces: interfaces,
          issues: issues
        };

        diagram.shapes.push(serializedShape);
      } else if (element.businessObject.type == ObjectType.Connection) {
        const source = element.source.businessObject.data.sourceId;
        const target = element.target.businessObject.data.targetId;
        const id = element.target.businessObject.data.id;


        diagram.connections.push({
          id: id,
          sourceId: source,
          targetId: target,
          waypoints: element.waypoints,
          style: element.custom.style
        });
      }
    }
  });

  console.log(diagram);
  return diagram;
}

export function serializeInterfaces(element: any, elementRegistry: any) {
  const elements = elementRegistry._elements;
  let interfaces: Array<SerializedInterface> = [];
  element.businessObject.data.interfaces.forEach((interf: any) => {
    // Find interface (diagram) object for interface
    const interfaceObject = elementRegistry.get(interf.shapeId);
    // Find connection object for shape-to-interface connection
    const connectionObject = Object.values(elements).find((e: any) => {
      e = e.element;
      if (!e.id.startsWith("connection"))
        return false;

      return e.source.businessObject.data.id == element.businessObject.data.id &&
        e.target.businessObject.data.id == interf.id;
    });

    if (!interfaceObject || !connectionObject) {
      console.error("Unknown interface or connection for", interf, interfaceObject, connectionObject);
      return;
    }

    // Add interface to list
    interfaces.push({
      interface: interf,
      coordinates: { x: interfaceObject.x, y: interfaceObject.y },
      // @ts-ignore
      waypoints: connectionObject.element.waypoints
    });
  });
  return interfaces;
}

export function serializeIssues(element: any, elementRegistry: any) {
  let issues: Array<SerializedIssueFolder> = [];
  element.businessObject.data.issues.forEach((issue: any) => {
    // Find issueFolder (diagram) object for issueFolder
    const issueObject = elementRegistry.get(issue.shapeId);

    if (!issueObject) {
      console.error("Unknown issueFolder for", issue, issueObject);
      return;
    }

    // Add issueFolder to list
    issues.push({
      issue: issue,
      coordinates: { x: issueObject.x, y: issueObject.y }
    });
  });
  return issues;
}
