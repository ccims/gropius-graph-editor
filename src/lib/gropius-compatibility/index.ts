// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import { GropiusShape, GropiusShapeStyle, Shape } from "@/lib/gropius-compatibility/types";

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

  public draw(grShape: GropiusShape, coordinates: Coordinates) {
    const grStyle = grShape.grType.style;
    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: grStyle.width,
      height: grStyle.height,
      type: grShape.grType.shape,
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
        label: grShape.name
      }
    };
    this.createShape(shape);
  }

  public test() {
    this.draw({
      version: "v1",
      name: "test",
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          width: 100,
          height: 50,
          color: "white",
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      }
    }, { x: 150, y: 100 });

    this.draw({
      version: "v1",
      name: "Blub",
      grType: {
        name: "x",
        shape: Shape.Diamond,
        style: {
          width: 100,
          height: 100,
          color: "yellow",
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 350, y: 75 });

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
