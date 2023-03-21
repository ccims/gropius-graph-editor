// @ts-ignore
import DiagramLib from '../diagram'
import { Coordinates } from "@/types/HelperTypes";
import { GropiusShape, GropiusShapeStyle } from "@/lib/gropius-compatibility/types";
import GropiusDefaultTypes from "@/lib/gropius-compatibility/gropiusDefaultTypes";

export default class GropiusCompatibility {
    private diagram: DiagramLib;
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


    public init(container: Element | null) {
        this.diagram = new DiagramLib({
            container: container,
        });

        this.canvas = this.diagram.get('canvas');
        this.elementFactory = this.diagram.get('elementFactory');
        this.modeling = this.diagram.get("modeling");

        this.root = this.elementFactory.createRoot();
        this.canvas.setRootElement(this.root)

        this.canvas._eventBus.on("shape.added", (e: any) => {
            if (!e.element.isFrame)
                return;
            let element = e.element;
            this.canvas.removeShape(element);

            let coordinates: Coordinates = {
                x: element.x,
                y: element.y
            }

            if (this.onAddShape)
                this.onAddShape(coordinates)
        });
        this.canvas._eventBus.on("context.shape.delete", (e: any) => {
            if (this.onDeleteShape)
                this.onDeleteShape(e.element)
        });

    }

    public isGropiusType(plainName: string): boolean {
        //return this.gropiusShapeNameMap.has(plainName);
        return GropiusDefaultTypes.has(plainName);
    }

    public getGropiusShapeNames(): Array<string> {
        return Array.from(this.gropiusShapeNameMap.keys())
    }

    public getGropiusShapeName(plainName: string): string {
        let type = this.gropiusShapeNameMap.get(plainName)
        return type ? type : ""
    }

    public drawGropiusType(coordinates: Coordinates, grShape: GropiusShape) {
        let shape;
        switch (grShape.grType) {
            case 'shape-gropius-component':
                shape = {
                    x: coordinates.x,
                    y: coordinates.y,
                    width: 100,
                    height: 100,
                    type: "rectangle",
                    grShape: grShape
                }
                this.createShape(shape);
                break;
            case 'shape-gropius-library':
                shape = {
                    x: coordinates.x,
                    y: coordinates.y,
                    width: 100,
                    height: 100,
                    type: "rectangle-rounded",
                    grShape: grShape
                }
                this.createShape(shape);
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
                r: grStyle.radius,
                style: {
                    fill: grStyle.color,
                    stroke: grStyle.stroke,
                    strokeWidth: grStyle.strokeWidth,
                    strokeDasharray: grStyle.strokeDasharray
                }
            }
        }
        this.createShape(shape)
    }

    public test() {
        this.drawGropiusType({ x: 350, y: 100 },
            { grId: "1", grType: "shape-gropius-component" })

        this.drawGropiusType({ x: 150, y: 100 },
            { grId: "2", grType: "shape-gropius-component" })

        this.drawGropiusType({ x: 250, y: 300 },
            { grId: "3", grType: "shape-gropius-component" })

        // var connection1 = this.elementFactory.createConnection({
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
        let _shape = this.elementFactory.createShape(shape)
        this.canvas.addShape(_shape, this.root)
    }

    public createCustomRectangle(coordinates: Coordinates, grShape: GropiusShape, grStyle: GropiusShapeStyle) {
        let shape = {
            x: coordinates.x,
            y: coordinates.y,
            width: grStyle.width,
            height: grStyle.height,
            type: "rectangle-custom",
            custom: {
                r: grStyle.radius,
                style: {
                    fill: grStyle.color,
                    stroke: grStyle.stroke,
                    strokeWidth: grStyle.strokeWidth,
                    strokeDasharray: grStyle.strokeDasharray
                },
            },
            grShape: grShape
        };
        this.createShape(shape)
    }

    public createCustomDiamond(coordinates: Coordinates, grShape: GropiusShape, grStyle: GropiusShapeStyle) {
        let shape = {
            x: coordinates.x,
            y: coordinates.y,
            width: grStyle.width,
            height: grStyle.height,
            type: "diamond-custom",
            custom: {
                style: {
                    fill: grStyle.color,
                    stroke: grStyle.stroke,
                    strokeWidth: grStyle.strokeWidth,
                    strokeDasharray: grStyle.strokeDasharray
                },
            },
            grShape: grShape
        };
        this.createShape(shape)
    }

}
