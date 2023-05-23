// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import {
  GropiusConnectionStyle, GropiusInterface,
  GropiusShape,
  ObjectType,
  SerializedDiagram, SerializedInterface
} from "@/lib/gropius-compatibility/types";

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

  private drawInterface(parentShape: any, interf: GropiusInterface, coordinates: Coordinates, waypoints?: Array<Coordinates>) {
    const parentBusinessObject = parentShape.businessObject.data;

    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: 40,
      height: 40,
      businessObject: {
        type: interf.provide ? ObjectType.InterfaceProvide : ObjectType.InterfaceRequire,
        data: interf
      },
      custom: {
        shape: interf.provide ? Shape.InterfaceProvide : Shape.InterfaceRequire,
        style: {
          rx: parentBusinessObject.grType.style.radius,
          ry: parentBusinessObject.grType.style.radius,
          fill: interf.provide ? parentBusinessObject.grType.style.color : "#00000000",
          stroke: parentBusinessObject.grType.style.stroke,
          strokeWidth: parentBusinessObject.grType.style.strokeWidth,
          strokeDasharray: parentBusinessObject.grType.style.strokeDasharray
        },
        label: interf.name,
        parentObject: parentShape
      }
    };

    const diagramInterfaceObject = this.createShape(shape);
    parentShape.custom.interfaces.push(diagramInterfaceObject); // Rendering details

    // Set waypoints if not given
    if (!waypoints)
      waypoints = [
        { x: parentShape.x + parentShape.width, y: parentShape.y + parentShape.height / 2 },
        { x: diagramInterfaceObject.x, y: diagramInterfaceObject.y + diagramInterfaceObject.height / 2 }
      ];

    this.createConnection(parentShape, diagramInterfaceObject, waypoints, {
      strokeColor: parentBusinessObject.grType.style.stroke,
      strokeWidth: 2,
      strokeDasharray: "",
      sourceMarkerType: ConnectionMarker.None,
      targetMarkerType: ConnectionMarker.ArrowRight
    });

    return diagramInterfaceObject;
  }

  public createInterface(gropiusId: string, name: string, provide = true, coordinates?: Coordinates, waypoints?: Array<Coordinates>) {
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
      name: name,
      provide: provide
    };

    const diagramInterfaceObject = this.drawInterface(diagramParentObject, interfaceObject, coordinates, waypoints);

    // Add interface to parent
    parentBusinessObject.interfaces.push(interfaceObject);
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

    this.createConnectionBase(connection, style);
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
        if (element.businessObject.type != ObjectType.Gropius) // Only serialize main components
          return;

        // Serialize interfaces
        const interfaces: Array<SerializedInterface> = this.serializeInterfaces(element);

        // Main (gropius) shape serialized
        const serializedShape = {
          grShape: element.businessObject.data,
          x: element.x,
          y: element.y,
          interfaces: interfaces
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
      const interfaceObject = element.custom.interfaces.find((i: any) => i.businessObject.data.id == interf.id);
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
        id: interf.id,
        coordinates: { x: interfaceObject.x, y: interfaceObject.y },
        // @ts-ignore
        waypoints: connectionObject.element.waypoints
      });
    });
    return interfaces;
  }

  public importDiagramString(diagram: string) {
    this.importDiagram(JSON.parse(diagram));
  }

  public importDiagram(diagram: SerializedDiagram) {
    diagram.shapes.forEach(shape => {
      const object = this.createComponent(shape.grShape, { x: shape.x, y: shape.y });
      shape.interfaces.forEach(interf => {
        const grInterface = shape.grShape.interfaces.find(i => i.id == interf.id);
        if (!grInterface)
          console.error("Interface error");
        else
          this.drawInterface(object, grInterface, interf.coordinates, interf.waypoints);
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

        element.custom.interfaces.forEach((interfaceObject: any) => {
          interfaceObject.custom.style.stroke = stroke
          if(interfaceObject.shape == Shape.InterfaceProvide)
            interfaceObject.custom.style.fill = fill

          interfaceObject.custom.style.whiteText = enabled
        })

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
      } else if (element.businessObject.type == ObjectType.Connection) {

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
  }


  public test() {

    // this.importDiagramString("{\n" +
    //   "  \"shapes\": [\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"1\",\n" +
    //   "        \"name\": \"rect1\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 0,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 40,\n" +
    //   "            \"minHeight\": 40,\n" +
    //   "            \"maxScale\": 10,\n" +
    //   "            \"color\": \"#ffffff\",\n" +
    //   "            \"stroke\": \"#ff55aa\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"\",\n" +
    //   "            \"radius\": 5\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 241,\n" +
    //   "      \"y\": 54,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"2\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"rect2 Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 0,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 50,\n" +
    //   "            \"minHeight\": 50,\n" +
    //   "            \"maxScale\": 5,\n" +
    //   "            \"color\": \"#ffffff\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"\",\n" +
    //   "            \"radius\": 5\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": [\n" +
    //   "          {\n" +
    //   "            \"id\": \"2-My Interface-true\",\n" +
    //   "            \"name\": \"My Interface\",\n" +
    //   "            \"provide\": true\n" +
    //   "          },\n" +
    //   "          {\n" +
    //   "            \"id\": \"2-My Interface-false\",\n" +
    //   "            \"name\": \"Other Interface\",\n" +
    //   "            \"provide\": false\n" +
    //   "          }\n" +
    //   "        ]\n" +
    //   "      },\n" +
    //   "      \"x\": 150,\n" +
    //   "      \"y\": 250,\n" +
    //   "      \"interfaces\": [\n" +
    //   "        {\n" +
    //   "          \"id\": \"2-My Interface-true\",\n" +
    //   "          \"coordinates\": { \"x\": 339, \"y\": 261 },\n" +
    //   "          \"waypoints\": [\n" +
    //   "            { \"original\": { \"x\": 280, \"y\": 315 }, \"x\": 280, \"y\": 315 },\n" +
    //   "            { \"x\": 302, \"y\": 315 },\n" +
    //   "            { \"x\": 302, \"y\": 281 },\n" +
    //   "            { \"original\": { \"x\": 339, \"y\": 281 }, \"x\": 339, \"y\": 281 }\n" +
    //   "          ]\n" +
    //   "        },\n" +
    //   "        {\n" +
    //   "          \"id\": \"2-My Interface-false\",\n" +
    //   "          \"coordinates\": { \"x\": 324, \"y\": 340 },\n" +
    //   "          \"waypoints\": [\n" +
    //   "            { \"original\": { \"x\": 280, \"y\": 315 }, \"x\": 280, \"y\": 315 },\n" +
    //   "            { \"x\": 300, \"y\": 315 },\n" +
    //   "            { \"x\": 300, \"y\": 360 },\n" +
    //   "            { \"original\": { \"x\": 324, \"y\": 360 }, \"x\": 324, \"y\": 360 }\n" +
    //   "          ]\n" +
    //   "        }\n" +
    //   "      ]\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"3\",\n" +
    //   "        \"version\": \"v1.10.5\",\n" +
    //   "        \"name\": \"rect3 little text, big shape\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 0,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 250,\n" +
    //   "            \"minHeight\": 200,\n" +
    //   "            \"maxScale\": 1,\n" +
    //   "            \"color\": \"#ffffff\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"\",\n" +
    //   "            \"radius\": 5\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 150,\n" +
    //   "      \"y\": 450,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"4\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Triangle Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 1,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 50,\n" +
    //   "            \"maxScale\": 2,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 500,\n" +
    //   "      \"y\": 75,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"5\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Parallel Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 7,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 150,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 1,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 800,\n" +
    //   "      \"y\": 75,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"6\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Diamond Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 3,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 1.5,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 1100,\n" +
    //   "      \"y\": 75,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"7\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Octagon Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 5,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 1.5,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 500,\n" +
    //   "      \"y\": 250,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"8\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Circle Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 2,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 2,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 800,\n" +
    //   "      \"y\": 250,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"9\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Trapeze Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 8,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 1,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 1100,\n" +
    //   "      \"y\": 300,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"10\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Hexagon Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 4,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 2,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 500,\n" +
    //   "      \"y\": 500,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"11\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Ellipse Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 6,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 100,\n" +
    //   "            \"minHeight\": 50,\n" +
    //   "            \"maxScale\": 2,\n" +
    //   "            \"color\": \"yellow\",\n" +
    //   "            \"stroke\": \"#000000\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 800,\n" +
    //   "      \"y\": 500,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    },\n" +
    //   "    {\n" +
    //   "      \"grShape\": {\n" +
    //   "        \"id\": \"12\",\n" +
    //   "        \"version\": \"v1\",\n" +
    //   "        \"name\": \"Ellipse2 Lorem ipsum dolor sit amet, consectetur adipiscing elit.\",\n" +
    //   "        \"grType\": {\n" +
    //   "          \"name\": \"x\",\n" +
    //   "          \"shape\": 6,\n" +
    //   "          \"style\": {\n" +
    //   "            \"minWidth\": 50,\n" +
    //   "            \"minHeight\": 100,\n" +
    //   "            \"maxScale\": 2,\n" +
    //   "            \"color\": \"violet\",\n" +
    //   "            \"stroke\": \"#0000ff\",\n" +
    //   "            \"strokeWidth\": 2,\n" +
    //   "            \"strokeDasharray\": \"5 2\",\n" +
    //   "            \"radius\": 0\n" +
    //   "          }\n" +
    //   "        },\n" +
    //   "        \"interfaces\": []\n" +
    //   "      },\n" +
    //   "      \"x\": 1100,\n" +
    //   "      \"y\": 500,\n" +
    //   "      \"interfaces\": []\n" +
    //   "    }\n" +
    //   "  ],\n" +
    //   "  \"connections\": [\n" +
    //   "    {\n" +
    //   "      \"sourceId\": \"1\",\n" +
    //   "      \"targetId\": \"2\",\n" +
    //   "      \"waypoints\": [\n" +
    //   "        { \"original\": { \"x\": 241, \"y\": 74 }, \"x\": 241, \"y\": 74 },\n" +
    //   "        { \"x\": 200, \"y\": 74 },\n" +
    //   "        { \"x\": 200, \"y\": 150 },\n" +
    //   "        { \"original\": { \"x\": 200, \"y\": 250 }, \"x\": 200, \"y\": 250 }\n" +
    //   "      ],\n" +
    //   "      \"style\": {\n" +
    //   "        \"strokeColor\": \"red\",\n" +
    //   "        \"strokeWidth\": 2,\n" +
    //   "        \"strokeDasharray\": \"\",\n" +
    //   "        \"sourceMarkerType\": 3,\n" +
    //   "        \"targetMarkerType\": 1\n" +
    //   "      }\n" +
    //   "    }\n" +
    //   "  ]\n" +
    //   "}\n");
    // return;

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
      },
      interfaces: []
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
          color: "#ffccff",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      },
      interfaces: []
    }, { x: 150, y: 250 });

    this.createConnection(a, b, [
      { x: a.x, y: a.y + 10 },
      { x: a.x - 50, y: a.y + 10 },
      { x: b.x - 50, y: b.y + 10 },
      { x: b.x, y: b.y + 10 }
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
          stroke: "#aa0000",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      },
      interfaces: []
    }, { x: 150, y: 450 });

    this.createInterface("3", "Another Interface", false);

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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
      },
      interfaces: []
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
}
