// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import {
  GropiusConnectionStyle,
  GropiusShape,
  GropiusShapeStyle,
} from "@/lib/gropius-compatibility/types";

import {
  ConnectionMarker,
  Shape
} from "@/lib/diagram/types";

// @ts-ignore
import Diagram from "diagram-js";
import { Connection } from "diagram-js/lib/model";
import { h } from "vue";
import { he } from "vuetify/locale";

const HEIGHT_PER_LINE = 20;
const WIDTH_PER_CHARACTER = 10;
const PADDING = 10;

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

      this.createConnection(element, {
        strokeColor: "blue",
        strokeWidth: 3,
        strokeDasharray: "5 5",
        sourceMarkerType: ConnectionMarker.Round,
        targetMarkerType: ConnectionMarker.OpenArrow
      });
    });

  }

  private getCharacterCountForSize(width: number, height: number) {
    return Math.floor(((width - PADDING) / WIDTH_PER_CHARACTER) * ((height - PADDING) / HEIGHT_PER_LINE))
  }

  private getCharacterCountForSizeByType(width: number, height: number, shape: Shape) {
    let factor = 1

    switch(shape) {
      case Shape.Diamond:
        factor = 3
        break
      case Shape.Triangle:
        factor = 3
        break
      case Shape.Octagon:
        factor = 1.25;
        break;
      case Shape.Circle:
      case Shape.Ellipse:
        factor = 1.5
        break;
      case Shape.Hexagon:
        factor = 1.1
        break
    }

    return this.getCharacterCountForSize(width, height) / factor
  }

  public getDimensions(minWidth: number, minHeight: number, maxScale: number, text: string, shape: Shape): {width: number, height: number, text: string} {

    const maxWidth = Math.floor(minWidth * maxScale)
    const maxHeight = Math.floor(minHeight * maxScale)

    let width = minWidth;
    let height = minHeight;
    let adjustedText = text;

    const characters = text.length;
    // max number of characters based on max size
    let estimatedMaxCharacters = this.getCharacterCountForSizeByType(maxWidth, maxHeight, shape)

    if(characters > estimatedMaxCharacters) {
      // If there are more characters than the max size would allow
      // Cut text and add "..." at the end
      // Theoretically not necessary but speeds things up
      // Like "pre-cutting". It will get shortened in rendering,
      // but to speed up the renderer we pre-cut it.
      // Disabled to avoid cutting too much. Is fine unless there is big text on small shape


      // adjustedText = text.slice(0, maxCharacters).slice(0,-3) + "..."

      width = maxWidth
      height = maxHeight
    } else {
      // There is room to resize

      let ratio = height / width;
      let charactersForSize = this.getCharacterCountForSizeByType(width, height, shape)

      const increaseBy = 10
      while(characters > charactersForSize) {
        // while sizes not big enough
        width += increaseBy;
        width = width > maxWidth ? maxWidth : width;

        height = Math.round(ratio * width)
        height = height > maxHeight ? maxHeight : height;
        // additional loop breaker
        if(width == maxWidth && height == maxHeight)
          break;

        // recalculate the characters that fit in updated size
        charactersForSize = this.getCharacterCountForSizeByType(width, height, shape)
      }
    }

    const ret = {
      width: width,
      height: height,
      text: adjustedText
    }
    return ret
  }

  public draw(grShape: GropiusShape, coordinates: Coordinates) {
    const shape = this.drawComponent(grShape, coordinates)
    this.drawVersion(shape)
  }

  private drawComponent(grShape: GropiusShape, coordinates: Coordinates) {
    const grStyle = grShape.grType.style;

    let dimensions = this.getDimensions(grStyle.minWidth, grStyle.minHeight, grStyle.maxScale, grShape.name, grShape.grType.shape)
    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: dimensions.width,
      height: dimensions.height,
      shape: grShape.grType.shape,
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
        label: dimensions.text
      }
    };
    this.createShape(shape);
    return shape
  }

  private drawVersion(componentShape: any) {
    let shape = {
      x: componentShape.x + componentShape.width - 25,
      y: componentShape.y + componentShape.height - 25,
      width: 60,
      height: 60,
      shape: Shape.Diamond,
      grShape: undefined,
      custom: {
        style: {
          rx: 0,
          ry: 0,
          fill: "#6666ff",
          stroke: "#000000",
          strokeWidth: 2,
          strokeDasharray: ""
        },
        label: componentShape.grShape.version
      }
    };
    this.createShape(shape);
  }

  public test() {
    const xl = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    const l = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tortor consequat id porta nibh venenatis cras. Sollicitudin tempor id eu nisl. Viverra tellus in hac habitasse platea dictumst."
    const m = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    const s = "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    this.draw({
      version: "v1",
      name: "rect1 My Library",
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 40,
          minHeight: 40,
          maxScale: 1.5,
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
      name: "rect2 " + s,
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 50,
          minHeight: 50,
          maxScale: 5,
          color: "white",
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      }
    }, { x: 150, y: 250 });

    this.draw({
      version: "v1",
      name: "rect3 little text, big shape",
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 250,
          minHeight: 200,
          maxScale: 1,
          color: "white",
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "",
          radius: 5
        }
      }
    }, { x: 150, y: 400 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 500, y: 75 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 800, y: 75 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 1000, y: 75 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 500, y: 250 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 750, y: 250 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 1050, y: 300 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 500, y: 500 });

    this.draw({
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
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 750, y: 500 });

    this.draw({
      version: "v1",
      name: "Ellipse2 " + s,
      grType: {
        name: "x",
        shape: Shape.Ellipse,
        style: {
          minWidth: 50,
          minHeight: 100,
          maxScale: 2,
          color: "yellow",
          stroke: "black",
          strokeWidth: 2,
          strokeDasharray: "5 2",
          radius: 0
        }
      }
    }, { x: 1050, y: 500 });


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

  public createConnection(connection: Connection, style: GropiusConnectionStyle) {
    // @ts-ignore
    connection.customRendered = true;
    // @ts-ignore
    connection.custom = {
      style: style,
      label: "" // TODO
    };

    this.canvas.addConnection(connection, this.root);
  }


}
