// @ts-ignore
import EditorLib from "../diagram/Editor";
import { Coordinates } from "@/types/HelperTypes";
import {
  ConnectionMarker,
  GropiusConnectionStyle,
  GropiusShape,
  GropiusShapeStyle,
  Shape
} from "@/lib/gropius-compatibility/types";

// @ts-ignore
import Diagram from "diagram-js";
import { Connection } from "diagram-js/lib/model";
import { h } from "vue";
import { he } from "vuetify/locale";

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

  public getDimensions(minWidth: number, minHeight: number, maxScale: number, text: string): {width: number, height: number, text: string} {

    const maxWidth = Math.floor(minWidth * maxScale)
    const maxHeight = Math.floor(minHeight * maxScale)

    let width = minWidth;
    let height = minHeight;
    let adjustedText = text;

    const heightPerLine = 25;
    const widthPerCharacter = 9;

    const characters = text.length;

    // max number of characters based on max size
    const maxCharacters = Math.floor(maxWidth / widthPerCharacter) * Math.floor(maxHeight / heightPerLine)

    if(characters > maxCharacters) {
      // If there are more characters than the max size would allow

      // Cut text and add "..." at the end
      adjustedText = text.slice(0, maxCharacters).slice(0,-3) + "..."
      width = maxWidth
      height = maxHeight
    } else {
      // There is room to resize

      let ratio = height / width;
      let charactersForSize = Math.floor(width / widthPerCharacter) * Math.floor(height / heightPerLine)

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
        charactersForSize = Math.floor(width / widthPerCharacter) * Math.floor(height / heightPerLine)
      }
    }

    return {
      width: width,
      height: height,
      text: adjustedText
    }
  }

  public draw(grShape: GropiusShape, coordinates: Coordinates) {
    const grStyle = grShape.grType.style;

    let dimensions = this.getDimensions(grStyle.minWidth, grStyle.minHeight, grStyle.maxScale, grShape.name)
    let shape = {
      x: coordinates.x,
      y: coordinates.y,
      width: dimensions.width,
      height: dimensions.height,
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
        label: dimensions.text
      }
    };
    this.createShape(shape);
  }

  public test() {
    this.draw({
      version: "v1",
      name: "Now I write something different than what I did before",
      grType: {
        name: "x",
        shape: Shape.Rectangle,
        style: {
          minWidth: 100,
          minHeight: 50,
          maxScale: 2,
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
      name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
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
      name: "This is a test text and it is very long here",
      grType: {
        name: "x",
        shape: Shape.Triangle,
        style: {
          minWidth: 100,
          minHeight: 50,
          maxScale: 50,
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

  public createConnection(connection: Connection, style: GropiusConnectionStyle) {
    // const source = connectionData.source,
    //   target = connectionData.target,
    //   waypoints = connectionData.waypoints;
    //
    // let connection = this.elementFactory.createConnection({
    //   waypoints: waypoints,
    //   source: source,
    //   target: target
    // });
    connection.customRendered = true;
    connection.custom = {
      style: style,
      label: "" // TODO
    };

    this.canvas.addConnection(connection, this.root);
  }


}
