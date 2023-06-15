// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import {
  GropiusConnection,
  GropiusConnectionStyle,
  GropiusInterface,
  GropiusIssueFolder,
  GropiusShape,
  GropiusType,
  ObjectType,
  SerializedDiagram,
  SerializedInterface,
  SerializedIssueFolder
} from "@/lib/gropius-compatibility/types";

import { ConnectionMarker, Shape } from "@/lib/diagram/types";

// @ts-ignore
import Diagram from "diagram-js";
import { Connection } from "diagram-js/lib/model";

import ELK from "elkjs/lib/elk.bundled.js";
import { scaleSvgPath } from "@/lib/gropius-compatibility/util";

const elk = new ELK();

const HEIGHT_PER_LINE = 20;
const WIDTH_PER_CHARACTER = 10;
const PADDING = 10;

export default class GropiusCompatibility {
  private container: any;
  private diagram: Diagram;
  private canvas: any;
  private elementFactory: any;
  private elementRegistry: any;
  private modeling: any;
  private root: any;

  public onAddShape?: (coordinates: Coordinates) => void;
  public onDeleteShape?: (id: string) => void;
  public onAddConnection?: (sourceId: string, targetId: string) => void;


  public init(container: Element) {
    this.container = container;
    // @ts-ignore
    this.diagram = new EditorLib(container);

    this.canvas = this.diagram.get("canvas");
    this.elementFactory = this.diagram.get("elementFactory");
    this.elementRegistry = this.diagram.get("elementRegistry");
    this.modeling = this.diagram.get("modeling");

    this.root = this.elementFactory.createRoot();
    this.canvas.setRootElement(this.root);

    this.canvas._eventBus.on("shape.added", (e: any) => {
      // Visual placeholder element is a "frame"
      if (!e.element.isFrame)
        return;
      const element = e.element;
      this.canvas.removeShape(element); // remove placeholder element

      const coordinates: Coordinates = {
        x: element.x,
        y: element.y
      };

      // Call event method. Flow is done, nothing happens from here
      if (this.onAddShape)
        this.onAddShape(coordinates);
    });

    this.canvas._eventBus.on("context.shape.delete", (e: any) => {
      const element = e.element;
      if (this.onDeleteShape && element.businessObject && element.businessObject.data) {
        this.onDeleteShape(e.element.businessObject.data.id);
      } else {
        console.error("Something went wrong on a delete event");
      }
    });

    this.canvas._eventBus.on("connection.added", (e: any) => {
      const element = e.element;

      // If connection has been created by API or UI
      if (element.customRendered)
        return; // Ignore if it's custom rendered, i.e. not by UI. Otherwise infinite recursion!

      this.canvas.removeConnection(element);

      if (this.onAddConnection) {
        try {
          this.onAddConnection(element.source.businessObject.data.id, element.target.businessObject.data.id);
        } catch (error) {
          console.error(error);
        }
      }

      // TODO: This is for dev purpose! It should get called by the frontend
      this.createConnectionBase(element, {
        strokeColor: "orange",
        strokeWidth: 3,
        strokeDasharray: "5 5",
        sourceMarkerType: ConnectionMarker.Round,
        targetMarkerType: ConnectionMarker.Right
      });
    });

  }

  private getCharacterCountForSize(width: number, height: number) {
    return Math.floor(((width - PADDING) / WIDTH_PER_CHARACTER) * ((height - PADDING) / HEIGHT_PER_LINE));
  }

  private getCharacterCountForSizeByType(width: number, height: number, shape: Shape) {
    let factor = 1;

    switch (shape) {
      case Shape.Diamond:
        factor = 3;
        break;
      case Shape.Triangle:
        factor = 3;
        break;
      case Shape.Octagon:
        factor = 1.25;
        break;
      case Shape.Circle:
      case Shape.Ellipse:
        factor = 1.5;
        break;
      case Shape.Hexagon:
        factor = 1.1;
        break;
    }

    return this.getCharacterCountForSize(width, height) / factor;
  }

  public getDimensions(minWidth: number, minHeight: number, maxScale: number, text: string, shape: Shape): { width: number, height: number, text: string } {

    const maxWidth = Math.floor(minWidth * maxScale);
    const maxHeight = Math.floor(minHeight * maxScale);

    let width = minWidth;
    let height = minHeight;
    let adjustedText = text;

    const characters = text.length;
    // max number of characters based on max size
    let estimatedMaxCharacters = this.getCharacterCountForSizeByType(maxWidth, maxHeight, shape);

    if (characters > estimatedMaxCharacters) {
      // If there are more characters than the max size would allow
      // Cut text and add "..." at the end
      // Theoretically not necessary but speeds things up
      // Like "pre-cutting". It will get shortened in rendering,
      // but to speed up the renderer we pre-cut it.
      // Disabled to avoid cutting too much. Is fine unless there is big text on small shape


      // adjustedText = text.slice(0, maxCharacters).slice(0,-3) + "..."

      width = maxWidth;
      height = maxHeight;
    } else {
      // There is room to resize

      let ratio = height / width;
      let charactersForSize = this.getCharacterCountForSizeByType(width, height, shape);

      const increaseBy = 10;
      while (characters > charactersForSize) {
        // while sizes not big enough
        width += increaseBy;
        width = width > maxWidth ? maxWidth : width;

        height = Math.round(ratio * width);
        height = height > maxHeight ? maxHeight : height;
        // additional loop breaker
        if (width == maxWidth && height == maxHeight)
          break;

        // recalculate the characters that fit in updated size
        charactersForSize = this.getCharacterCountForSizeByType(width, height, shape);
      }
    }

    const ret = {
      width: width,
      height: height,
      text: adjustedText
    };
    return ret;
  }

  public createComponentBase(grShape: GropiusShape, coordinates: Coordinates) {
    const componentObject = this.drawComponent(grShape, coordinates);
    componentObject.custom.versionObject = this.drawVersion(componentObject);
    componentObject.businessObject.data.shapeId = componentObject.id;
    return componentObject;
  }

  public createComponent(id: string, name: string, version: string, grType: GropiusType, coordinates: Coordinates) {
    const grShape: GropiusShape = {
      id: id,
      shapeId: "",
      name: name,
      version: version,
      grType: grType,
      interfaces: [],
      issueFolders: []
    };
    return this.createComponentBase(grShape, coordinates);
  }

  private drawComponent(grShape: GropiusShape, coordinates: Coordinates) {
    const grStyle = grShape.grType.style;

    let dimensions = this.getDimensions(grStyle.minWidth, grStyle.minHeight, grStyle.maxScale, grShape.name, grShape.grType.shape);
    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: dimensions.width,
      height: dimensions.height,
      businessObject: {
        type: ObjectType.Gropius,
        data: grShape
      },
      custom: {
        shape: grShape.grType.shape,
        style: {
          rx: grStyle.radius,
          ry: grStyle.radius,
          fill: grStyle.color,
          stroke: grStyle.stroke,
          strokeWidth: grStyle.strokeWidth,
          strokeDasharray: grStyle.strokeDasharray
        },
        label: dimensions.text,
        versionObject: undefined
      }
    };

    return this.createShape(shape);
  }

  private getVersionOffsetFromShape(componentShape: any): Coordinates {
    const shape = componentShape.custom.shape;
    const w = componentShape.width,
      h = componentShape.height,
      vh = 40, // version width
      vw = 90;  // version height

    switch (shape) {
      case Shape.Diamond:
      case Shape.Parallelogram:
      case Shape.Circle:
      case Shape.Octagon:
      case Shape.Triangle:
      case Shape.Hexagon:
      case Shape.Trapeze:
      case Shape.Ellipse:
      case Shape.Rectangle:
        //default:
        return { x: w / 2 - vw / 2, y: h };
    }

    return { x: 0, y: 0 };
  }

  private drawVersion(componentShape: any) {
    const offsets = this.getVersionOffsetFromShape(componentShape);
    const offsetX = offsets.x,
      offsetY = offsets.y;

    let shape = {
      x: componentShape.x + offsetX,
      y: componentShape.y + offsetY,
      width: 90,
      height: 40,
      businessObject: { type: ObjectType.Version },
      custom: {
        shape: Shape.Octagon,
        style: {
          rx: 0,
          ry: 0,
          fill: "#aaaaff",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: ""
        },
        label: componentShape.businessObject.data.version
      }
    };
    return this.createShape(shape);
  }

  private drawInterface(parentShape: any, interf: GropiusInterface, coordinates: Coordinates, waypoints?: Array<Coordinates>) {
    const parentBusinessObject = parentShape.businessObject.data;

    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: 50,
      height: 50,
      businessObject: {
        type: ObjectType.Interface,
        data: interf
      },
      custom: {
        shape: interf.shape,
        style: {
          rx: parentBusinessObject.grType.style.radius,
          ry: parentBusinessObject.grType.style.radius,
          fill: interf.openShape ? parentBusinessObject.grType.style.color : "#00000000",
          stroke: parentBusinessObject.grType.style.stroke,
          strokeWidth: parentBusinessObject.grType.style.strokeWidth,
          strokeDasharray: parentBusinessObject.grType.style.strokeDasharray
        },
        label: interf.name + "\n" + interf.version,
        parentObject: parentShape
      }
    };

    const diagramInterfaceObject = this.createShape(shape);
    diagramInterfaceObject.businessObject.data.shapeId = diagramInterfaceObject.id;

    // Set waypoints if not given
    if (!waypoints)
      waypoints = [
        { x: parentShape.x + parentShape.width, y: parentShape.y + parentShape.height / 2 },
        { x: diagramInterfaceObject.x, y: diagramInterfaceObject.y + diagramInterfaceObject.height / 2 }
      ];

    let con = this.createConnection(parentShape.businessObject.data.id, diagramInterfaceObject.businessObject.data.id, waypoints, {
      strokeColor: parentBusinessObject.grType.style.stroke,
      strokeWidth: 2,
      strokeDasharray: "",
      sourceMarkerType: ConnectionMarker.None,
      targetMarkerType: ConnectionMarker.ArrowRight
    }, true);

    diagramInterfaceObject.businessObject.data.connectionId = con.id;

    return diagramInterfaceObject;
  }

  public createInterface(id: string, parentId: string, name: string, shape: Shape, version: string, openShape = true, coordinates?: Coordinates, waypoints?: Array<Coordinates>) {
    let diagramParentObject = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == parentId);
    const parentBusinessObject = diagramParentObject.businessObject.data;

    // Set coordinates if not given. Default is middle-right of parent
    if (!coordinates)
      coordinates = {
        x: diagramParentObject.x + diagramParentObject.width + 40,
        y: diagramParentObject.y + diagramParentObject.height / 2 - 20
      };

    const interfaceObject: GropiusInterface = {
      id: id,
      shapeId: "",
      connectionId: "",
      name: name,
      shape: shape,
      openShape: openShape,
      version: version
    };

    this.drawInterface(diagramParentObject, interfaceObject, coordinates, waypoints);

    // Add interface to parent
    parentBusinessObject.interfaces.push(interfaceObject);
  }

  public createIssueFolder(id: string, parentId: string, path: string, color: string, coordinates?: Coordinates) {
    let diagramParentObject = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == parentId);
    const parentBusinessObject = diagramParentObject.businessObject.data;

    const issueFolderObject: GropiusIssueFolder = {
      id: id,
      shapeId: "",
      connectionId: "",
      path: path,
      color: color
    };

    if (!coordinates)
      coordinates = {
        x: diagramParentObject.x + diagramParentObject.width + 40,
        y: diagramParentObject.y + diagramParentObject.height / 2 - 20
      };

    this.drawIssueFolder(diagramParentObject, issueFolderObject, coordinates);

    parentBusinessObject.issueFolders.push(issueFolderObject);
  }

  private drawIssueFolder(parentShape: any, issueFolder: GropiusIssueFolder, coordinates: Coordinates) {
    const parentBusinessObject = parentShape.businessObject.data;

    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: 40,
      height: 40,
      businessObject: {
        type: ObjectType.IssueFolder,
        data: issueFolder
      },
      custom: {
        shape: issueFolder.path,
        style: {
          rx: 0,
          ry: 0,
          fill: issueFolder.color,
          stroke: "#00000000",
          strokeWidth: parentBusinessObject.grType.style.strokeWidth,
          strokeDasharray: ""
        },
        label: null,
        parentObject: parentShape
      }
    };

    const diagramIssueFolderObject = this.createShape(shape);
    diagramIssueFolderObject.businessObject.data.shapeId = diagramIssueFolderObject.id;

    return diagramIssueFolderObject;
  }

  public deleteShape(id: string): boolean {
    const element = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == id);

    if (!element.businessObject)
      return false;
    else if (element.businessObject.type == ObjectType.SubConnection)
      return false;

    this.modeling.removeElements([element]); // Delete main shape
    if (element.custom && element.custom.versionObject)
      this.modeling.removeElements([element.custom.versionObject]); // Delete attached version

    return true;
  }

  private createShape(shape: any) {
    const _shape = this.elementFactory.createShape(shape);
    this.canvas.addShape(_shape, this.root);
    return _shape;
  }

  private createConnectionBase(connection: Connection, style: GropiusConnectionStyle, isSubConnection = false) {
    // @ts-ignore
    connection.customRendered = true;
    // @ts-ignore
    connection.custom = {
      style: style,
      label: "" // TODO
    };

    const gropiusConnection: GropiusConnection = {
      id: connection.source.businessObject.data.id + "-" + connection.target.businessObject.data.id,
      sourceId: connection.source.businessObject.data.id,
      targetId: connection.target.businessObject.data.id
    };

    connection.businessObject = {
      type: isSubConnection ? ObjectType.SubConnection : ObjectType.Connection,
      data: gropiusConnection
    };

    return this.canvas.addConnection(connection, this.root);
  }

  public createConnection(sourceId: string, targetId: string, waypoints: Array<Coordinates>, style: GropiusConnectionStyle, isSubConnection = false) {
    const sourceElement = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == sourceId);
    const targetElement = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == targetId);

    let connection = this.elementFactory.createConnection({
      waypoints: waypoints,
      source: sourceElement,
      target: targetElement
    });

    return this.createConnectionBase(connection, style, isSubConnection);
  }

  public exportDiagram(): string {
    const elements = this.elementRegistry._elements;

    let diagram: SerializedDiagram = {
      shapes: [],
      connections: []
    };

    Object.values(elements).forEach((element: any) => {
      element = element.element;
      if (element.id.startsWith("shape")) {
        if (element.businessObject.type != ObjectType.Gropius) // Only serialize main components
          return;

        // Serialize interfaces
        const interfaces: Array<SerializedInterface> = this.serializeInterfaces(element);
        const issueFolders: Array<SerializedIssueFolder> = this.serializeIssueFolders(element);

        // Main (gropius) shape serialized
        const serializedShape = {
          grShape: element.businessObject.data,
          x: element.x,
          y: element.y,
          interfaces: interfaces,
          issueFolders: issueFolders
        };

        diagram.shapes.push(serializedShape);

      } else if (element.id.startsWith("connection")) {
        const source = element.source.businessObject.data.id;
        const target = element.target.businessObject.data.id;

        // If target ID starts with source ID -> Connection is a Sub-Connection (e.g. Component-to-Interface)
        if (target.startsWith(source))
          return;

        diagram.connections.push({
          sourceId: source,
          targetId: target,
          waypoints: element.waypoints,
          style: element.custom.style
        });
      }
    });

    const diagramAsText = JSON.stringify(diagram);
    console.log(diagram, diagramAsText);
    return diagramAsText;
  }

  private serializeInterfaces(element: any) {
    const elements = this.elementRegistry._elements;
    let interfaces: Array<SerializedInterface> = [];
    element.businessObject.data.interfaces.forEach((interf: any) => {
      // Find interface (diagram) object for interface
      const interfaceObject = this.elementRegistry.get(interf.shapeId);
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

  private serializeIssueFolders(element: any) {
    const elements = this.elementRegistry._elements;
    let issueFolders: Array<SerializedIssueFolder> = [];
    element.businessObject.data.issueFolders.forEach((issue: any) => {
      // Find issueFolder (diagram) object for issueFolder
      const issueObject = this.elementRegistry.get(issue.shapeId);

      if (!issueObject) {
        console.error("Unknown issueFolder for", issue, issueObject);
        return;
      }

      // Add issueFolder to list
      issueFolders.push({
        issueFolder: issue,
        coordinates: { x: issueObject.x, y: issueObject.y }
      });
    });
    return issueFolders;
  }

  public importDiagramString(diagram: string) {
    this.importDiagram(JSON.parse(diagram));
  }

  public importDiagram(diagram: SerializedDiagram) {
    diagram.shapes.forEach(shape => {
      const object = this.createComponentBase(shape.grShape, { x: shape.x, y: shape.y });
      shape.interfaces.forEach(interf => {
        this.drawInterface(object, interf.interface, interf.coordinates, interf.waypoints);
      });
      shape.issueFolders.forEach(issueFolder => {
        this.drawIssueFolder(object, issueFolder.issueFolder, issueFolder.coordinates);
      });
    });

    diagram.connections.forEach(connection => {
      this.createConnection(connection.sourceId, connection.targetId, connection.waypoints, connection.style);
    });
  }

  public setDarkMode(enabled: boolean): void {
    Object.values(this.elementRegistry._elements).forEach((element: any) => {
      element = element.element;

      if (!element.businessObject)
        return;

      const white = "#ffffff";
      const black = "#000000";
      const dark = "#444444";
      let stroke = black,
        fill = white;

      if (element.businessObject.type == ObjectType.Gropius) { // Main Gropius Component
        element.custom.style.whiteText = false;

        if (enabled) {
          // When enabled only change shapes with default color

          if (element.custom.style.stroke == black)
            stroke = white;
          else
            stroke = element.custom.style.stroke;

          if (element.custom.style.fill == white) {
            fill = dark;
            element.custom.style.whiteText = true;
          } else
            fill = element.custom.style.fill;
        } else {
          // Original color
          stroke = element.businessObject.data.grType.style.stroke;
          fill = element.businessObject.data.grType.style.color;
        }

        element.custom.style.stroke = stroke;
        element.custom.style.fill = fill;

        element.businessObject.data.interfaces.forEach((interf: any) => {
          const element = this.elementRegistry.get(interf.shapeId);
          if (interf.shape != Shape.InterfaceRequire)
            element.custom.style.fill = fill;
          element.custom.style.stroke = stroke;
          element.custom.style.whiteText = enabled;
        });

      } else if (element.businessObject.type == ObjectType.Version) { // Version Object
        element.custom.style.whiteText = false;

        if (enabled) {
          stroke = white;
          fill = "#444499";
          element.custom.style.whiteText = true;
        } else {
          stroke = black;
          fill = "#aaaaff";
        }

        element.custom.style.stroke = stroke;
        element.custom.style.fill = fill;
      } else if (element.businessObject.type == ObjectType.Connection || element.businessObject.type == ObjectType.SubConnection) {

        if (enabled && element.custom.style.strokeColor == black)
          stroke = white;
        else if (!enabled && element.custom.style.strokeColor == white) {
          stroke = black;
        } else
          return;

        element.custom.style.strokeColor = stroke;
      }
      this.canvas._eventBus.fire("element.changed", { element: element });
    });

    const container = document.getElementById("container");
    if (container)
      container.style.backgroundColor = enabled ? "#333" : "#fff";
    else
      console.error("Cannot find element with ID: Container");

  }

  public autolayout() {
    let graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "spacing.baseValue": "100",
        "hierarchyHandling": "INCLUDE_CHILDREN",
        "elk.edgeRouting": "ORTHOGONAL"
      },
      children: Array<any>(),
      edges: Array<any>()
    };

    const elements = this.elementRegistry._elements;

    Object.values(elements).forEach((element: any) => {
      element = element.element;
      if (!element.businessObject) {
        return;
      }
      if (element.businessObject.type == ObjectType.Gropius) {
        let group = {
          id: "group_root_" + element.id,
          layoutOptions: {
            // "elk.algorithm": "rectpacking",
            "spacing.baseValue": "40",
          },
          children: Array<any>(),
          edges: Array<any>()
        };

        let mainComponentGroupWithIssues = { // With issues
          id: "group_main",
          children: Array<any>(),
          edges: Array<any>()
        };
        let parent = {
          id: element.id,
          width: element.width,
          height: element.height
        };
        group.children.push(parent);


        let interfaces = {
          id: "group_interfaces",
          layoutOptions: {
            // "elk.algorithm": "layered",
            "spacing.baseValue": "50"
          },
          children: Array<any>(),
          edges: Array<any>()
        };

        // Layout Issue Folders
        element.businessObject.data.issueFolders.forEach((issueFolder: GropiusIssueFolder) => {
          const element = this.elementRegistry.get(issueFolder.shapeId);
          mainComponentGroupWithIssues.children.push({
            id: element.id,
            width: element.width,
            height: element.height
          });
        });
        if (mainComponentGroupWithIssues.children.length > 0)
          group.children.push(mainComponentGroupWithIssues);

        // Layout Interfaces
        element.businessObject.data.interfaces.forEach((interf: GropiusInterface) => {
          const element = this.elementRegistry.get(interf.shapeId);
          interfaces.children.push({
            id: element.id,
            width: element.width,
            height: element.height
          });

          const connection = this.elementRegistry.get(interf.connectionId);
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
        // console.log(element)
        graph.edges.push({
          id: element.id,
          sources: [element.source.id],
          targets: [element.target.id]
        });
      }
    });
    console.log("Raw graph", graph);

    // @ts-ignore
    elk.layout(graph).then(graph => {
      console.log("Layouted Graph", graph);
      this.layoutGroup(graph, 150, 100);
    });
  }

  private layoutGroup(node: any, x: number, y: number) {
    x += node.x;
    y += node.y;
    node.children?.forEach((child: any) => {
      if (child.id == "root" || child.id.startsWith("group")) {
        this.layoutGroup(child, x, y);
      } else {
        this.moveShape(child.id, x + child.x, y + child.y);
      }
    });

    node.edges.forEach((edge: any) => {
      edge.sections.forEach((section: any) => {
        let waypoints = [section.startPoint]

        if(section.bendPoints)
          section.bendPoints.forEach((bp: Coordinates) => {
            waypoints.push(bp)
          })

        waypoints.push(section.endPoint)

        waypoints.forEach(wp => {
          wp.x += x;
          wp.y += y;
        })

        const connection = this.elementRegistry.get(edge.id)
        connection.waypoints = waypoints
        this.canvas._eventBus.fire("element.changed", { element: connection });
      })
    })

  }

  public moveShape(shapeId: string, x: number, y: number) {
    const element = this.elementRegistry.get(shapeId);

    const deltaX = x - element.x,
      deltaY = y - element.y;

    if (deltaX === 0 && deltaY === 0)
      return;

    this.canvas._eventBus.fire("shape.move.move", {
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


  public test() {

    // this.importDiagramString("{\"shapes\":[{\"grShape\":{\"id\":\"1\",\"shapeId\":\"shape_13\",\"name\":\"Payment Service\",\"version\":\"1.42.0\",\"grType\":{\"name\":\"x\",\"shape\":1,\"style\":{\"minWidth\":150,\"minHeight\":150,\"maxScale\":10,\"color\":\"#ffffff\",\"stroke\":\"#ff55aa\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[{\"id\":\"11\",\"shapeId\":\"shape_15\",\"connectionId\":\"connection_16\",\"name\":\"Paypal\",\"shape\":9,\"openShape\":true,\"version\":\"1.0\"},{\"id\":\"12\",\"shapeId\":\"shape_17\",\"connectionId\":\"connection_18\",\"name\":\"CreditCard\",\"shape\":3,\"openShape\":true,\"version\":\"1.0\"},{\"id\":\"13\",\"shapeId\":\"shape_19\",\"connectionId\":\"connection_20\",\"name\":\"Goats\",\"shape\":4,\"openShape\":true,\"version\":\"1.0\"}],\"issueFolders\":[{\"id\":\"14\",\"shapeId\":\"shape_21\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#eef1c9\"}]},\"x\":403,\"y\":741,\"interfaces\":[{\"interface\":{\"id\":\"11\",\"shapeId\":\"shape_15\",\"connectionId\":\"connection_16\",\"name\":\"Paypal\",\"shape\":9,\"openShape\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":738},\"waypoints\":[{\"original\":{\"x\":553,\"y\":816},\"x\":441,\"y\":816},{\"x\":370,\"y\":816},{\"x\":370,\"y\":763},{\"original\":{\"x\":286,\"y\":763},\"x\":336,\"y\":763}]},{\"interface\":{\"id\":\"12\",\"shapeId\":\"shape_17\",\"connectionId\":\"connection_18\",\"name\":\"CreditCard\",\"shape\":3,\"openShape\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":838},\"waypoints\":[{\"original\":{\"x\":553,\"y\":816},\"x\":441,\"y\":816},{\"x\":370,\"y\":816},{\"x\":370,\"y\":863},{\"original\":{\"x\":286,\"y\":863},\"x\":336,\"y\":863}]},{\"interface\":{\"id\":\"13\",\"shapeId\":\"shape_19\",\"connectionId\":\"connection_20\",\"name\":\"Goats\",\"shape\":4,\"openShape\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":938},\"waypoints\":[{\"original\":{\"x\":553,\"y\":816},\"x\":441,\"y\":816},{\"x\":370,\"y\":816},{\"x\":370,\"y\":963},{\"original\":{\"x\":286,\"y\":963},\"x\":336,\"y\":963}]}],\"issueFolders\":[{\"issueFolder\":{\"id\":\"14\",\"shapeId\":\"shape_21\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#eef1c9\"},\"coordinates\":{\"x\":568,\"y\":741}}]},{\"grShape\":{\"id\":\"2\",\"shapeId\":\"shape_22\",\"name\":\"Order Service\",\"version\":\"1.0.0\",\"grType\":{\"name\":\"x\",\"shape\":0,\"style\":{\"minWidth\":150,\"minHeight\":150,\"maxScale\":5,\"color\":\"#ffccff\",\"stroke\":\"#000000\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[{\"id\":\"21\",\"shapeId\":\"shape_24\",\"connectionId\":\"connection_25\",\"name\":\"Generic\",\"shape\":10,\"openShape\":false,\"version\":\"1.0\"},{\"id\":\"22\",\"shapeId\":\"shape_26\",\"connectionId\":\"connection_27\",\"name\":\"Generic\",\"shape\":9,\"openShape\":true,\"version\":\"1.0\"}],\"issueFolders\":[{\"id\":\"23\",\"shapeId\":\"shape_28\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#33dd88\"},{\"id\":\"24\",\"shapeId\":\"shape_29\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},{\"id\":\"25\",\"shapeId\":\"shape_30\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},{\"id\":\"26\",\"shapeId\":\"shape_31\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},{\"id\":\"27\",\"shapeId\":\"shape_32\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd3311\"},{\"id\":\"28\",\"shapeId\":\"shape_33\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#0033bb\"}]},\"x\":403,\"y\":437,\"interfaces\":[{\"interface\":{\"id\":\"21\",\"shapeId\":\"shape_24\",\"connectionId\":\"connection_25\",\"name\":\"Generic\",\"shape\":10,\"openShape\":false,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":434},\"waypoints\":[{\"original\":{\"x\":553,\"y\":512},\"x\":403,\"y\":512},{\"x\":370,\"y\":512},{\"x\":370,\"y\":459},{\"original\":{\"x\":286,\"y\":459},\"x\":336,\"y\":459}]},{\"interface\":{\"id\":\"22\",\"shapeId\":\"shape_26\",\"connectionId\":\"connection_27\",\"name\":\"Generic\",\"shape\":9,\"openShape\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":534},\"waypoints\":[{\"original\":{\"x\":553,\"y\":512},\"x\":403,\"y\":512},{\"x\":370,\"y\":512},{\"x\":370,\"y\":559},{\"original\":{\"x\":286,\"y\":559},\"x\":336,\"y\":559}]}],\"issueFolders\":[{\"issueFolder\":{\"id\":\"23\",\"shapeId\":\"shape_28\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#33dd88\"},\"coordinates\":{\"x\":568,\"y\":437}},{\"issueFolder\":{\"id\":\"24\",\"shapeId\":\"shape_29\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},\"coordinates\":{\"x\":623,\"y\":437}},{\"issueFolder\":{\"id\":\"25\",\"shapeId\":\"shape_30\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},\"coordinates\":{\"x\":568,\"y\":492}},{\"issueFolder\":{\"id\":\"26\",\"shapeId\":\"shape_31\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},\"coordinates\":{\"x\":623,\"y\":492}},{\"issueFolder\":{\"id\":\"27\",\"shapeId\":\"shape_32\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd3311\"},\"coordinates\":{\"x\":568,\"y\":547}},{\"issueFolder\":{\"id\":\"28\",\"shapeId\":\"shape_33\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#0033bb\"},\"coordinates\":{\"x\":623,\"y\":547}}]},{\"grShape\":{\"id\":\"3\",\"shapeId\":\"shape_34\",\"name\":\"Shipping Service\",\"version\":\"2.13.37\",\"grType\":{\"name\":\"x\",\"shape\":5,\"style\":{\"minWidth\":100,\"minHeight\":100,\"maxScale\":5,\"color\":\"#11dd33\",\"stroke\":\"#000000\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[{\"id\":\"31\",\"shapeId\":\"shape_36\",\"connectionId\":\"connection_37\",\"name\":\"DHL\",\"shape\":9,\"openShape\":true,\"version\":\"1.0\"},{\"id\":\"32\",\"shapeId\":\"shape_38\",\"connectionId\":\"connection_39\",\"name\":\"DPD\",\"shape\":10,\"openShape\":false,\"version\":\"1.0\"}],\"issueFolders\":[{\"id\":\"33\",\"shapeId\":\"shape_40\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#040543\"},{\"id\":\"34\",\"shapeId\":\"shape_41\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#a1b2c3\"}]},\"x\":707,\"y\":139,\"interfaces\":[{\"interface\":{\"id\":\"31\",\"shapeId\":\"shape_36\",\"connectionId\":\"connection_37\",\"name\":\"DHL\",\"shape\":9,\"openShape\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":590,\"y\":136},\"waypoints\":[{\"original\":{\"x\":807,\"y\":189},\"x\":707,\"y\":189},{\"x\":674,\"y\":189},{\"x\":674,\"y\":161},{\"original\":{\"x\":590,\"y\":161},\"x\":640,\"y\":161}]},{\"interface\":{\"id\":\"32\",\"shapeId\":\"shape_38\",\"connectionId\":\"connection_39\",\"name\":\"DPD\",\"shape\":10,\"openShape\":false,\"version\":\"1.0\"},\"coordinates\":{\"x\":590,\"y\":236},\"waypoints\":[{\"original\":{\"x\":807,\"y\":189},\"x\":707,\"y\":189},{\"x\":674,\"y\":189},{\"x\":674,\"y\":261},{\"original\":{\"x\":590,\"y\":261},\"x\":640,\"y\":261}]}],\"issueFolders\":[{\"issueFolder\":{\"id\":\"33\",\"shapeId\":\"shape_40\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#040543\"},\"coordinates\":{\"x\":822,\"y\":139}},{\"issueFolder\":{\"id\":\"34\",\"shapeId\":\"shape_41\",\"connectionId\":\"\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#a1b2c3\"},\"coordinates\":{\"x\":822,\"y\":194}}]},{\"grShape\":{\"id\":\"4\",\"shapeId\":\"shape_42\",\"name\":\"Logging Service\",\"version\":\"10.10.10\",\"grType\":{\"name\":\"x\",\"shape\":1,\"style\":{\"minWidth\":150,\"minHeight\":100,\"maxScale\":5,\"color\":\"#999999\",\"stroke\":\"#000000\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[],\"issueFolders\":[]},\"x\":289,\"y\":139,\"interfaces\":[],\"issueFolders\":[]}],\"connections\":[]}");
    //this.autolayout()

    // return;

    const xl = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    const l = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tortor consequat id porta nibh venenatis cras. Sollicitudin tempor id eu nisl. Viverra tellus in hac habitasse platea dictumst.";
    const m = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    const s = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

    let a = this.createComponent("1", "Payment Service", "1.42.0", {
      name: "x",
      shape: Shape.Triangle,
      style: {
        minWidth: 150,
        minHeight: 150,
        maxScale: 10,
        color: "#ffffff",
        stroke: "#ff55aa",
        strokeWidth: 2,
        strokeDasharray: "",
        radius: 5
      }
    }, { x: 150, y: 100 });

    this.createInterface("11", "1", "Paypal", Shape.InterfaceProvide, "1.0", true);
    this.createInterface("12", "1", "CreditCard", Shape.Diamond, "1.0", true);
    this.createInterface("13", "1", "Goats", Shape.Hexagon, "1.0", true);
    let svgPath = "M16,5 C18.7614237,5 21,7.23857625 21,10 C21,10.3423792 20.9655872,10.6767209 20.9000316,10.9997548 C21.0507855,11.1120501 21.1957294,11.2342462 21.3333022,11.3641649 L24.8356362,8.25259068 L26.1643638,9.74740932 L22.4907621,13.0133863 C22.7546865,13.622313 22.9009805,14.2940721 22.9009805,15 C22.9009805,15.2442571 22.8830821,15.4880712 22.8474788,15.7294892 L27.1788854,16.5161301 L26.8211146,18.4838699 L22.4611146,17.69 L21.8641146,20.674 L25.7682213,25.3598156 L24.2317787,26.6401844 L21.0381198,22.8087468 C20.1297475,24.1456263 18.5994991,25 16.9009805,25 L15.0990195,25 C13.4000729,25 11.8694812,24.1451956 10.9611935,22.807736 L7.76822128,26.6401844 L6.23177872,25.3598156 L10.1351146,20.674 L9.53811456,17.69 L5.17888544,18.4838699 L4.82111456,16.5161301 L9.15247082,15.7299431 C9.0111947,14.7780252 9.15007412,13.8429995 9.51021231,13.0132111 L5.83563616,9.74740932 L7.16436384,8.25259068 L10.6647144,11.3651451 C10.802617,11.2346034 10.9483006,11.111583 11.1012234,10.9968969 C11.0342829,10.6754567 11,10.341732 11,10 C11,7.23857625 13.2385763,5 16,5 Z M20.662995,13.8270049 L20.5930614,13.6745856 C20.5778829,13.6438149 20.5621925,13.613342 20.5460011,13.5831782 L20.5927989,13.6740536 C20.567361,13.62251 20.5404863,13.5718026 20.512227,13.5219836 L20.5460011,13.5831782 C20.518133,13.5312609 20.4887809,13.4802589 20.4580017,13.430229 L20.512227,13.5219836 C20.4835377,13.4714064 20.4534214,13.4217449 20.4219328,13.3730537 L20.4580017,13.430229 C20.4310907,13.3864866 20.4030887,13.3434872 20.3740336,13.3012688 L20.4219328,13.3730537 C20.3839576,13.3143322 20.3439865,13.2570221 20.3021155,13.2012193 L20.3740336,13.3012688 C20.3416681,13.2542403 20.3079959,13.2081808 20.2730694,13.1631429 L20.3021155,13.2012193 C20.2689958,13.1570795 20.2346873,13.1138828 20.1992377,13.0716767 L20.2730694,13.1631429 C20.239098,13.1193365 20.20394,13.0764965 20.1676436,13.0346712 L20.0605208,12.9182041 L20.0605208,12.9182041 C19.9692376,12.8234261 19.8717762,12.7346536 19.7687854,12.652531 C19.7516851,12.6386152 19.7345687,12.6252808 19.7173054,12.6121294 L19.7173565,12.6124267 L19.6173174,12.539156 C19.5954381,12.5238676 19.5733455,12.5088636 19.5510448,12.4941493 L19.4404284,12.4245698 C19.4196314,12.4121117 19.3986709,12.3998984 19.3775509,12.3879338 L19.4399804,12.4244216 C19.3897371,12.3943184 19.3385391,12.3656457 19.2864426,12.3384595 L19.3775509,12.3879338 C19.3185981,12.3545367 19.2584029,12.3230778 19.1970519,12.2936436 L19.2864426,12.3384595 C19.2272919,12.307592 19.1669828,12.2786408 19.1055979,12.2516877 L19.1051516,12.2514524 L19.0221754,12.2165317 C19.016872,12.2143934 19.011561,12.2122699 19.0062427,12.2101611 L18.9312985,12.1816065 L18.9312985,12.1816065 L18.8392258,12.149637 C18.8318965,12.1472259 18.8245548,12.1448422 18.8172006,12.1424861 C18.772016,12.1280301 18.7270549,12.1147913 18.6816684,12.102591 L18.8172006,12.1424861 C18.7521062,12.1216315 18.6860439,12.1029395 18.6190984,12.0864946 L18.4365553,12.0476686 C18.4292922,12.0463597 18.4220199,12.045077 18.4147387,12.0438204 L18.4366759,12.0476908 C18.3744888,12.0364809 18.3116354,12.0271879 18.2481793,12.0198749 L18.4147387,12.0438204 C18.3041967,12.0247441 18.1915838,12.0117172 18.0772533,12.0050927 L17.9009805,12 L14.0990195,12 C13.992514,12 13.8861489,12.0056717 13.7803739,12.0169705 C13.780603,12.0185149 13.7808971,12.0188379 13.7811912,12.019161 L13.6653062,12.0315168 L13.6653062,12.0315168 L13.5106711,12.058258 L13.5106711,12.058258 L13.3175306,12.1034603 C13.301675,12.1077214 13.2858805,12.1121045 13.2701477,12.1166082 C13.2216274,12.1304913 13.173342,12.145643 13.1256774,12.1619228 L13.2701477,12.1166082 C13.1455008,12.1522903 13.0247325,12.1955484 12.9082507,12.2457709 L12.8954184,12.2513394 C12.7802697,12.3016289 12.6693474,12.3587392 12.5630487,12.4220745 C12.5454678,12.4325458 12.5276146,12.4434363 12.5098957,12.4545022 L12.5630487,12.4220745 C12.5108461,12.4531781 12.4597585,12.485783 12.4098331,12.5198186 L12.5098957,12.4545022 C12.4376483,12.4996221 12.3676328,12.5476566 12.2999795,12.59841 L12.2995722,12.5987155 L12.2655303,12.6246461 C12.2539751,12.6335793 12.2424912,12.6425929 12.2310793,12.6516857 L12.1716472,12.7002998 L12.1716472,12.7002998 L12.1048932,12.7580461 C12.0910472,12.7703849 12.0773222,12.7828464 12.0637198,12.7954284 L12.0366109,12.8208167 L12.0366109,12.8208167 L11.986156,12.8697932 C11.9702713,12.8855777 11.95457,12.9015329 11.9390547,12.9176551 C11.922135,12.935238 11.905527,12.9529206 11.8891409,12.9707948 L11.9390547,12.9176551 C11.8977145,12.9606119 11.8576939,13.0047541 11.8190398,13.0500112 L11.8891409,12.9707948 C11.8453751,13.018535 11.8031917,13.0676423 11.7626509,13.1180263 L11.8190398,13.0500112 C11.7814207,13.0940566 11.7450958,13.1391581 11.7101084,13.1852509 L11.7626509,13.1180263 C11.675746,13.2260314 11.5963888,13.3399036 11.5251722,13.4587534 C11.5082615,13.4869824 11.4919822,13.5151821 11.4761601,13.543645 C11.4597989,13.5730738 11.4438506,13.6029316 11.4284043,13.6330607 L11.4761601,13.543645 C11.4512853,13.5883929 11.4275402,13.6337913 11.4049546,13.6797954 L11.4284043,13.6330607 C11.401341,13.6858497 11.375819,13.7394714 11.3518847,13.7938561 L11.4049546,13.6797954 C11.3760726,13.7386248 11.3490868,13.7984446 11.3240598,13.8591612 L11.3518847,13.7938561 C11.3255639,13.8536635 11.3011632,13.9143938 11.2787443,13.9759543 L11.3240598,13.8591612 C11.1269914,14.337257 11.0513706,14.8709551 11.1277013,15.4145 L11.1572775,15.5883484 L11.3431146,16.516 L11.5391146,17.5 L12.1572775,20.5883484 C12.174149,20.672706 12.1944614,20.7556418 12.218051,20.8370215 C12.2306975,20.8806382 12.2442181,20.9236099 12.2586465,20.9661183 L12.218051,20.8370215 C12.23212,20.8855572 12.2473548,20.9335395 12.2637206,20.9809398 L12.2586465,20.9661183 C12.2765309,21.0188082 12.29581,21.0707863 12.3164367,21.1220137 L12.2637206,20.9809398 C12.6570487,22.1201393 13.7036435,22.9231783 14.9213539,22.9947874 L15.0990195,23 L16.9009805,23 C18.2027702,23 19.3398208,22.1635544 19.7448646,20.9557114 C19.766267,20.8918757 19.7855755,20.8271903 19.8027681,20.7615416 L19.8427225,20.5883484 L20.1597787,19 L20.1601146,18.999 L20.8427225,15.5883484 C20.8814664,15.3946289 20.9009805,15.197556 20.9009805,15 C20.9009805,14.6449598 20.8393054,14.3043246 20.7260846,13.9882237 L20.662995,13.8270049 L20.662995,13.8270049 Z M16,7 C14.3431458,7 13,8.34314575 13,10 L13.0040607,10.1213387 C13.0419936,10.1128428 13.0801209,10.1047602 13.1184388,10.0970966 C13.4413048,10.0325234 13.7697596,10 14.0990195,10 L17.9009805,10 C18.2771497,10 18.6436165,10.0415405 18.996044,10.1202845 L19,10 L19,10 C19,8.34314575 17.6568542,7 16,7 Z";
    svgPath = scaleSvgPath(svgPath, 1.8, -9, -9);

    this.createIssueFolder("14", "1", svgPath, "#ff0000");

    let b = this.createComponent("2", "Order Service", "1.0.0", {
      name: "x",
      shape: Shape.Rectangle,
      style: {
        minWidth: 150,
        minHeight: 150,
        maxScale: 5,
        color: "#ffccff",
        stroke: "#000000",
        strokeWidth: 2,
        strokeDasharray: "",
        radius: 5
      }
    }, { x: 150, y: 250 });

    // GOTO1
    this.createInterface("21", "2", "Generic", Shape.InterfaceRequire, "1.0", false);
    this.createInterface("22", "2", "Generic", Shape.InterfaceProvide, "1.0", true);
    this.createIssueFolder("23", "2", svgPath, "#33dd88");
    this.createIssueFolder("24", "2", svgPath, "#00bbbb");
    this.createIssueFolder("25", "2", svgPath, "#dd11bb");
    this.createIssueFolder("26", "2", svgPath, "#aa33bb");
    this.createIssueFolder("27", "2", svgPath, "#7733ff");
    this.createIssueFolder("28", "2", svgPath, "#0033bb");

    let c = this.createComponent("3", "Shipping Service", "2.13.37", {
      name: "x",
      shape: Shape.Octagon,
      style: {
        minWidth: 100,
        minHeight: 100,
        maxScale: 5,
        color: "#11dd33",
        stroke: "#000000",
        strokeWidth: 2,
        strokeDasharray: "",
        radius: 5
      }
    }, { x: 150, y: 250 });

    this.createInterface("31", "3", "DHL", Shape.InterfaceProvide, "1.0", true);
    this.createInterface("32", "3", "DPD", Shape.InterfaceRequire, "1.0", false);
    this.createIssueFolder("33", "3", svgPath, "#040543");
    this.createIssueFolder("34", "3", svgPath, "#a1b2c3");

    let d = this.createComponent("4", "Logging Service", "10.10.10", {
      name: "x",
      shape: Shape.Triangle,
      style: {
        minWidth: 150,
        minHeight: 100,
        maxScale: 5,
        color: "#999999",
        stroke: "#000000",
        strokeWidth: 2,
        strokeDasharray: "",
        radius: 5
      }
    }, { x: 150, y: 250 });

    this.createConnection("1", "2", [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], {
      sourceMarkerType: ConnectionMarker.None,
      strokeColor: "#00ff00",
      strokeDasharray: "",
      strokeWidth: 2,
      targetMarkerType: ConnectionMarker.ArrowRight
    });

    this.autolayout();

    // let connection1 = this.elementFactory.createConnection({
    //     waypoints: [
    //         {x: shape1.x, y: shape1.y},
    //         {x: shape2.x, y: shape2.y},
    //     ],
    //     source: shape1,
    //     target: shape2,
    // });
    //
    // this.canvas.addConnection(connection1, this.root);

  }
}
