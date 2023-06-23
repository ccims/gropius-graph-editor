import { GropiusInterface, GropiusIssue, ObjectType } from "../types";
import { Coordinates } from "../types";
import ElementRegistry from "diagram-js/lib/core/ElementRegistry";

import ELK from "elkjs/lib/elk.bundled.js";
const elk = new ELK();

export function autolayout(elementRegistry: ElementRegistry, canvas: any) {
  let graph = {
    id: "root",
    layoutOptions: {
      "elk.padding": "[top=0.0,left=0.0,bottom=0.0,right=0.0]",
      "elk.algorithm": "layered",
      "spacing.baseValue": "100",
      "hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "cycleBreaking.strategy": "INTERACTIVE",
      "layering.strategy": "INTERACTIVE",
      "crossingMinimization.semiInteractive": true,
      "separateConnectedComponents": false
    },
    children: Array<any>(),
    edges: Array<any>()
  };

  // @ts-ignore
  const elements = elementRegistry._elements;

  Object.values(elements).forEach((element: any) => {
    element = element.element;
    if (!element.businessObject) {
      return;
    }
    if (element.businessObject.type == ObjectType.ComponentVersion) {
      let group = {
        id: "group_root_" + element.id,
        layoutOptions: {
          "elk.padding": "[top=0.0,left=0.0,bottom=0.0,right=0.0]"
        },
        children: Array<any>(),
        edges: Array<any>()
      };

      let parent = {
        id: element.id,
        width: element.width,
        height: element.height + 40
      };
      group.children.push(parent);

      let issues = { // With issues
        id: "group_main",
        layoutOptions: {
          "elk.padding": "[top=0.0,left=0.0,bottom=0.0,right=0.0]",
          "spacing.baseValue": "10"
        },
        children: Array<any>(),
        edges: Array<any>()
      };

      let interfaces = {
        id: "group_interfaces",
        layoutOptions: {
          // "elk.algorithm": "layered",
          "elk.padding": "[top=0.0,left=0.0,bottom=0.0,right=0.0]",
          "spacing.baseValue": "50"
        },
        children: Array<any>(),
        edges: Array<any>()
      };

      // Layout Issue Folders
      element.businessObject.data.issues.forEach((issue: GropiusIssue) => {
        const element = elementRegistry.get(issue.shapeId);
        issues.children.push({
          id: element.id,
          width: element.width,
          height: element.height
        });
      });
      if (issues.children.length > 0)
        group.children.push(issues);

      // Layout Interfaces
      element.businessObject.data.interfaces.forEach((interf: GropiusInterface) => {
        const element = elementRegistry.get(interf.shapeId);
        interfaces.children.push({
          id: element.id,
          width: element.width,
          height: element.height + 40 // Give some space for Text underneath the interface
        });

        const connection = elementRegistry.get(interf.connectionId);
        group.edges.push({
          id: connection.id,
          sources: [connection.source.id],
          targets: [connection.target.id]
        });

      });
      if (interfaces.children.length > 0)
        group.children.push(interfaces);

      graph.children.push(group);
    } else if (element.businessObject.type == ObjectType.Connection) {
      graph.edges.push({
        id: element.id,
        sources: [element.source.id],
        targets: [element.target.id]
      });
    }
  });

  // @ts-ignore
  elk.layout(graph).then(graph => {
    layoutGroup(graph, 150, 100, elementRegistry, canvas);
  });
}

export function layoutGroup(node: any, x: number, y: number, elementRegistry: ElementRegistry, canvas: any) {
  x += node.x;
  y += node.y;
  node.children?.forEach((child: any) => {
    if (child.id == "root" || child.id.startsWith("group")) {
      layoutGroup(child, x, y, elementRegistry, canvas);
    } else {
      moveShape(child.id, x + child.x, y + child.y, elementRegistry, canvas);
    }
  });

  node.edges.forEach((edge: any) => {
    edge.sections.forEach((section: any) => {
      let waypoints = [section.startPoint];

      if (section.bendPoints)
        section.bendPoints.forEach((bp: Coordinates) => {
          waypoints.push(bp);
        });

      waypoints.push(section.endPoint);

      waypoints.forEach(wp => {
        wp.x += x;
        wp.y += y;
      });

      const connection = elementRegistry.get(edge.id);
      connection.waypoints = waypoints;
      canvas._eventBus.fire("element.changed", { element: connection });
    });
  });

}

export function moveShape(shapeId: string, x: number, y: number, elementRegistry: ElementRegistry, canvas: any) {
  const element = elementRegistry.get(shapeId);

  const deltaX = x - element.x,
    deltaY = y - element.y;

  if (deltaX === 0 && deltaY === 0)
    return;

  canvas._eventBus.fire("shape.move.move", {
    shape: element,
    context: {
      canExecute: true,
      shape: element,
      shapes: [element]
    },
    x: element.x,
    y: element.y,
    dx: deltaX,
    dy: deltaY
  });
}