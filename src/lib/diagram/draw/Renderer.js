import inherits from "inherits-browser";

import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import DefaultRenderer from "diagram-js/lib/draw/DefaultRenderer";
import {
  getCirclePath,
  getColor,
  getDiamondPath, getEllipsePath,
  getFillColor, getHexagonPath, getInterfaceProvidePath, getInterfaceRequirePath, getOctagonPath,
  getParallelogramPath,
  getRectPath,
  getStrokeColor, getTrapezePath, getTrianglePath
} from "./RenderUtil";

import {
  rotate,
  transform,
  translate
} from "diagram-js/lib/util/SvgTransformUtil";

import { componentsToPath, createLine } from "diagram-js/lib/util/RenderUtil";

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  classes as svgClasses,
  remove as svgRemove
} from "tiny-svg";

import { assign } from "min-dash";

import { isFrameElement } from "diagram-js/lib/util/Elements";
import visuals from "diagram-js/lib/features/grid-snapping/visuals";

import { query as domQuery } from "min-dom";
import Ids from "ids";
import { el, vi } from "vuetify/locale";
import { ConnectionMarker, Shape } from "@/lib/diagram/types";
import { ObjectType } from "@/lib/gropius-compatibility/types";

let RENDERER_IDS = new Ids();

/**
 * @typedef {import("../core/EventBus").default} EventBus
 * @typedef {import("./Styles").default} Styles
 */

// apply default renderer with lowest possible priority
// so that it only kicks in if noone else could render
const DEFAULT_RENDER_PRIORITY = 1;
const DEFAULT_TEXT_SIZE = 16;

/**
 * The default renderer used for shapes and connections.
 *
 * @param {EventBus} eventBus
 * @param {Styles} styles
 * @param {import("diagram-js/lib/core/Canvas").default} canvas
 * @param {import("./TextRenderer").default} textRenderer
 */
export default function Renderer(eventBus, styles, canvas, textRenderer) {
  DefaultRenderer.call(this, eventBus, styles);

  this.CONNECTION_STYLE = styles.style(["no-fill"], {
    strokeWidth: 5,
    stroke: "blue"
  });
  this.SHAPE_STYLE = styles.style({
    fill: "white",
    stroke: "black",
    strokeWidth: 2,
    strokeDasharray: 0
  });

  let rendererId = RENDERER_IDS.next();

  let markers = {};

  this.handler = function(visuals, element) {
    let render;
    if (!element.custom) {
      renderRectangle(visuals, element);
      return;
    } else
      switch (element.custom.shape) {
        case Shape.Rectangle:
          render = renderRectangle;
          break;
        case Shape.Diamond:
          render = renderDiamond;
          break;
        case Shape.Hexagon:
          render = renderHexagon;
          break;
        case Shape.Ellipse:
          render = renderEllipse;
          break;
        case Shape.Octagon:
          render = renderOctagon;
          break;
        case Shape.Circle:
          render = renderCircle;
          break;
        case Shape.Triangle:
          render = renderTriangle;
          break;
        case Shape.Parallelogram:
          render = renderParallelogram;
          break;
        case Shape.Trapeze:
          render = renderTrapeze;
          break;
        case Shape.InterfaceProvide:
          render = renderInterfaceProvide;
          break;
        case Shape.InterfaceRequire:
          render = renderInterfaceRequire;
          break;
        default:
          render = renderPath;
          break;
      }

    render(visuals, element, element.custom.style);


    if (element.businessObject.type === ObjectType.Gropius || element.businessObject.type === ObjectType.Version) {
      renderEmbeddedLabel(
        visuals,
        element,
        "center-middle",
        element.custom.label,
        DEFAULT_TEXT_SIZE,
        element.custom.style.whiteText ? "white" : "black"
      );
    } else {
      renderExternalLabel(
        visuals,
        element,
        element.custom.label,
        DEFAULT_TEXT_SIZE,
        element.custom.style.whiteText ? "white" : "black"
      );
    }

  };

  this.connectionHandler = function(visuals, element, attrs) {
    attrs = {};
    //attrs.markerStart = marker("", fill, stroke);
    if (element.custom) {
      attrs = {
        stroke: element.custom.style.strokeColor,
        strokeWidth: element.custom.style.strokeWidth,
        strokeDasharray: element.custom.style.strokeDasharray
      };
      if (element.custom.style.sourceMarkerType != ConnectionMarker.None)
        attrs.markerStart = marker(element.custom.style.sourceMarkerType, element.custom.style.strokeColor, element.custom.style.strokeColor, true);
      if (element.custom.style.targetMarkerType != ConnectionMarker.None)
        attrs.markerEnd = marker(element.custom.style.targetMarkerType, element.custom.style.strokeColor, element.custom.style.strokeColor, false);

      // TODO Label
    } else {
      attrs = {
        stroke: "black",
        strokeWidth: 2,
        strokeDasharray: ""
      };
      attrs.markerEnd = marker(ConnectionMarker.Right, "black", "black", false);
    }
    // if ((element.custom && element.custom.label) || true)
    //   renderExternalLabel(visuals, element, "test");
    return drawConnection(visuals, element.waypoints, attrs);
  };

  function renderRectangle(visuals, element, attrs) {
    let rect = svgCreate("rect");

    attrs = styles.style(attrs);

    svgAttr(rect, {
      x: 0,
      y: 0,
      width: element.width || 10,
      height: element.height || 10,
      // fill: 'grey', stroke: 'black', strokeWidth: 2,
      ...attrs
    });

    svgAppend(visuals, rect);

    return rect;
  }

  function renderParallelogram(parentGfx, element, attrs) {
    const points = [
      { x: 0, y: element.height },
      { x: element.width - 20, y: element.height },
      { x: element.width, y: 0 },
      { x: 20, y: 0 }

    ];

    const pointsString = points.map(function(point) {
      return point.x + "," + point.y;
    }).join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderTrapeze(parentGfx, element, attrs) {
    const points = [
      { x: 0, y: element.height },
      { x: element.width, y: element.height },
      { x: element.width - 20, y: 0 },
      { x: 20, y: 0 }
    ];

    const pointsString = points.map(function(point) {
      return point.x + "," + point.y;
    }).join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderTriangle(parentGfx, element, attrs) {

    const points = [
      { x: element.width / 2, y: 0 },
      { x: 0, y: element.height },
      { x: element.width, y: element.height }
    ];

    const pointsString = points.map(function(point) {
      return point.x + "," + point.y;
    }).join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderCircle(visuals, element, attrs) {
    let circle = svgCreate("circle");

    const radius = element.width / 2;
    const c = element.width / 2;

    attrs = styles.style(attrs);

    svgAttr(circle, {
      cx: c,
      cy: c,
      r: radius,
      ...attrs
    });

    svgAppend(visuals, circle);

    return circle;
  }

  function renderOctagon(parentGfx, element, attrs) {
    const width = element.width;
    const height = element.height;

    const points = [
      { x: 0, y: height / 3 },
      { x: 20, y: 0 },
      { x: width - 20, y: 0 },
      { x: width, y: height / 3 },
      { x: width, y: (height * 2) / 3 },
      { x: width - 20, y: height },
      { x: 20, y: height },
      { x: 0, y: (height * 2 / 3) }
    ];

    const pointsString = points.map(function(point) {
      return point.x + "," + point.y;
    }).join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderEllipse(parentGfx, element, attrs) {
    let ellipse = svgCreate("ellipse");

    const cx = element.width / 2;
    const cy = element.height / 2;

    const rx = (element.width / 2).toString();
    const ry = (element.height / 2).toString();

    attrs = styles.style(attrs);

    svgAttr(ellipse, {
      ...attrs,
      cx: cx,
      cy: cy,
      rx: rx,
      ry: ry
    });

    svgAppend(parentGfx, ellipse);

    return ellipse;
  }

  function renderHexagon(parentGfx, element, attrs) {
    const width = element.width;
    const height = element.height;

    const points = [
      { x: 0, y: element.height / 2 },
      { x: 20, y: 0 },
      { x: width - 20, y: 0 },
      { x: width, y: height / 2 },
      { x: width - 20, y: height },
      { x: 20, y: height }
    ];

    const pointsString = points.map(function(point) {
      return point.x + "," + point.y;
    }).join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderDiamond(parentGfx, element, attrs) {
    const width = element.width;
    const height = element.height;

    const x_2 = width / 2;
    const y_2 = height / 2;

    const points = [
      { x: x_2, y: 0 },
      { x: width, y: y_2 },
      { x: x_2, y: height },
      { x: 0, y: y_2 }
    ];

    const pointsString = points
      .map(function(point) {
        return point.x + "," + point.y;
      })
      .join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderInterfaceProvide(visuals, element, attrs) {
    return renderCircle(visuals, element, attrs);
  }

  function renderInterfaceRequire(visuals, element, attrs) {
    const parentObject = element.custom.parentObject;
    let path;

    if (element.x + element.width < parentObject.x)
      path = "M20,0 a1,1 0 0,10 40,0"; // left
    else if (element.x > parentObject.x + parentObject.width)
      path = "M20,0 a1,1 0 10,0 40,0"; // right
    else if (element.y < parentObject.y)
      path = "M0,20 a1,1 0 0,0 40,0"; // top
    else
      path = "M0,20 a1,1 0 0,1 40,0"; // bottom

    let circle = svgCreate("path", {
      d: path
    });

    const radius = element.width / 2;
    const c = element.width / 2;

    attrs = styles.style(attrs);

    svgAttr(circle, {
      cx: c,
      cy: c,
      r: radius,
      ...attrs
    });

    svgAppend(visuals, circle);

    return circle;
  }

  function renderPath(visuals, element, attrs) {
    const parentObject = element.custom.parentObject;
    let path = element.custom.shape;

    let circle = svgCreate("path", {
      d: path
    });

    const c = element.width / 2;

    attrs = styles.style(attrs);

    svgAttr(circle, {
      cx: c,
      cy: c,
      r: 0,
      ...attrs
    });

    svgAppend(visuals, circle);

    return circle;
  }




  function renderLabel(parentGfx, label, options) {
    options = assign(
      {
        size: {
          width: 100
        }
      },
      options
    );

    const text = textRenderer.createText(label || "", options);

    svgClasses(text).add("djs-label");

    svgAppend(parentGfx, text);

    return text;
  }

  function renderEmbeddedLabel(parentGfx, element, align, text, fontSize = DEFAULT_TEXT_SIZE, color = "black") {

    const label = renderLabel(parentGfx, text, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: color,
        fontSize: fontSize
      }
    });
    return label;
  }

  function renderExternalLabel(parentGfx, element, text, fontSize = DEFAULT_TEXT_SIZE, color = "black") {
    const box = {
      width: 90,
      height: 90,
      x: -element.width / 2,
      y: element.height + 5,
      custom: element.custom
    };

    return renderLabel(parentGfx, text, {
      box: box,
      fitBox: true,
      style: {
        fill: color,
        fontSize: fontSize
      },
      external: true
    });
  }

  /**
   * Connection Rendering
   */

  function lineStyle(attrs) {
    return styles.computeStyle(attrs, ["no-fill"], {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      stroke: "black",
      strokeWidth: 2
    });
  }

  function addMarker(id, options) {
    const { ref = { x: 0, y: 0 }, scale = 1, element } = options;

    const marker = svgCreate("marker", {
      id: id,
      viewBox: "0 0 20 20",
      refX: ref.x,
      refY: ref.y,
      markerWidth: 20 * scale,
      markerHeight: 20 * scale,
      orient: "auto"
    });

    svgAppend(marker, element);

    let defs = domQuery("defs", canvas._svg);

    if (!defs) {
      defs = svgCreate("defs");

      svgAppend(canvas._svg, defs);
    }

    svgAppend(defs, marker);

    markers[id] = marker;
  }

  function colorEscape(str) {
    // only allow characters and numbers
    return str.replace(/[^0-9a-zA-z]+/g, "_");
  }

  function marker(type, fill, stroke, isStart) {
    const id =
      type +
      "-" +
      colorEscape(fill) +
      "-" +
      colorEscape(stroke) +
      "-" +
      rendererId +
      isStart;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke, isStart);
    }

    return "url(#" + id + ")";
  }

  function createMarker(id, type, fill, stroke, isStart = false) {
    let marker;
    switch (type) {
      case ConnectionMarker.Round:
        marker = svgCreate("circle", {
          cx: 6,
          cy: 6,
          r: 2,
          ...lineStyle({
            fill: fill,
            stroke: stroke,
            strokeWidth: 1.5,

            // fix for safari / chrome / firefox bug not correctly
            // resetting stroke dash array
            strokeDasharray: [10000, 1]
          })
        });
        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? 3 : 9), y: 6 }
        });
        break;
      case ConnectionMarker.ArrowLeft:
        marker = svgCreate("path", {
          d: "M 11 5 L 1 10 L 11 15",
          ...lineStyle({
            fill: "none",
            stroke: stroke,
            strokeWidth: 1.5,

            // fix for safari / chrome / firefox bug not correctly
            // resetting stroke dash array
            strokeDasharray: [10000, 1]
          })
        });

        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? 0 : 12), y: 10 },
          scale: 0.5
        });

      case ConnectionMarker.ArrowRight:
        marker = svgCreate("path", {
          d: "M 1 5 L 11 10 L 1 15",
          ...lineStyle({
            fill: "none",
            stroke: stroke,
            strokeWidth: 1.5,

            // fix for safari / chrome / firefox bug not correctly
            // resetting stroke dash array
            strokeDasharray: [10000, 1]
          })
        });

        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? 1 : 11), y: 10 },
          scale: 0.5
        });

      case ConnectionMarker.Composition:
        marker = svgCreate("path", {
          d: "M 0 10 L 8 6 L 16 10 L 8 14 Z",
          ...lineStyle({
            fill: fill,
            stroke: stroke
          })
        });

        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? -2 : 18), y: 10 },
          scale: 0.5
        });

      case ConnectionMarker.Slash:
        marker = svgCreate("path", {
          d: "M 6 4 L 10 16",
          ...lineStyle({
            stroke: stroke
          })
        });

        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? 0 : 16), y: 10 },
          scale: 0.5
        });

      case ConnectionMarker.Right:
        marker = svgCreate("path", {
          d: "M 1 5 L 11 10 L 1 15 Z",
          ...lineStyle({
            fill: fill,
            stroke: stroke,
            strokeWidth: 1.5,

            // fix for safari / chrome / firefox bug not correctly
            // resetting stroke dash array
            strokeDasharray: [10000, 1]
          })
        });
        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? 1 : 12), y: 10 },
          scale: 0.5
        });
        break;

      case ConnectionMarker.Left:
        marker = svgCreate("path", {
          d: "M 11 5 L 1 10 L 11 15 Z",
          ...lineStyle({
            fill: fill,
            stroke: stroke,
            strokeWidth: 1.5,

            // fix for safari / chrome / firefox bug not correctly
            // resetting stroke dash array
            strokeDasharray: [10000, 1]
          })
        });
        addMarker(id, {
          element: marker,
          ref: { x: (isStart ? 0 : 12), y: 10 },
          scale: 0.5
        });
        break;
    }
  }

  /**
   * @param {SVGElement} parentGfx
   * @param {Point[]} waypoints
   * @param {any} attrs
   *
   * @return {SVGElement}
   */
  function drawConnection(parentGfx, waypoints, attrs) {
    const radius = 5;
    //attrs = lineStyle(attrs);
    attrs = styles.computeStyle(attrs, ["no-fill"], {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      stroke: attrs.stroke,
      strokeWidth: attrs.strokeWidth
    });

    const line = createLine(waypoints, attrs, radius);

    svgAppend(parentGfx, line);

    return line;
  }

  function drawPath(parentGfx, d, attrs) {
    attrs = lineStyle(attrs);

    const path = svgCreate("path", {
      ...attrs,
      d
    });

    svgAppend(parentGfx, path);

    return path;
  }

  function drawMarker(type, parentGfx, path, attrs) {
    return drawPath(parentGfx, path, assign({ "data-marker": type }, attrs));
  }
}

inherits(Renderer, DefaultRenderer);

Renderer.prototype.canRender = function() {
  return true;
};

Renderer.prototype.drawConnection = function drawConnection(
  visuals,
  connection,
  attrs
) {
  // let line = createLine(connection.waypoints, assign({}, this.CONNECTION_STYLE, attrs || {}));
  // svgAppend(visuals, line);
  //
  // return line;
  this.connectionHandler(visuals, connection, attrs);
};

Renderer.prototype.drawShape = function drawShape(visuals, element) {
  this.handler(visuals, element);
};

// Note: Using Renderer.prototype.getShapePath doesn't work.
DefaultRenderer.prototype.getShapePath = function(shape) {

  if (!shape.custom || !shape.custom.shape) {
    return getRectPath(shape);
  }

  switch (shape.custom.shape) {
    case Shape.Diamond:
      return getDiamondPath(shape);
    case Shape.Parallelogram:
      return getParallelogramPath(shape);
    case Shape.Circle:
      return getCirclePath(shape);
    case Shape.Octagon:
      return getOctagonPath(shape);
    case Shape.Triangle:
      return getTrianglePath(shape);
    case Shape.Hexagon:
      return getHexagonPath(shape);
    case Shape.Trapeze:
      return getTrapezePath(shape);
    case Shape.Ellipse:
      return getEllipsePath(shape);
    case Shape.InterfaceProvide:
      return getInterfaceProvidePath(shape);
    case Shape.InterfaceRequire:
      return getInterfaceRequirePath(shape);
    default:
      return getRectPath(shape);
  }
};

Renderer.prototype.getConnectionPath = function getConnectionPath(connection) {
  const waypoints = connection.waypoints;

  let idx,
    point,
    connectionPath = [];

  for (idx = 0; (point = waypoints[idx]); idx++) {
    // take invisible docking into account
    // when creating the path
    point = point.original || point;

    connectionPath.push([idx === 0 ? "M" : "L", point.x, point.y]);
  }

  return componentsToPath(connectionPath);
};

Renderer.$inject = ["eventBus", "styles", "canvas", "textRenderer"];

DefaultRenderer.prototype.drawShape = function drawShape(visuals, element) {
};

DefaultRenderer.prototype.drawConnection = function drawShape(
  visuals,
  element
) {
};
