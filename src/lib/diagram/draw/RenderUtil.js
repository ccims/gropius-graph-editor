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

// helpers //////////

export function getColor(element) {
    return element.color;
}
