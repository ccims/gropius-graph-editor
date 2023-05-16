import { componentsToPath } from "diagram-js/lib/util/RenderUtil";

// color access //////////////////////

export function getFillColor(element, defaultColor) {
    return (
        getColor(element) ||
        getDi(element).get("bioc:fill") ||
        defaultColor ||
        "white"
    );
}

export function getStrokeColor(element, defaultColor) {
    return (
        getColor(element) ||
        getDi(element).get("bioc:stroke") ||
        defaultColor ||
        "black"
    );
}

// cropping path customizations //////////////////////

export function getRectPath(shape) {
    const x = shape.x,
        y = shape.y,
        width = shape.width,
        height = shape.height;

    const rectPath = [
        ["M", x, y],
        ["l", width, 0],
        ["l", 0, height],
        ["l", -width, 0],
        ["z"],
    ];

    return componentsToPath(rectPath);
}

export function getCirclePath(shape) {
    let cx = shape.x + shape.width / 2,
      cy = shape.y + shape.height / 2,
      radius = shape.width / 2;

    let circlePath = [
        [ 'M', cx, cy ],
        [ 'm', 0, -radius ],
        [ 'a', radius, radius, 0, 1, 1, 0, 2 * radius ],
        [ 'a', radius, radius, 0, 1, 1, 0, -2 * radius ],
        [ 'z' ]
    ];

    return componentsToPath(circlePath);
}

export function getDiamondPath(shape) {
    let width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y,
      halfWidth = width / 2,
      halfHeight = height / 2;

    let diamondPath = [
        [ 'M', x + halfWidth, y ],
        [ 'l', halfWidth, halfHeight ],
        [ 'l', -halfWidth, halfHeight ],
        [ 'l', -halfWidth, -halfHeight ],
        [ 'z' ]
    ];

    return componentsToPath(diamondPath);
}

export function getParallelogramPath(shape) {
    let width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y

    let path = [
        [ 'M', x, y ],
        [ 'l', width, 0 ],
        [ 'l', -20, height ],
        [ 'l', - (width-20), 0 ],
        [ 'z' ]
    ];

    return componentsToPath(path);
}

export function getOctagonPath(shape) {
    let width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y

    let path = [
        [ 'M', x + 20, y ],
        [ 'l', width - 40, 0 ],
        [ 'l', 20, height/3 ],
        [ 'l', 0, height/3 ],
        [ 'l', -20, height/3 ],
        [ 'l', -(width-40), 0 ],
        [ 'l', -20, -height/3 ],
        [ 'l', 0, -height/3 ],
        [ 'z' ]
    ];

    return componentsToPath(path);
}

export function getTrianglePath(shape) {
    let width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y

    let path = [
        [ 'M', x+width/2, y ],
        [ 'l', width/2, height ],
        [ 'l', -width, 0 ],
        [ 'z' ]
    ];

    return componentsToPath(path);
}

export function getHexagonPath(shape) {
    let width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y

    let path = [
        [ 'M', x + 20, y ],
        [ 'l', width - 40, 0 ],
        [ 'l', 20, height/2 ],
        [ 'l', -20, height/2 ],
        [ 'l', -(width-40), 0 ],
        [ 'l', -20, -height/2 ],
        [ 'z' ]
    ];

    return componentsToPath(path);
}

export function getTrapezePath(shape) {
    let width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y

    let path = [
        [ 'M', x + 20, y ],
        [ 'l', width - 40, 0 ],
        [ 'l', 20, height ],
        [ 'l', -width, 0 ],
        [ 'z' ]
    ];

    return componentsToPath(path);
}

export function getEllipsePath(shape) {
    return getRectPath(shape)
}

export function getInterfaceProvidePath(shape) {
    return getCirclePath(shape)
}

export function getInterfaceRequirePath(shape) {
    return getDiamondPath(shape)
}

// helpers //////////

export function getColor(element) {
    return element.color;
}