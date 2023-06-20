import * as SVGPath from "svgpath"
import { Shape } from "@/lib/diagram/types";
import { Coordinates } from "@/types/HelperTypes";


const HEIGHT_PER_LINE = 20;
const WIDTH_PER_CHARACTER = 10;
const PADDING = 10;


export function scaleSvgPath(path: string, scale: number, x: number = 0, y: number = 0) {
  //@ts-ignore
  return SVGPath(path).scale(scale).translate(x,y)
}

export function getCharacterCountForSize(width: number, height: number) {
  return Math.floor(((width - PADDING) / WIDTH_PER_CHARACTER) * ((height - PADDING) / HEIGHT_PER_LINE));
}

export function getCharacterCountForSizeByType(width: number, height: number, shape: Shape) {
  let factor = 1;

  switch (shape) {
    case Shape.Diamond:
      factor = 3;
      break;
    case Shape.Triangle:
      factor = 3;
      break;
    case Shape.Octagon:
      factor = 1.25;
      break;
    case Shape.Circle:
    case Shape.Ellipse:
      factor = 1.5;
      break;
    case Shape.Hexagon:
      factor = 1.1;
      break;
  }

  return getCharacterCountForSize(width, height) / factor;
}

export function getTextBasedDimensions(minWidth: number, minHeight: number, maxScale: number, text: string, shape: Shape): { width: number, height: number, text: string } {

  const maxWidth = Math.floor(minWidth * maxScale);
  const maxHeight = Math.floor(minHeight * maxScale);

  let width = minWidth;
  let height = minHeight;
  let adjustedText = text;

  const characters = text.length;

  // max number of characters based on max size
  let estimatedMaxCharacters = getCharacterCountForSizeByType(maxWidth, maxHeight, shape);

  if (characters > estimatedMaxCharacters) {
    width = maxWidth;
    height = maxHeight;
  } else {
    // There is room to resize

    let ratio = height / width;
    let charactersForSize = getCharacterCountForSizeByType(width, height, shape);

    const increaseBy = 10;
    while (characters > charactersForSize) {
      // while sizes not big enough
      width += increaseBy;
      width = width > maxWidth ? maxWidth : width;

      height = Math.round(ratio * width);
      height = height > maxHeight ? maxHeight : height;
      // additional loop breaker
      if (width == maxWidth && height == maxHeight)
        break;

      // recalculate the characters that fit in updated size
      charactersForSize = getCharacterCountForSizeByType(width, height, shape);
    }
  }

  const ret = {
    width: width,
    height: height,
    text: adjustedText
  };
  return ret;
}

export function getVersionOffsetFromShape(componentShape: any): Coordinates {
  const shape = componentShape.custom.shape;
  const w = componentShape.width,
    h = componentShape.height,
    vh = 40, // version width
    vw = 90;  // version height

  switch (shape) {
    case Shape.Diamond:
    case Shape.Parallelogram:
    case Shape.Circle:
    case Shape.Octagon:
    case Shape.Triangle:
    case Shape.Hexagon:
    case Shape.Trapeze:
    case Shape.Ellipse:
    case Shape.Rectangle:
      //default:
      return { x: w / 2 - vw / 2, y: h };
  }

  return { x: 0, y: 0 };
}