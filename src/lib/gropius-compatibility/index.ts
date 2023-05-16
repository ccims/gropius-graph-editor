// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import { GropiusConnectionStyle, GropiusShape, ObjectType, SerializedDiagram } from "@/lib/gropius-compatibility/types";

import { ConnectionMarker, Shape } from "@/lib/diagram/types";

// @ts-ignore
import Diagram from "diagram-js";
import { Connection } from "diagram-js/lib/model";

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
      if (this.onDeleteShape)
        this.onDeleteShape(e.element);
    });

    this.canvas._eventBus.on("connection.added", (e: any) => {
      const element = e.element;

      // If connection has been created by API or UI
      if (element.customRendered)
        return; // Ignore if it custom rendered, i.e. not by UI. Otherwise infinite recursion!

      this.canvas.removeConnection(element);

      if (this.onAddConnection)
        this.onAddConnection(e.element);

      // TODO: This is for dev purpose! If should get called by the frontend
      this.createConnectionBase(element, {
        strokeColor: "blue",
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

  public createComponent(grShape: GropiusShape, coordinates: Coordinates) {
    const componentObject = this.drawComponent(grShape, coordinates);
    componentObject.custom.versionObject = this.drawVersion(componentObject);
    return componentObject;
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
        type: ObjectType.Gropius, data:
        grShape
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
        versionObject: undefined,
        interfaces: []
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

  public createInterface(gropiusId: string, name: string, provide = true, coordinates?: Coordinates, waypoints?: Array<Coordinates>) {
    let diagramParentObject = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == gropiusId);
    const businessObject = diagramParentObject.businessObject.data;

    if(!coordinates)
      coordinates = {
        x: diagramParentObject.x + diagramParentObject.width + 40,
        y: diagramParentObject.y + diagramParentObject.height / 2 - 20
      }

    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: 40,
      height: 40,
      businessObject: { type: provide ? ObjectType.InterfaceProvide : ObjectType.InterfaceRequire },
      custom: {
        shape: provide ? Shape.InterfaceProvide : Shape.InterfaceRequire,
        style: {
          rx: businessObject.grType.style.radius,
          ry: businessObject.grType.style.radius,
          fill: businessObject.grType.style.color,
          stroke: businessObject.grType.style.stroke,
          strokeWidth: businessObject.grType.style.strokeWidth,
          strokeDasharray: businessObject.grType.style.strokeDasharray
        },
        label: name
      }
    };
    let diagramInterfaceObject = this.createShape(shape);

    diagramParentObject.custom.interfaces.push(diagramInterfaceObject);

    if(!waypoints)
      waypoints = [
        {x: diagramParentObject.x + diagramParentObject.width, y: diagramParentObject.y + diagramParentObject.height / 2},
        {x: diagramInterfaceObject.x, y: diagramInterfaceObject.y + diagramInterfaceObject.height / 2}
      ]

    this.createConnection(diagramParentObject, diagramInterfaceObject, waypoints, {
      strokeColor: businessObject.grType.style.stroke,
      strokeWidth: 2,
      strokeDasharray: "",
      sourceMarkerType: ConnectionMarker.None,
      targetMarkerType: ConnectionMarker.ArrowRight
    });
  }

  public test() {
    const xl = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    const l = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tortor consequat id porta nibh venenatis cras. Sollicitudin tempor id eu nisl. Viverra tellus in hac habitasse platea dictumst.";
    const m = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    const s = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    let a = this.createComponent({
      id: "1",
      name: "rect1",
      version: "v1",
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 40,
          minHeight: 40,
          maxScale: 10,
          color: "#ffffff",
          stroke: "#ff55aa",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      }
    }, { x: 150, y: 100 });

    let b = this.createComponent({
      id: "2",
      version: "v1",
      name: "rect2 " + s,
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 50,
          minHeight: 50,
          maxScale: 5,
          color: "#ffffff",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      }
    }, { x: 150, y: 250 });

    this.createConnection(a, b, [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y }
    ], {
      strokeColor: "red",
      strokeWidth: 2,
      strokeDasharray: "",
      sourceMarkerType: ConnectionMarker.Round,
      targetMarkerType: ConnectionMarker.Right
    });

    this.createInterface("2", "My Interface", true);

    this.createComponent({
      id: "3",
      version: "v1.10.5",
      name: "rect3 little text, big shape",
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 250,
          minHeight: 200,
          maxScale: 1,
          color: "#ffffff",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      }
    }, { x: 150, y: 450 });

    this.createComponent({
      id: "4",
      version: "v1",
      name: "Triangle " + s,
      grType: {
        name: "x",
        shape: Shape.Triangle,
        style: {
          minWidth: 100,
          minHeight: 50,
          maxScale: 2,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 500, y: 75 });

    this.createComponent({
      id: "5",
      version: "v1",
      name: "Parallel " + s,
      grType: {
        name: "x",
        shape: Shape.Parallelogram,
        style: {
          minWidth: 150,
          minHeight: 100,
          maxScale: 1,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 800, y: 75 });

    this.createComponent({
      id: "6",
      version: "v1",
      name: "Diamond " + s,
      grType: {
        name: "x",
        shape: Shape.Diamond,
        style: {
          minWidth: 100,
          minHeight: 100,
          maxScale: 1.5,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 1100, y: 75 });

    this.createComponent({
      id: "7",
      version: "v1",
      name: "Octagon " + s,
      grType: {
        name: "x",
        shape: Shape.Octagon,
        style: {
          minWidth: 100,
          minHeight: 100,
          maxScale: 1.5,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 500, y: 250 });

    this.createComponent({
      id: "8",
      version: "v1",
      name: "Circle " + s,
      grType: {
        name: "x",
        shape: Shape.Circle,
        style: {
          minWidth: 100,
          minHeight: 100,
          maxScale: 2,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 800, y: 250 });

    this.createComponent({
      id: "9",
      version: "v1",
      name: "Trapeze " + s,
      grType: {
        name: "x",
        shape: Shape.Trapeze,
        style: {
          minWidth: 100,
          minHeight: 100,
          maxScale: 1,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 1100, y: 300 });

    this.createComponent({
      id: "10",
      version: "v1",
      name: "Hexagon " + s,
      grType: {
        name: "x",
        shape: Shape.Hexagon,
        style: {
          minWidth: 100,
          minHeight: 100,
          maxScale: 2,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 500, y: 500 });

    this.createComponent({
      id: "11",
      version: "v1",
      name: "Ellipse " + s,
      grType: {
        name: "x",
        shape: Shape.Ellipse,
        style: {
          minWidth: 100,
          minHeight: 50,
          maxScale: 2,
          color: "yellow",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 800, y: 500 });

    this.createComponent({
      id: "12",
      version: "v1",
      name: "Ellipse2 " + s,
      grType: {
        name: "x",
        shape: Shape.Ellipse,
        style: {
          minWidth: 50,
          minHeight: 100,
          maxScale: 2,
          color: "violet",
          stroke: "#0000ff",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 1100, y: 500 });

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

  public deleteShape(element: any): boolean {

    if (!element.custom || !element.custom.versionObject)
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

  private createConnectionBase(connection: Connection, style: GropiusConnectionStyle) {
    // @ts-ignore
    connection.customRendered = true;
    // @ts-ignore
    connection.custom = {
      style: style,
      label: "" // TODO
    };

    connection.businessObject = {
      type: ObjectType.Connection
    };

    this.canvas.addConnection(connection, this.root);
  }

  public createConnection(source: any, target: any, waypoints: Array<Coordinates>, style: GropiusConnectionStyle) {
    let connection = this.elementFactory.createConnection({
      waypoints: waypoints,
      source: source,
      target: target
    });

   this.createConnectionBase(connection, style)
  }

  public exportDiagram(): string {
    const elements = this.elementRegistry._elements;
    console.log(elements);

    let diagram: SerializedDiagram = {
      shapes: [],
      connections: []
    };

    Object.values(elements).forEach((element: any) => {
      element = element.element;
      if (element.id.startsWith("shape")) {
        if (element.businessObject.type == ObjectType.Version)
          return;

        diagram.shapes.push({
          grShape: element.businessObject.data,
          x: element.x,
          y: element.y
        });
      } else if (element.id.startsWith("connection")) {
        diagram.connections.push({
          sourceId: element.source.businessObject.data.id,
          targetId: element.target.businessObject.data.id,
          waypoints: element.waypoints,
          style: element.custom.style
        });
      }
    });

    const diagramAsText = JSON.stringify(diagram);
    console.log(diagramAsText);
    return diagramAsText;
  }

  public importDiagramString(diagram: string) {
    this.importDiagram(JSON.parse(diagram));
  }

  public importDiagram(diagram: SerializedDiagram) {
    diagram.shapes.forEach(shape => {
      this.createComponent(shape.grShape, { x: shape.x, y: shape.y });
    });

    diagram.connections.forEach(connection => {
      const source = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.type == ObjectType.Gropius && element.businessObject.data.id == connection.sourceId);
      let target = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.type == ObjectType.Gropius && element.businessObject.data.id == connection.targetId);

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
      if (!element.id.startsWith("shape")) {
        return;
      }

      const white = "#ffffff";
      const black = "#000000";
      const dark = "#444444";
      let stroke = black,
        fill = white;

      if (element.businessObject.type == ObjectType.Gropius) { // Main ropius Component
        element.custom.style.whiteText = false;

        if (enabled) {
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
          stroke = element.businessObject.data.grType.style.stroke;
          fill = element.businessObject.data.grType.style.color;
        }
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
      }

      element.custom.style.stroke = stroke;
      element.custom.style.fill = fill;
      this.canvas._eventBus.fire("element.changed", { element: element });
    });
  }

}
