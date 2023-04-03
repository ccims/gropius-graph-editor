// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import { GropiusShape, GropiusShapeStyle } from "@/lib/gropius-compatibility/types";
import GropiusDefaultTypes from "@/lib/gropius-compatibility/gropiusDefaultTypes";

// @ts-ignore
import Diagram from "diagram-js";
import { Connection } from "diagram-js/lib/model";

export default class GropiusCompatibility {
  private diagram: Diagram;
  private canvas: any;
  private elementFactory: any;
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

    // @ts-ignore
    this.diagram = new EditorLib(container);

    this.canvas = this.diagram.get("canvas");
    this.elementFactory = this.diagram.get("elementFactory");
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

      this.createConnection(element);
    });

  }

  public drawGropiusType(coordinates: Coordinates, grShape: GropiusShape) {
    let shape;
    switch (grShape.grType) {
      case "shape-gropius-component":
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 100,
          height: 100,
          type: "rectangle",
          grShape: grShape,
          custom: {
            style: {
              ry: 0,
              rx: 0,
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        };
        this.createShape(shape);
        break;
      case "shape-gropius-library":
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 100,
          height: 80,
          type: "rectangle",
          grShape: grShape,
          custom: {
            style: {
              rx: 5,
              ry: 5,
              fill: "yellow",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        };
        this.createShape(shape);
        break;
      case 'shape-gropius-hexagon':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 150,
          height: 100,
          type: "hexagon",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
      case 'shape-gropius-ellipse':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 300,
          height: 100,
          type: "ellipse",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
      case 'shape-gropius-octagon':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 100,
          height: 100,
          type: "octagon",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
      case 'shape-gropius-circle':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 100,
          height: 100,
          type: "circle",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
      case 'shape-gropius-triangle':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 150,
          height: 100,
          type: "triangle",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
      case 'shape-gropius-parallelogram':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 150,
          height: 100,
          type: "parallelogram",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
      case 'shape-gropius-trapeze':
        shape = {
          x: coordinates.x,
          y: coordinates.y,
          width: 150,
          height: 100,
          type: "trapeze",
          grShape: grShape,
          custom: {
            style: {
              fill: "none",
              stroke: "black",
              strokeWidth: "2",
              strokeDasharray: "0"
            },
            label: grShape.label
          }
        }
        this.createShape(shape)
        break;
    }
  }

  public drawCustomType(type: String, coordinates: Coordinates, grShape: GropiusShape, grStyle: GropiusShapeStyle) {
    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: grStyle.width,
      height: grStyle.height,
      type: type,
      grShape: grShape,
      custom: {
        style: {
          rx: grStyle.radius,
          ry: grStyle.radius,
          fill: grStyle.color,
          stroke: grStyle.stroke,
          strokeWidth: grStyle.strokeWidth,
          strokeDasharray: grStyle.strokeDasharray
        },
        label: grShape.label
      }
    };
    this.createShape(shape);
  }

  public test() {
    this.drawGropiusType({ x: 350, y: 100 },
      { grId: "1", grType: "shape-gropius-component", label: "test" });

    this.drawGropiusType({ x: 150, y: 100 },
      { grId: "2", grType: "shape-gropius-component", label: "ABC" });

    this.drawGropiusType({ x: 250, y: 300 },
      { grId: "3", grType: "shape-gropius-component", label: "Hello World" });

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

  public deleteShape(element: any) {
    this.modeling.removeElements([element]);
  }

  private createShape(shape: any) {
    const _shape = this.elementFactory.createShape(shape);
    this.canvas.addShape(_shape, this.root);
  }

  public createCustomRectangle(coordinates: Coordinates, grShape: GropiusShape, grStyle: GropiusShapeStyle) {
    const shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: grStyle.width,
      height: grStyle.height,
      type: "rectangle",
      custom: {
        style: {
          rx: grStyle.radius,
          ry: grStyle.radius,
          fill: grStyle.color,
          stroke: grStyle.stroke,
          strokeWidth: grStyle.strokeWidth,
          strokeDasharray: grStyle.strokeDasharray
        }
      },
      grShape: grShape
    };
    this.createShape(shape);
  }

  public createCustomDiamond(coordinates: Coordinates, grShape: GropiusShape, grStyle: GropiusShapeStyle) {
    const shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: grStyle.width,
      height: grStyle.height,
      type: "diamond",
      custom: {
        style: {
          fill: grStyle.color,
          stroke: grStyle.stroke,
          strokeWidth: grStyle.strokeWidth,
          strokeDasharray: grStyle.strokeDasharray
        }
      },
      grShape: grShape
    };
    this.createShape(shape);
  }

  public createConnection(connection: Connection) {
    this.createConnectionBasic(connection.source, connection.target, connection.waypoints);
  }

  public createConnectionBasic(source: any, target: any, waypoints: Array<Coordinates>) {
    let connection = this.elementFactory.createConnection({
      waypoints: waypoints,
      source: source,
      target: target
    });
    connection.customRendered = true;

    this.canvas.addConnection(connection, this.root);
  }

}
