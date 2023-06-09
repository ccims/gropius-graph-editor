// @ts-ignore
import EditorLib from "./diagram/Editor";
import {Coordinates} from "./types";
import {
    GropiusConnection,
    GropiusConnectionStyle,
    GropiusInterface,
    GropiusIssue,
    GropiusShape,
    GropiusType,
    ObjectType,
    SerializedDiagram,
    SerializedInterface,
    SerializedIssueFolder
} from "./types";

import {ConnectionMarker, Shape} from "./diagram/types";

// @ts-ignore
import Diagram from "diagram-js";
import {Connection} from "diagram-js/lib/model";

import {getTextBasedDimensions, getVersionOffsetFromShape, scaleSvgPath} from "./util/utilFunctions";
import {autolayout} from "./util/layouting";
import {exportDiagram} from "./util/export";

export default class GropiusDiagram {
    private container: any;
    private diagram: Diagram;
    private canvas: any;
    private elementFactory: any;
    private elementRegistry: any;
    private modeling: any;
    private root: any;


    public onAddShape?: (coordinates: Coordinates) => void;
    public onAddInterface?: (id: string) => void;
    public onAddIssue?: (id: string) => void;
    public onDelete?: (id: string) => void;
    public onAddConnection?: (sourceId: string, targetId: string, waypoints: Array<Coordinates>) => void;


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
            if (this.onDelete && element.businessObject && element.businessObject.data) {
                this.onDelete(e.element.businessObject.data.id);
            } else {
                console.error("Something went wrong on a delete event");
            }
        });

        this.canvas._eventBus.on("context.shape.interface", (e: any) => {
            const element = e.element
            if (this.onAddInterface && element.businessObject && element.businessObject.data) {
                this.onAddInterface(element.businessObject.data.id)
            } else {
                console.error("Something went wrong on a interface create event");
            }
        });

        this.canvas._eventBus.on("context.shape.issue", (e: any) => {
            const element = e.element
            if (this.onAddIssue && element.businessObject && element.businessObject.data) {
                this.onAddIssue(element.businessObject.data.id)
            } else {
                console.error("Something went wrong on a issue create event");
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
                    this.onAddConnection(element.source.businessObject.data.id, element.target.businessObject.data.id, element.waypoints);
                } catch (error) {
                    console.error(error);
                }
            } else {
                console.error("Something went wrong on a add connection event");
            }
        });

    }

    private createComponentBase(grShape: GropiusShape, coordinates: Coordinates) {
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
            issues: []
        };
        return this.createComponentBase(grShape, coordinates);
    }

    private drawComponent(grShape: GropiusShape, coordinates: Coordinates) {
        const grStyle = grShape.grType.style;

        let dimensions = getTextBasedDimensions(grStyle.minWidth, grStyle.minHeight, grStyle.maxScale, grShape.name, grShape.grType.shape);
        let shape = {
            x: coordinates.x,
            y: coordinates.y,
            width: dimensions.width,
            height: dimensions.height,
            businessObject: {
                type: ObjectType.ComponentVersion,
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

    private drawVersion(componentShape: any) {
        const offsets = getVersionOffsetFromShape(componentShape);
        const offsetX = offsets.x,
            offsetY = offsets.y;

        let shape = {
            x: componentShape.x + offsetX,
            y: componentShape.y + offsetY,
            width: 90,
            height: 40,
            businessObject: {type: ObjectType.Version},
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
                    fill: interf.shape == Shape.InterfaceRequire ? "#00000000" : parentBusinessObject.grType.style.color,
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
                {x: parentShape.x + parentShape.width, y: parentShape.y + parentShape.height / 2},
                {x: diagramInterfaceObject.x, y: diagramInterfaceObject.y + diagramInterfaceObject.height / 2}
            ];

        let con = this._createConnection(null, parentShape.businessObject.data.id, diagramInterfaceObject.businessObject.data.id, {
            color: parentBusinessObject.grType.style.stroke,
            strokeWidth: 2,
            strokeDasharray: "",
            sourceMarkerType: ConnectionMarker.None,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, waypoints, true);

        diagramInterfaceObject.businessObject.data.connectionId = con.id;

        return diagramInterfaceObject;
    }

    public createInterface(id: string, parentId: string, name: string, shape: Shape, version: string, coordinates?: Coordinates, waypoints?: Array<Coordinates>) {
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
            parentId: parentBusinessObject.id,
            connectionId: "",
            name: name,
            shape: shape,
            version: version
        };

        this.drawInterface(diagramParentObject, interfaceObject, coordinates, waypoints);

        // Add interface to parent
        parentBusinessObject.interfaces.push(interfaceObject);
    }

    public createIssue(id: string, parentId: string, path: string, color: string, coordinates?: Coordinates) {
        let diagramParentObject = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == parentId);
        const parentBusinessObject = diagramParentObject.businessObject.data;

        const issueFolderObject: GropiusIssue = {
            id: id,
            shapeId: "",
            parentId: parentBusinessObject.id,
            path: path,
            color: color
        };

        if (!coordinates)
            coordinates = {
                x: diagramParentObject.x + diagramParentObject.width + 40,
                y: diagramParentObject.y + diagramParentObject.height / 2 - 20
            };

        this.drawIssue(diagramParentObject, issueFolderObject, coordinates);

        parentBusinessObject.issues.push(issueFolderObject);
    }

    private drawIssue(parentShape: any, issue: GropiusIssue, coordinates: Coordinates) {
        const parentBusinessObject = parentShape.businessObject.data;

        let shape = {
            x: coordinates.x,
            y: coordinates.y,
            width: 40,
            height: 40,
            businessObject: {
                type: ObjectType.Issue,
                data: issue
            },
            custom: {
                shape: issue.path,
                style: {
                    rx: 0,
                    ry: 0,
                    fill: issue.color,
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

    public delete(id: string) {
        const element = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == id);

        if (!element || !element.businessObject)
            return
        else if (element.businessObject.type == ObjectType.SubConnection)
            return

        const toDeleteElements = [];

        if (element.businessObject.type == ObjectType.ComponentVersion) {
            // Delete Interfaces and Issues as well

            toDeleteElements.push(element.custom.versionObject);
            element.businessObject.data.interfaces.forEach((interf: GropiusInterface) => {
                toDeleteElements.push(this.elementRegistry.get(interf.shapeId));
            });
            element.businessObject.data.issues.forEach((issue: GropiusIssue) => {
                toDeleteElements.push(this.elementRegistry.get(issue.shapeId));
            });
        } else if (element.businessObject.type == ObjectType.Interface) {
            // Remove interface from parent's list
            const parentId = element.businessObject.data.parentId;
            const parent = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == parentId);

            const idx = parent.businessObject.data.interfaces.findIndex((e: any) => {
                return e.id == element.businessObject.data.id
            });
            parent.businessObject.data.interfaces.splice(idx, 1);
        } else if (element.businessObject.type == ObjectType.Issue) {
            // Remove issue from parent's list
            const parentId = element.businessObject.data.parentId;
            const parent = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == parentId);

            const idx = parent.businessObject.data.issues.findIndex((e: any) => e.id == element.businessObject.data.id);
            parent.businessObject.data.issues.splice(idx, 1);
        }

        toDeleteElements.push(element)
        this.modeling.removeElements(toDeleteElements); // Delete main shape
    }

    private createShape(shape: any) {
        const _shape = this.elementFactory.createShape(shape);
        this.canvas.addShape(_shape, this.root);
        return _shape;
    }

    private createConnectionBase(id: string | null, connection: Connection, style: GropiusConnectionStyle, isSubConnection = false) {
        // @ts-ignore
        connection.customRendered = true;
        // @ts-ignore
        connection.custom = {
            style: style,
            label: "" // TODO
        };

        if (id == null)
            id = connection.source.businessObject.data.id + "-" + connection.target.businessObject.data.id;

        const gropiusConnection: GropiusConnection = {
            id: id,
            sourceId: connection.source.businessObject.data.id,
            targetId: connection.target.businessObject.data.id
        };

        connection.businessObject = {
            type: isSubConnection ? ObjectType.SubConnection : ObjectType.Connection,
            data: gropiusConnection
        };

        return this.canvas.addConnection(connection, this.root);
    }

    private _createConnection(id: string | null, sourceId: string, targetId: string, style: GropiusConnectionStyle, waypoints?: Array<Coordinates>, isSubConnection: boolean = false) {
        const sourceElement = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == sourceId);
        const targetElement = this.elementRegistry.find((element: any) => element.businessObject && element.businessObject.data && element.businessObject.data.id == targetId);

        if (!waypoints)
            waypoints = [
                {x: sourceElement.x + sourceElement.width, y: sourceElement.y + sourceElement.height / 2},
                {x: targetElement.x, y: targetElement.y + targetElement.height / 2}
            ];

        let connection = this.elementFactory.createConnection({
            waypoints: waypoints,
            source: sourceElement,
            target: targetElement
        });

        return this.createConnectionBase(id, connection, style, isSubConnection);
    }

    public createConnection(id: string, sourceId: string, targetId: string, style: GropiusConnectionStyle, waypoints?: Array<Coordinates>) {
        this._createConnection(id, sourceId, targetId, style, waypoints, false);
    }

    public setDarkMode(enabled: boolean): void {
        Object.values(this.elementRegistry._elements).forEach((element: any) => {
            element = element.element;

            if (!element.businessObject)
                return;

            const white = "#ffffff";
            const black = "#000000";
            const dark = "#486581";
            let stroke = black,
                fill = white;

            if (element.businessObject.type == ObjectType.ComponentVersion) { // Main Gropius Component
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
                    fill = "#215a8f";
                    element.custom.style.whiteText = true;
                } else {
                    stroke = black;
                    fill = "#babafd";
                }

                element.custom.style.stroke = stroke;
                element.custom.style.fill = fill;
            } else if (element.businessObject.type == ObjectType.Connection || element.businessObject.type == ObjectType.SubConnection) {
                if (enabled && element.custom.style.color == black)
                    stroke = white;
                else if (!enabled && element.custom.style.color == white) {
                    stroke = black;
                } else
                    return;

                element.custom.style.color = stroke;
            }
            this.canvas._eventBus.fire("element.changed", {element: element});
        });

        const container = document.getElementById("container");
        if (container)
            container.style.backgroundColor = enabled ? "#102a43" : "#fff";
        else
            console.error("Cannot find element with ID: Container");

    }

    public autolayout() {
        autolayout(this.elementRegistry, this.canvas)
    }

    public setObjectTypeVisibility(objType: ObjectType, hidden: boolean) {
        const elements = Object.values(this.elementRegistry._elements);
        elements.forEach((element: any) => {
            const obj = element.element;
            if (obj.businessObject && obj.businessObject.type == objType) {
                this.setHiddeStyleAttribute(obj, element.gfx, hidden);

                if (obj.businessObject.type == ObjectType.ComponentVersion) {
                    const versionObject = obj.custom.versionObject;
                    this.setHiddeStyleAttribute(versionObject, this.elementRegistry.getGraphics(versionObject), hidden);

                    obj.businessObject.data.interfaces.forEach((interf: any) => {
                        const interfElement = this.elementRegistry.get(interf.shapeId);
                        this.setHiddeStyleAttribute(interfElement, this.elementRegistry.getGraphics(interfElement), hidden);
                    });

                    obj.businessObject.data.issues.forEach((issue: any) => {
                        const issueElement = this.elementRegistry.get(issue.shapeId);
                        this.setHiddeStyleAttribute(issueElement, this.elementRegistry.getGraphics(issueElement), hidden);
                    });
                }
            }
        });
    }

    private setHiddeStyleAttribute(element: any, gfx: any, hidden: boolean) {
        const style = document.createAttribute("style");
        style.value = "visibility:" + (hidden ? "hidden" : "block");
        gfx.attributes.setNamedItem(style);

        element.incoming?.forEach((con: any) => {
            this.setHiddeStyleAttribute(con, this.elementRegistry.getGraphics(con), hidden);
        });

        element.outgoing?.forEach((con: any) => {
            this.setHiddeStyleAttribute(con, this.elementRegistry.getGraphics(con), hidden);
        });
    }

    public export(): SerializedDiagram {
        return exportDiagram(this.elementRegistry)
    }

    public importDiagramString(diagram: string) {
        this.importDiagram(JSON.parse(diagram));
    }

    public importDiagram(diagram: SerializedDiagram) {
        diagram.shapes.forEach(shape => {
            const object = this.createComponentBase(shape.grShape, {x: shape.x, y: shape.y});
            shape.interfaces.forEach(interf => {
                //this.drawInterface(object, interf.interface, interf.coordinates, interf.waypoints);
                this.createInterface(interf.interface.id, interf.interface.parentId, interf.interface.name, interf.interface.shape, interf.interface.version, interf.coordinates, interf.waypoints)
            });
            shape.issues.forEach(issue => {
                //this.drawIssue(object, issue.issue, issue.coordinates);
                this.createIssue(issue.issue.id, issue.issue.parentId, issue.issue.path, issue.issue.color, issue.coordinates)
            });
        });

        diagram.connections.forEach(connection => {
            this._createConnection(connection.id, connection.sourceId, connection.targetId, connection.style, connection.waypoints);
        });
    }

    public demo() {

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
        }, {x: 150, y: 100});

        this.createInterface("11", "1", "Paypal", Shape.InterfaceProvide, "1.0");
        this.createInterface("12", "1", "CreditCard", Shape.Diamond, "1.0");
        this.createInterface("13", "1", "Goats", Shape.Hexagon, "1.0");
        let svgPath = "M16,5 C18.7614237,5 21,7.23857625 21,10 C21,10.3423792 20.9655872,10.6767209 20.9000316,10.9997548 C21.0507855,11.1120501 21.1957294,11.2342462 21.3333022,11.3641649 L24.8356362,8.25259068 L26.1643638,9.74740932 L22.4907621,13.0133863 C22.7546865,13.622313 22.9009805,14.2940721 22.9009805,15 C22.9009805,15.2442571 22.8830821,15.4880712 22.8474788,15.7294892 L27.1788854,16.5161301 L26.8211146,18.4838699 L22.4611146,17.69 L21.8641146,20.674 L25.7682213,25.3598156 L24.2317787,26.6401844 L21.0381198,22.8087468 C20.1297475,24.1456263 18.5994991,25 16.9009805,25 L15.0990195,25 C13.4000729,25 11.8694812,24.1451956 10.9611935,22.807736 L7.76822128,26.6401844 L6.23177872,25.3598156 L10.1351146,20.674 L9.53811456,17.69 L5.17888544,18.4838699 L4.82111456,16.5161301 L9.15247082,15.7299431 C9.0111947,14.7780252 9.15007412,13.8429995 9.51021231,13.0132111 L5.83563616,9.74740932 L7.16436384,8.25259068 L10.6647144,11.3651451 C10.802617,11.2346034 10.9483006,11.111583 11.1012234,10.9968969 C11.0342829,10.6754567 11,10.341732 11,10 C11,7.23857625 13.2385763,5 16,5 Z M20.662995,13.8270049 L20.5930614,13.6745856 C20.5778829,13.6438149 20.5621925,13.613342 20.5460011,13.5831782 L20.5927989,13.6740536 C20.567361,13.62251 20.5404863,13.5718026 20.512227,13.5219836 L20.5460011,13.5831782 C20.518133,13.5312609 20.4887809,13.4802589 20.4580017,13.430229 L20.512227,13.5219836 C20.4835377,13.4714064 20.4534214,13.4217449 20.4219328,13.3730537 L20.4580017,13.430229 C20.4310907,13.3864866 20.4030887,13.3434872 20.3740336,13.3012688 L20.4219328,13.3730537 C20.3839576,13.3143322 20.3439865,13.2570221 20.3021155,13.2012193 L20.3740336,13.3012688 C20.3416681,13.2542403 20.3079959,13.2081808 20.2730694,13.1631429 L20.3021155,13.2012193 C20.2689958,13.1570795 20.2346873,13.1138828 20.1992377,13.0716767 L20.2730694,13.1631429 C20.239098,13.1193365 20.20394,13.0764965 20.1676436,13.0346712 L20.0605208,12.9182041 L20.0605208,12.9182041 C19.9692376,12.8234261 19.8717762,12.7346536 19.7687854,12.652531 C19.7516851,12.6386152 19.7345687,12.6252808 19.7173054,12.6121294 L19.7173565,12.6124267 L19.6173174,12.539156 C19.5954381,12.5238676 19.5733455,12.5088636 19.5510448,12.4941493 L19.4404284,12.4245698 C19.4196314,12.4121117 19.3986709,12.3998984 19.3775509,12.3879338 L19.4399804,12.4244216 C19.3897371,12.3943184 19.3385391,12.3656457 19.2864426,12.3384595 L19.3775509,12.3879338 C19.3185981,12.3545367 19.2584029,12.3230778 19.1970519,12.2936436 L19.2864426,12.3384595 C19.2272919,12.307592 19.1669828,12.2786408 19.1055979,12.2516877 L19.1051516,12.2514524 L19.0221754,12.2165317 C19.016872,12.2143934 19.011561,12.2122699 19.0062427,12.2101611 L18.9312985,12.1816065 L18.9312985,12.1816065 L18.8392258,12.149637 C18.8318965,12.1472259 18.8245548,12.1448422 18.8172006,12.1424861 C18.772016,12.1280301 18.7270549,12.1147913 18.6816684,12.102591 L18.8172006,12.1424861 C18.7521062,12.1216315 18.6860439,12.1029395 18.6190984,12.0864946 L18.4365553,12.0476686 C18.4292922,12.0463597 18.4220199,12.045077 18.4147387,12.0438204 L18.4366759,12.0476908 C18.3744888,12.0364809 18.3116354,12.0271879 18.2481793,12.0198749 L18.4147387,12.0438204 C18.3041967,12.0247441 18.1915838,12.0117172 18.0772533,12.0050927 L17.9009805,12 L14.0990195,12 C13.992514,12 13.8861489,12.0056717 13.7803739,12.0169705 C13.780603,12.0185149 13.7808971,12.0188379 13.7811912,12.019161 L13.6653062,12.0315168 L13.6653062,12.0315168 L13.5106711,12.058258 L13.5106711,12.058258 L13.3175306,12.1034603 C13.301675,12.1077214 13.2858805,12.1121045 13.2701477,12.1166082 C13.2216274,12.1304913 13.173342,12.145643 13.1256774,12.1619228 L13.2701477,12.1166082 C13.1455008,12.1522903 13.0247325,12.1955484 12.9082507,12.2457709 L12.8954184,12.2513394 C12.7802697,12.3016289 12.6693474,12.3587392 12.5630487,12.4220745 C12.5454678,12.4325458 12.5276146,12.4434363 12.5098957,12.4545022 L12.5630487,12.4220745 C12.5108461,12.4531781 12.4597585,12.485783 12.4098331,12.5198186 L12.5098957,12.4545022 C12.4376483,12.4996221 12.3676328,12.5476566 12.2999795,12.59841 L12.2995722,12.5987155 L12.2655303,12.6246461 C12.2539751,12.6335793 12.2424912,12.6425929 12.2310793,12.6516857 L12.1716472,12.7002998 L12.1716472,12.7002998 L12.1048932,12.7580461 C12.0910472,12.7703849 12.0773222,12.7828464 12.0637198,12.7954284 L12.0366109,12.8208167 L12.0366109,12.8208167 L11.986156,12.8697932 C11.9702713,12.8855777 11.95457,12.9015329 11.9390547,12.9176551 C11.922135,12.935238 11.905527,12.9529206 11.8891409,12.9707948 L11.9390547,12.9176551 C11.8977145,12.9606119 11.8576939,13.0047541 11.8190398,13.0500112 L11.8891409,12.9707948 C11.8453751,13.018535 11.8031917,13.0676423 11.7626509,13.1180263 L11.8190398,13.0500112 C11.7814207,13.0940566 11.7450958,13.1391581 11.7101084,13.1852509 L11.7626509,13.1180263 C11.675746,13.2260314 11.5963888,13.3399036 11.5251722,13.4587534 C11.5082615,13.4869824 11.4919822,13.5151821 11.4761601,13.543645 C11.4597989,13.5730738 11.4438506,13.6029316 11.4284043,13.6330607 L11.4761601,13.543645 C11.4512853,13.5883929 11.4275402,13.6337913 11.4049546,13.6797954 L11.4284043,13.6330607 C11.401341,13.6858497 11.375819,13.7394714 11.3518847,13.7938561 L11.4049546,13.6797954 C11.3760726,13.7386248 11.3490868,13.7984446 11.3240598,13.8591612 L11.3518847,13.7938561 C11.3255639,13.8536635 11.3011632,13.9143938 11.2787443,13.9759543 L11.3240598,13.8591612 C11.1269914,14.337257 11.0513706,14.8709551 11.1277013,15.4145 L11.1572775,15.5883484 L11.3431146,16.516 L11.5391146,17.5 L12.1572775,20.5883484 C12.174149,20.672706 12.1944614,20.7556418 12.218051,20.8370215 C12.2306975,20.8806382 12.2442181,20.9236099 12.2586465,20.9661183 L12.218051,20.8370215 C12.23212,20.8855572 12.2473548,20.9335395 12.2637206,20.9809398 L12.2586465,20.9661183 C12.2765309,21.0188082 12.29581,21.0707863 12.3164367,21.1220137 L12.2637206,20.9809398 C12.6570487,22.1201393 13.7036435,22.9231783 14.9213539,22.9947874 L15.0990195,23 L16.9009805,23 C18.2027702,23 19.3398208,22.1635544 19.7448646,20.9557114 C19.766267,20.8918757 19.7855755,20.8271903 19.8027681,20.7615416 L19.8427225,20.5883484 L20.1597787,19 L20.1601146,18.999 L20.8427225,15.5883484 C20.8814664,15.3946289 20.9009805,15.197556 20.9009805,15 C20.9009805,14.6449598 20.8393054,14.3043246 20.7260846,13.9882237 L20.662995,13.8270049 L20.662995,13.8270049 Z M16,7 C14.3431458,7 13,8.34314575 13,10 L13.0040607,10.1213387 C13.0419936,10.1128428 13.0801209,10.1047602 13.1184388,10.0970966 C13.4413048,10.0325234 13.7697596,10 14.0990195,10 L17.9009805,10 C18.2771497,10 18.6436165,10.0415405 18.996044,10.1202845 L19,10 L19,10 C19,8.34314575 17.6568542,7 16,7 Z";
        svgPath = scaleSvgPath(svgPath, 1.8, -9, -9).toString();

        this.createIssue("14", "1", svgPath, "#ff0000");

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
        }, {x: 150, y: 250});

        // GOTO1
        this.createInterface("21", "2", "Generic", Shape.InterfaceRequire, "1.0");
        this.createInterface("22", "2", "Generic", Shape.InterfaceProvide, "1.0");
        this.createIssue("23", "2", svgPath, "#33dd88");
        this.createIssue("24", "2", svgPath, "#00bbbb");
        this.createIssue("25", "2", svgPath, "#dd11bb");
        this.createIssue("28", "2", svgPath, "#0033bb");


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
        }, {x: 150, y: 250});

        this.createInterface("31", "3", "DHL", Shape.InterfaceProvide, "1.0");
        this.createInterface("32", "3", "DPD", Shape.InterfaceRequire, "1.0");
        this.createIssue("33", "3", svgPath, "#a7f143");
        this.createIssue("34", "3", svgPath, "#a1b2c3");

        let d = this.createComponent("4", "Logging Service", "10.10.10", {
            name: "x",
            shape: Shape.Triangle,
            style: {
                minWidth: 150,
                minHeight: 100,
                maxScale: 5,
                color: "#ffffff",
                stroke: "#000000",
                strokeWidth: 2,
                strokeDasharray: "",
                radius: 5
            }
        }, {x: 150, y: 250});

        this._createConnection("1", "1", "2", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#000000",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

        this._createConnection("2", "4", "2", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#e05d01",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

        this._createConnection("3", "33", "25", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#e05d01",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

        this._createConnection("4", "23", "34", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#e05d01",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

        this._createConnection("5", "2", "3", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#e05d01",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

        this._createConnection("6", "21", "13", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#e05d01",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

        this._createConnection("7", "28", "14", {
            sourceMarkerType: ConnectionMarker.None,
            color: "#e05d01",
            strokeDasharray: "",
            strokeWidth: 2,
            targetMarkerType: ConnectionMarker.ArrowRightOpen
        }, [{x: a.x, y: a.y}, {x: b.x, y: b.y}]);

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
