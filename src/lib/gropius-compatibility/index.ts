// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import {
  GropiusConnectionStyle, GropiusInterface, GropiusIssueFolder,
  GropiusShape, GropiusType,
  ObjectType,
  SerializedDiagram, SerializedInterface, SerializedIssueFolder
} from "@/lib/gropius-compatibility/types";

import { ConnectionMarker, Shape } from "@/lib/diagram/types";

// @ts-ignore
import Diagram from "diagram-js";
import { Connection } from "diagram-js/lib/model";

import ELK from "elkjs";

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
  private gropiusShapeNameMap = new Map<string, string>([
    ["ComponentVersion", "shape-gropius-component_version"],
    ["Library", "shape-gropius-library"]
  ]);

  public onAddShape?: (coordinates: Coordinates) => void;
  public onDeleteShape?: (element: any) => void;
  public onAddConnection?: (connection: Connection) => void;


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
      if (!e.element.isFrame)
        return;
      const element = e.element;
      this.canvas.removeShape(element);

      const coordinates: Coordinates = {
        x: element.x,
        y: element.y
      };

      if (this.onAddShape)
        this.onAddShape(coordinates);
    });

    this.canvas._eventBus.on("context.shape.delete", (e: any) => {
      // TODO Uncomment this and delete last line
      // if (this.onDeleteShape)
      //   this.onDeleteShape(e.element);
      this.deleteShape(e.element);
    });

    this.canvas._eventBus.on("connection.added", (e: any) => {
      const element = e.element;

      // If connection has been created by API or UI
      if (element.customRendered)
        return; // Ignore if it custom rendered, i.e. not by UI. Otherwise infinite recursion!

      this.canvas.removeConnection(element);

      if (this.onAddConnection)
        this.onAddConnection(e.element);

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
      vh = 50, // version width
      vw = 80;  // version height

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
      width: 80,
      height: 50,
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

    let con = this.createConnection(parentShape, diagramInterfaceObject, waypoints, {
      strokeColor: parentBusinessObject.grType.style.stroke,
      strokeWidth: 2,
      strokeDasharray: "",
      sourceMarkerType: ConnectionMarker.None,
      targetMarkerType: ConnectionMarker.ArrowRight
    }, true);

    diagramInterfaceObject.businessObject.data.connectionId = con.id;

    return diagramInterfaceObject;
  }

  public createInterface(gropiusId: string, name: string, shape: Shape, version: string, provide = true, coordinates?: Coordinates, waypoints?: Array<Coordinates>) {
    let diagramParentObject = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == gropiusId);
    const parentBusinessObject = diagramParentObject.businessObject.data;
    const interfaceId = parentBusinessObject.id + "-" + name + "-" + provide;

    // Set coordinates if not given. Default is middle-right of parent
    if (!coordinates)
      coordinates = {
        x: diagramParentObject.x + diagramParentObject.width + 40,
        y: diagramParentObject.y + diagramParentObject.height / 2 - 20
      };

    const interfaceObject: GropiusInterface = {
      id: interfaceId,
      shapeId: "",
      connectionId: "",
      name: name,
      shape: shape,
      openShape: provide,
      version: version
    };

    this.drawInterface(diagramParentObject, interfaceObject, coordinates, waypoints);

    // Add interface to parent
    parentBusinessObject.interfaces.push(interfaceObject);
  }

  public createIssueFolder(parentId: string, id: string, path: string, color: string, coordinates?: Coordinates) {
    let diagramParentObject = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == parentId);
    const parentBusinessObject = diagramParentObject.businessObject.data;
    const interfaceId = parentBusinessObject.id + "-" + id;

    const issueFolderObject: GropiusIssueFolder = {
      id: interfaceId,
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

  public deleteShape(element: any): boolean {

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

    connection.businessObject = {
      type: isSubConnection ? ObjectType.SubConnection : ObjectType.Connection
    };

    return this.canvas.addConnection(connection, this.root);
  }

  public createConnection(source: any, target: any, waypoints: Array<Coordinates>, style: GropiusConnectionStyle, isSubConnection = false) {
    let connection = this.elementFactory.createConnection({
      waypoints: waypoints,
      source: source,
      target: target
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
      // Find connection object for shape-to-issue connection
      const connectionObject = Object.values(elements).find((e: any) => {
        e = e.element;
        if (!e.id.startsWith("connection"))
          return false;

        return e.source.businessObject.data.id == element.businessObject.data.id &&
          e.target.businessObject.data.id == issue.id;
      });

      if (!issueObject || !connectionObject) {
        console.error("Unknown issueFolder or connection for", issue, issueObject, connectionObject);
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
      const source = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == connection.sourceId);
      let target = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == connection.targetId);

      if (!source || !target) {
        console.error("Unknown source or target for connection:", connection);
        return;
      }

      this.createConnection(source, target, connection.waypoints, connection.style);
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

    const container = document.getElementById("container")
    if(container)
      container.style.backgroundColor = enabled ? '#333' : '#fff'
    else
      console.error("Cannot find element with ID: Container")

  }

  public autolayout() {
    let graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "spacing.baseValue": "100"
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
            "elk.algorithm": "layered",
            "spacing.baseValue": "40"
          },
          children: Array<any>(),
          edges: Array<any>()
        };

        let mainComponentGroupWithIssues = { // With issues
          id: "group_main",
          layoutOptions: {
            "elk.algorithm": "rectpacking",
            "spacing.baseValue": "50"
          },
          children: Array<any>(),
          edges: Array<any>()
        };
        let parent = {
          id: element.id,
          width: element.width,
          height: element.height
        };
        mainComponentGroupWithIssues.children.push(parent);


        let interfaces = {
          id: "group_interfaces",
          layoutOptions: {
            "elk.algorithm": "layered",
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
          id: "" + Math.random(),
          sources: [element.source.id],
          targets: [element.target.id]
        });
      }
    });
    console.log("Raw graph", graph);

    // @ts-ignore
    elk.layout(graph).then(graph => {
      console.log("Layouted Graph", graph);
      this.layoutGroup(graph, 250, 100);
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

    // this.importDiagramString("{\"shapes\":[{\"grShape\":{\"id\":\"1\",\"shapeId\":\"shape_13\",\"name\":\"Payment Service\",\"version\":\"1.42.0\",\"grType\":{\"name\":\"x\",\"shape\":1,\"style\":{\"minWidth\":150,\"minHeight\":150,\"maxScale\":10,\"color\":\"#ffffff\",\"stroke\":\"#ff55aa\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[{\"id\":\"1-Paypal-true\",\"shapeId\":\"shape_15\",\"connectionId\":\"connection_16\",\"name\":\"Paypal\",\"shape\":9,\"provide\":true,\"version\":\"1.0\"},{\"id\":\"1-CreditCard-true\",\"shapeId\":\"shape_17\",\"connectionId\":\"connection_18\",\"name\":\"CreditCard\",\"shape\":3,\"provide\":true,\"version\":\"1.0\"},{\"id\":\"1-Goats-true\",\"shapeId\":\"shape_19\",\"connectionId\":\"connection_20\",\"name\":\"Goats\",\"shape\":4,\"provide\":true,\"version\":\"1.0\"}],\"issueFolders\":[{\"id\":\"1-070707\",\"shapeId\":\"shape_21\",\"connectionId\":\"connection_22\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#eef1c9\"}]},\"x\":926,\"y\":478,\"interfaces\":[{\"interface\":{\"id\":\"1-Paypal-true\",\"shapeId\":\"shape_15\",\"connectionId\":\"connection_16\",\"name\":\"Paypal\",\"shape\":9,\"provide\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":1082,\"y\":136},\"waypoints\":[{\"original\":{\"x\":1001,\"y\":553},\"x\":1001,\"y\":478},{\"x\":1001,\"y\":161},{\"original\":{\"x\":1082,\"y\":161},\"x\":1082,\"y\":161}]},{\"interface\":{\"id\":\"1-CreditCard-true\",\"shapeId\":\"shape_17\",\"connectionId\":\"connection_18\",\"name\":\"CreditCard\",\"shape\":3,\"provide\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":1082,\"y\":236},\"waypoints\":[{\"original\":{\"x\":1001,\"y\":553},\"x\":1001,\"y\":478},{\"x\":1001,\"y\":261},{\"original\":{\"x\":1082,\"y\":261},\"x\":1082,\"y\":261}]},{\"interface\":{\"id\":\"1-Goats-true\",\"shapeId\":\"shape_19\",\"connectionId\":\"connection_20\",\"name\":\"Goats\",\"shape\":4,\"provide\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":1082,\"y\":336},\"waypoints\":[{\"original\":{\"x\":1001,\"y\":553},\"x\":1001,\"y\":478},{\"x\":1001,\"y\":361},{\"original\":{\"x\":1082,\"y\":361},\"x\":1082,\"y\":361}]}],\"issueFolders\":[{\"issueFolder\":{\"id\":\"1-070707\",\"shapeId\":\"shape_21\",\"connectionId\":\"connection_22\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#eef1c9\"},\"coordinates\":{\"x\":938,\"y\":136},\"waypoints\":[{\"original\":{\"x\":979,\"y\":553},\"x\":979,\"y\":522},{\"x\":979,\"y\":327},{\"x\":938,\"y\":327},{\"original\":{\"x\":938,\"y\":156},\"x\":938,\"y\":176}]}]},{\"grShape\":{\"id\":\"2\",\"shapeId\":\"shape_23\",\"name\":\"Order Service\",\"version\":\"1.0.0\",\"grType\":{\"name\":\"x\",\"shape\":0,\"style\":{\"minWidth\":150,\"minHeight\":150,\"maxScale\":5,\"color\":\"#ffccff\",\"stroke\":\"#000000\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[{\"id\":\"2-Generic-false\",\"shapeId\":\"shape_25\",\"connectionId\":\"connection_26\",\"name\":\"Generic\",\"shape\":10,\"provide\":false,\"version\":\"1.0\"},{\"id\":\"2-Generic-true\",\"shapeId\":\"shape_27\",\"connectionId\":\"connection_28\",\"name\":\"Generic\",\"shape\":9,\"provide\":true,\"version\":\"1.0\"}],\"issueFolders\":[{\"id\":\"2-123\",\"shapeId\":\"shape_29\",\"connectionId\":\"connection_30\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#33dd88\"},{\"id\":\"2-456\",\"shapeId\":\"shape_31\",\"connectionId\":\"connection_32\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},{\"id\":\"2-789\",\"shapeId\":\"shape_33\",\"connectionId\":\"connection_34\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},{\"id\":\"2-987\",\"shapeId\":\"shape_35\",\"connectionId\":\"connection_36\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"}]},\"x\":428,\"y\":752,\"interfaces\":[{\"interface\":{\"id\":\"2-Generic-false\",\"shapeId\":\"shape_25\",\"connectionId\":\"connection_26\",\"name\":\"Generic\",\"shape\":10,\"provide\":false,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":764},\"waypoints\":[{\"original\":{\"x\":578,\"y\":827},\"x\":428,\"y\":827},{\"x\":382,\"y\":827},{\"x\":382,\"y\":789},{\"original\":{\"x\":286,\"y\":789},\"x\":336,\"y\":789}]},{\"interface\":{\"id\":\"2-Generic-true\",\"shapeId\":\"shape_27\",\"connectionId\":\"connection_28\",\"name\":\"Generic\",\"shape\":9,\"provide\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":286,\"y\":864},\"waypoints\":[{\"original\":{\"x\":578,\"y\":827},\"x\":428,\"y\":827},{\"x\":382,\"y\":827},{\"x\":382,\"y\":889},{\"original\":{\"x\":286,\"y\":889},\"x\":336,\"y\":889}]}],\"issueFolders\":[{\"issueFolder\":{\"id\":\"2-123\",\"shapeId\":\"shape_29\",\"connectionId\":\"connection_30\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#33dd88\"},\"coordinates\":{\"x\":286,\"y\":1018},\"waypoints\":[{\"original\":{\"x\":578,\"y\":827},\"x\":428,\"y\":827},{\"x\":395,\"y\":827},{\"x\":395,\"y\":1038},{\"original\":{\"x\":286,\"y\":1038},\"x\":326,\"y\":1038}]},{\"issueFolder\":{\"id\":\"2-456\",\"shapeId\":\"shape_31\",\"connectionId\":\"connection_32\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},\"coordinates\":{\"x\":286,\"y\":1108},\"waypoints\":[{\"original\":{\"x\":578,\"y\":827},\"x\":428,\"y\":827},{\"x\":394,\"y\":827},{\"x\":394,\"y\":1128},{\"original\":{\"x\":286,\"y\":1128},\"x\":326,\"y\":1128}]},{\"issueFolder\":{\"id\":\"2-789\",\"shapeId\":\"shape_33\",\"connectionId\":\"connection_34\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},\"coordinates\":{\"x\":286,\"y\":1198},\"waypoints\":[{\"original\":{\"x\":578,\"y\":827},\"x\":428,\"y\":827},{\"x\":393,\"y\":827},{\"x\":393,\"y\":1218},{\"original\":{\"x\":286,\"y\":1218},\"x\":326,\"y\":1218}]},{\"issueFolder\":{\"id\":\"2-987\",\"shapeId\":\"shape_35\",\"connectionId\":\"connection_36\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#dd33bb\"},\"coordinates\":{\"x\":286,\"y\":1288},\"waypoints\":[{\"original\":{\"x\":578,\"y\":827},\"x\":428,\"y\":827},{\"x\":392,\"y\":827},{\"x\":392,\"y\":1308},{\"original\":{\"x\":286,\"y\":1308},\"x\":326,\"y\":1308}]}]},{\"grShape\":{\"id\":\"3\",\"shapeId\":\"shape_37\",\"name\":\"Shipping Service\",\"version\":\"2.13.37\",\"grType\":{\"name\":\"x\",\"shape\":5,\"style\":{\"minWidth\":100,\"minHeight\":100,\"maxScale\":5,\"color\":\"#11dd33\",\"stroke\":\"#000000\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[{\"id\":\"3-DHL-true\",\"shapeId\":\"shape_39\",\"connectionId\":\"connection_40\",\"name\":\"DHL\",\"shape\":9,\"provide\":true,\"version\":\"1.0\"},{\"id\":\"3-DPD-false\",\"shapeId\":\"shape_41\",\"connectionId\":\"connection_42\",\"name\":\"DPD\",\"shape\":10,\"provide\":false,\"version\":\"1.0\"}],\"issueFolders\":[{\"id\":\"3-#94f543\",\"shapeId\":\"shape_43\",\"connectionId\":\"connection_44\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#040543\"},{\"id\":\"3-#94f543\",\"shapeId\":\"shape_45\",\"connectionId\":\"connection_46\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#a1b2c3\"}]},\"x\":548,\"y\":124,\"interfaces\":[{\"interface\":{\"id\":\"3-DHL-true\",\"shapeId\":\"shape_39\",\"connectionId\":\"connection_40\",\"name\":\"DHL\",\"shape\":9,\"provide\":true,\"version\":\"1.0\"},\"coordinates\":{\"x\":560,\"y\":370},\"waypoints\":[{\"original\":{\"x\":648,\"y\":174},\"x\":648,\"y\":174},{\"x\":667,\"y\":174},{\"x\":667,\"y\":297},{\"x\":585,\"y\":297},{\"original\":{\"x\":585,\"y\":395},\"x\":585,\"y\":370}]},{\"interface\":{\"id\":\"3-DPD-false\",\"shapeId\":\"shape_41\",\"connectionId\":\"connection_42\",\"name\":\"DPD\",\"shape\":10,\"provide\":false,\"version\":\"1.0\"},\"coordinates\":{\"x\":560,\"y\":470},\"waypoints\":[{\"original\":{\"x\":648,\"y\":174},\"x\":648,\"y\":174},{\"x\":667,\"y\":174},{\"x\":667,\"y\":474},{\"original\":{\"x\":585,\"y\":474},\"x\":589,\"y\":474}]}],\"issueFolders\":[{\"issueFolder\":{\"id\":\"3-#94f543\",\"shapeId\":\"shape_43\",\"connectionId\":\"connection_44\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#040543\"},\"coordinates\":{\"x\":740,\"y\":136},\"waypoints\":[{\"original\":{\"x\":648,\"y\":174},\"x\":648,\"y\":174},{\"x\":694,\"y\":174},{\"x\":694,\"y\":156},{\"original\":{\"x\":740,\"y\":156},\"x\":740,\"y\":156}]},{\"issueFolder\":{\"id\":\"3-#94f543\",\"shapeId\":\"shape_45\",\"connectionId\":\"connection_46\",\"path\":\"M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40\",\"color\":\"#a1b2c3\"},\"coordinates\":{\"x\":740,\"y\":226},\"waypoints\":[{\"original\":{\"x\":648,\"y\":174},\"x\":648,\"y\":174},{\"x\":694,\"y\":174},{\"x\":694,\"y\":156},{\"original\":{\"x\":740,\"y\":156},\"x\":740,\"y\":156}]}]},{\"grShape\":{\"id\":\"4\",\"shapeId\":\"shape_47\",\"name\":\"Logging Service\",\"version\":\"10.10.10\",\"grType\":{\"name\":\"x\",\"shape\":1,\"style\":{\"minWidth\":150,\"minHeight\":100,\"maxScale\":5,\"color\":\"#999999\",\"stroke\":\"#000000\",\"strokeWidth\":2,\"strokeDasharray\":\"\",\"radius\":5}},\"interfaces\":[],\"issueFolders\":[]},\"x\":274,\"y\":124,\"interfaces\":[],\"issueFolders\":[]}],\"connections\":[{\"sourceId\":\"2\",\"targetId\":\"4\",\"waypoints\":[{\"original\":{\"x\":503,\"y\":827},\"x\":503,\"y\":752},{\"x\":503,\"y\":488},{\"x\":347,\"y\":488},{\"original\":{\"x\":347,\"y\":189},\"x\":347,\"y\":224}],\"style\":{\"strokeColor\":\"orange\",\"strokeWidth\":3,\"strokeDasharray\":\"5 5\",\"sourceMarkerType\":3,\"targetMarkerType\":1}},{\"sourceId\":\"2-Generic-false\",\"targetId\":\"1-CreditCard-true\",\"waypoints\":[{\"original\":{\"x\":311,\"y\":789},\"x\":311,\"y\":764},{\"x\":311,\"y\":723},{\"x\":1245,\"y\":723},{\"x\":1245,\"y\":257},{\"original\":{\"x\":1093,\"y\":257},\"x\":1128,\"y\":257}],\"style\":{\"strokeColor\":\"orange\",\"strokeWidth\":3,\"strokeDasharray\":\"5 5\",\"sourceMarkerType\":3,\"targetMarkerType\":1}},{\"sourceId\":\"1\",\"targetId\":\"4\",\"waypoints\":[{\"original\":{\"x\":1001,\"y\":553},\"x\":964,\"y\":553},{\"x\":295,\"y\":553},{\"original\":{\"x\":295,\"y\":184},\"x\":295,\"y\":224}],\"style\":{\"strokeColor\":\"orange\",\"strokeWidth\":3,\"strokeDasharray\":\"5 5\",\"sourceMarkerType\":3,\"targetMarkerType\":1}}]}");
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

    this.createInterface("1", "Paypal", Shape.InterfaceProvide, "1.0", true);
    this.createInterface("1", "CreditCard", Shape.Diamond, "1.0", true);
    this.createInterface("1", "Goats", Shape.Hexagon, "1.0", true);
    this.createIssueFolder("1", "070707", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#eef1c9");

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
    this.createInterface("2", "Generic", Shape.InterfaceRequire, "1.0", false);
    this.createInterface("2", "Generic", Shape.InterfaceProvide, "1.0", true);
    this.createIssueFolder("2", "123", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#33dd88");
    this.createIssueFolder("2", "456", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#dd33bb");
    this.createIssueFolder("2", "789", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#dd33bb");
    this.createIssueFolder("2", "987", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#dd33bb");
    this.createIssueFolder("2", "9871", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#dd3311");
    this.createIssueFolder("2", "9872", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#0033bb");

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

    this.createInterface("3", "DHL", Shape.InterfaceProvide, "1.0", true);
    this.createInterface("3", "DPD", Shape.InterfaceRequire, "1.0", false);
    this.createIssueFolder("3", "#94f543", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#040543");
    this.createIssueFolder("3", "#94f543", "M 0 40 L 0 0 L 20 0 L 20 10 L 40 10 L 40 40", "#a1b2c3");

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
