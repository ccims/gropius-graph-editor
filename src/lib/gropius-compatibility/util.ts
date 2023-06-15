import * as SVGPath from "svgpath"

export function scaleSvgPath(path: string, scale: number, x: number = 0, y: number = 0) {
  //@ts-ignore
  return SVGPath(path).scale(scale).translate(x,y)
}