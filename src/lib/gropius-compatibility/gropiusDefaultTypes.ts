const GropiusDefaultTypes: Map<string, GropiusType> = new Map<string, GropiusType>([
    ["Component", {
        plainName: "Component",
        gropiusId: "shape-gropius-component",
        isGropiusDefault: true
    }],
    ["Library", {
        plainName: "Library",
        gropiusId: "shape-gropius-library",
        isGropiusDefault: true
    }],
    ["Hexagon", {
        plainName: "Hexagon",
        gropiusId: "shape-gropius-hexagon",
        isGropiusDefault: true
    }],
    ["Ellipse", {
        plainName: "Ellipse",
        gropiusId: "shape-gropius-ellipse",
        isGropiusDefault: true
    }],
    ["Octagon", {
        plainName: "Octagon",
        gropiusId: "shape-gropius-octagon",
        isGropiusDefault: true
    }],
    ["Circle", {
        plainName: "Circle",
        gropiusId: "shape-gropius-circle",
        isGropiusDefault: true
    }],
    ["Triangle", {
        plainName: "Triangle",
        gropiusId: "shape-gropius-triangle",
        isGropiusDefault: true
    }],
    ["Parallelogram", {
        plainName: "Parallelogram",
        gropiusId: "shape-gropius-parallelogram",
        isGropiusDefault: true
    }],
    ["Trapeze", {
        plainName: "Trapeze",
        gropiusId: "shape-gropius-trapeze",
        isGropiusDefault: true
    }]
])

export interface GropiusType {
    plainName: string,
    gropiusId: string,
    diagramId?: string,
    isGropiusDefault?: boolean,
}

export default GropiusDefaultTypes