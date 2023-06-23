# Gropius Diagram Lib

## Get Started


Create a div in which the diagram should be drawn

**HTML**
```
<div id="gropius"></div>
```


**Typescript**
```
diagram = new GropiusDiagram();
diagram.init(document.getElementById("gropius"));
```

To listen to events set the callback methods

```
diagram.onAddShape = (coordinates: Coordinates) => {
    ...
}

diagram.onAddConnection = (sourceId: string, targetId: string, waypoints: Coordinates[]) => {
    ...
}

diagram.onAddInterface = (id: string) => {
    ...
}

diagram.onAddIssue = (id: string) => {
    ...
}

diagram.onDelete = (id: string) => {
    ...
}

```


## Methods

### Create a ComponentVersion

`diagram.createComponent(id, name, version, grType, coordinates)`

- `id` : ID as string
- `name` : Text to be written into the shape
- `version` : Version text to be written in the version shape
- `grType` : GropiusType, contains type name, shape and styling

### Create an Interface

`diagram.createInterface(id, parentId, name, shape, version, [coordinates], [waypoints])`

- `id` : ID of the interface
- `parentId` : ID of the ComponentVersion the interface belongs to
- `name` : Text to be written under the interface shape
- `shape` : The shape of the interface
- `version` : Version text to be written under the interface name
- `coordinates` : Coordinates of the interface (optional, default: next to parent)
- `waypoints` : Waypoints of the connection between parent and interface (optional, default: simple line)

### Create an Issue (-icon)

`diagram.createIssue(id, parentId, path, color, [coordinates])`

- `id` : ID of the issue
- `parentId` : ID of the ComponentVersion the interface belong to
- `path` : SVG Path as string of the issue shape
- `color` : Color of the path
- `coordinates` : Coordinates of the issue (optional, default: next to parent)

### Create Connection

`diagram.createConnection(id, sourceId, targetId, style, [waypoints], [isSubConnection])`

- `id` : ID of the connection (optional)
- `sourceId` : ID of the source shape
- `targetId` : ID of the target shape
- `style` : Style of the connection
- `waypoints` : Waypoints of the connection between source and target (optional, default: simple line)

### Delete a Shape or Connection

Deletes a connection or shape along with its connections. If the shape is a `ComponentVersion`, all issues and interfaces will be deleted as well.

`diagram.delete(id)`

- `id` : ID of the shape/connection to be deleted

### Export Diagram

Export the diagram as `SerializedDiagram` object. Can be stringyfied.

`diagram.export()`

### Import Diagram

Import a diagram from text or object.

`diagram.importDiagram(diagram)`

- `diagram`: Object of type `SerializedDiagram`

`diagram.importDiagramString(serializedDiagram)`

- `serializedDiagram` : string of serialized diagram

### Dark Mode

`diagram.setDarkMode(enabled)`

- `enabled` : Boolean

### Hide Components

`diagram.setObjectTypeVisibility(objType, hidden)`

- `objType` : Object typ to hide (e.g. `Interface` or `Issue`)
- `hidden` : Boolean whether the specified is hidden or visible

### Auto Layout

Layout the whole diagram. 

**WARNING**: this will very likely move all components around!

`diagram.autolayout()`


## Style

### Shapes

| Property | Type | Description |
| --- | --- | --- |
| minWidth | number | Minimum width |
| minHeight | number | Minumum height |
| maxScale | number | Defines the maximum size of a shape after resizing to fit text. `maxWidth = minWidth * maxScale` |
| color | string | Fill color of the shape |
| stroke | string | Border color of the shape |
| strokeWidth | number | Thickness of the border |
| strokeDasharray | string | Dasharray of the border |
| radius | number | Roundness of shape (currently only supported by rectangle) |

#### Available Shapes

- Rectangle
- Triangle
- Circle
- Diamond
- Hexagon
- Octagon
- Ellipse
- Parallelogram
- Trapeze
- InterfaceProvide (essentially a circle)
- InterfaceRequire (half circle, only shape without fill color)

### Connection 

| Property | Type | Description |
| --- | --- | --- |
| color | string | Color of the line |
| strokeWidth | number | Thickness of the line |
| strokeDasharray | string | Dasharray of the line |
| sourceMarkerType | ConnectionMarker | Marker for the source end |
| targetMarkerType | ConnectionMarker | Marker for the target end |

#### Available Connection Markers

- None
- ArrowLeftFill
- ArrowRightFill
- ArrowLeftOpen
- ArrowRightOpen
- Circle
- Diamond
- Slash