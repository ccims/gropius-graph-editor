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
    }]
])

export interface GropiusType {
    plainName: string,
    gropiusId: string,
    diagramId?: string,
    isGropiusDefault?: boolean,
}

export default GropiusDefaultTypes