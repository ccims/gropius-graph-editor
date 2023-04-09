import inherits from "inherits-browser";

import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import DefaultRenderer from "diagram-js/lib/draw/DefaultRenderer";
import { getColor, getFillColor, getStrokeColor } from "./RenderUtil";

import {
  rotate,
  transform,
  translate,
} from "diagram-js/lib/util/SvgTransformUtil";

import { componentsToPath, createLine } from "diagram-js/lib/util/RenderUtil";

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  classes as svgClasses,
  remove as svgRemove,
} from "tiny-svg";

import { assign } from "min-dash";

import { isFrameElement } from "diagram-js/lib/util/Elements";
import visuals from "diagram-js/lib/features/grid-snapping/visuals";

import { query as domQuery } from "min-dom";
import Ids from "ids";
import { vi } from "vuetify/locale";
import { Shape } from "@/lib/gropius-compatibility/types";

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
 */
export default function Renderer(eventBus, styles, canvas, textRenderer) {
  DefaultRenderer.call(this, eventBus, styles);

  this.CONNECTION_STYLE = styles.style(["no-fill"], {
    strokeWidth: 5,
    stroke: "blue",
  });
  this.SHAPE_STYLE = styles.style({
    fill: "white",
    stroke: "black",
    strokeWidth: 2,
    strokeDasharray: 0,
  });

  let rendererId = RENDERER_IDS.next();

  let markers = {};

  this.handler = function (visuals, element) {
    let render;
    switch (element.type) {
      case Shape.Rectangle:
        render = renderRectangle
        break;
      case Shape.Diamond:
        render = renderDiamond
        break;
      case Shape.Hexagon:
        render = renderHexagon
        break;
      case Shape.Ellipse:
        render = renderEllipse
        break;
      case Shape.Octagon:
        render = renderOctagon
        break;
      case Shape.Circle:
        render = renderCircle
        break;
      case Shape.Triangle:
        render = renderTriangle
        break;
      case Shape.Parallelogram:
        render = renderParallelogram
        break;
      case Shape.Trapeze:
        render = renderTrapeze
        break;
      default:
        renderRectangle(visuals, element)
        return
    }

    render(visuals, element, element.custom.style)

    if (element.custom && element.custom.label)
      renderEmbeddedLabel(
        visuals,
        element,
        "center-middle",
        element.custom.label
      );
  };

  this.connectionHandler = function (visuals, element, attrs) {
    const fill = "black",
      stroke = "black";
    attrs = {};
    //attrs.markerStart = marker("", fill, stroke);
    attrs.markerEnd = marker("", fill, stroke);
    // if ((element.custom && element.custom.label) || true)
    //   renderExternalLabel(visuals, element, "test");
    return drawConnectionSegments(visuals, element.waypoints, attrs);
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
      ...attrs,
    });

    svgAppend(visuals, rect);

    return rect;
  }

  function renderParallelogram(parentGfx, element, attrs) {
    const points = [
      { x: 0, y: element.height },
      { x: element.width - 20, y: element.height },
      { x: element.width, y: 0 },
      { x: 20, y: 0 },

    ];

    const pointsString = points.map(function (point) {
      return point.x + ',' + point.y;
    }).join(' ');

    attrs = styles.style(attrs);

    const polygon = svgCreate('polygon', {
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
      { x: 20, y: 0 },
    ];

    const pointsString = points.map(function (point) {
      return point.x + ',' + point.y;
    }).join(' ');

    attrs = styles.style(attrs);

    const polygon = svgCreate('polygon', {
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
      { x: element.width, y: element.height },
    ];

    const pointsString = points.map(function (point) {
      return point.x + ',' + point.y;
    }).join(' ');

    attrs = styles.style(attrs);

    const polygon = svgCreate('polygon', {
      ...attrs,
      points: pointsString
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderCircle(visuals, element, attrs) {
    let rect = svgCreate("circle");

    const radius = element.width / 2;
    const c = element.width / 2;

    attrs = styles.style(attrs);

    svgAttr(rect, {
      cx: c,
      cy: c,
      r: radius,
      ...attrs,
    });

    svgAppend(visuals, rect);

    return rect;
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
      { x: 0, y: (height * 2 / 3) },
    ];

    const pointsString = points.map(function (point) {
      return point.x + ',' + point.y;
    }).join(' ');

    attrs = styles.style(attrs);

    const polygon = svgCreate('polygon', {
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
      { x: 20, y: height },
    ];

    const pointsString = points.map(function (point) {
      return point.x + ',' + point.y;
    }).join(' ');

    attrs = styles.style(attrs);

    const polygon = svgCreate('polygon', {
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
      { x: 0, y: y_2 },
    ];

    const pointsString = points
      .map(function (point) {
        return point.x + "," + point.y;
      })
      .join(" ");

    attrs = styles.style(attrs);

    const polygon = svgCreate("polygon", {
      ...attrs,
      points: pointsString,
    });

    svgAppend(parentGfx, polygon);

    return polygon;
  }

  function renderLabel(parentGfx, label, options) {
    options = assign(
      {
        size: {
          width: 100,
        },
      },
      options
    );

    const text = textRenderer.createText(label || "", options);

    svgClasses(text).add("djs-label");

    svgAppend(parentGfx, text);

    return text;
  }

  function renderEmbeddedLabel(parentGfx, element, align, text, fontSize) {
    return renderLabel(parentGfx, text, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: "black",
        fontSize: fontSize || DEFAULT_TEXT_SIZE,
      },
    });
  }

  function renderExternalLabel(parentGfx, element, text) {
    console.log(element);
    const box = {
      width: 90,
      height: 30,
      x: element.width / 2 + element.x,
      y: element.height / 2 + element.y,
    };
    return renderLabel(parentGfx, text, {
      box: box,
      fitbox: true,
      style: assign({}, textRenderer.getExternalStyle(), {
        fill: "black",
      }),
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
      strokeWidth: 2,
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
      orient: "auto",
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

  function marker(type, fill, stroke) {
    const id =
      type +
      "-" +
      colorEscape(fill) +
      "-" +
      colorEscape(stroke) +
      "-" +
      rendererId;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke);
    }

    return "url(#" + id + ")";
  }

  function createMarker(id, type, fill, stroke) {
    const associationEnd = svgCreate("path", {
      d: "M 1 5 L 11 10 L 1 15 Z",
      ...lineStyle({
        fill: fill,
        stroke: stroke,
        strokeWidth: 1.5,

        // fix for safari / chrome / firefox bug not correctly
        // resetting stroke dash array
        strokeDasharray: [10000, 1],
      }),
    });

    addMarker(id, {
      element: associationEnd,
      ref: { x: 1, y: 10 },
      scale: 0.5,
    });
  }

  /**
   * @param {SVGElement} parentGfx
   * @param {Point[]} waypoints
   * @param {any} attrs
   * @param {number} [radius]
   *
   * @return {SVGElement}
   */
  function drawLine(parentGfx, waypoints, attrs, radius) {
    attrs = lineStyle(attrs);

    const line = createLine(waypoints, attrs, radius);

    svgAppend(parentGfx, line);

    return line;
  }

  /**
   * @param {SVGElement} parentGfx
   * @param {Point[]} waypoints
   * @param {any} attrs
   *
   * @return {SVGElement}
   */
  function drawConnectionSegments(parentGfx, waypoints, attrs) {
    return drawLine(parentGfx, waypoints, attrs, 5);
  }

  function drawPath(parentGfx, d, attrs) {
    attrs = lineStyle(attrs);

    const path = svgCreate("path", {
      ...attrs,
      d,
    });

    svgAppend(parentGfx, path);

    return path;
  }

  function drawMarker(type, parentGfx, path, attrs) {
    return drawPath(parentGfx, path, assign({ "data-marker": type }, attrs));
  }
}

inherits(Renderer, DefaultRenderer);

Renderer.prototype.canRender = function () {
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

Renderer.prototype.getShapePath = function getShapePath(shape) {
  const x = shape.x,
    y = shape.y,
    width = shape.width,
    height = shape.height;

  const shapePath = [
    ["M", x, y],
    ["l", width, 0],
    ["l", 0, height],
    ["l", -width, 0],
    ["z"],
  ];

  return componentsToPath(shapePath);
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

DefaultRenderer.prototype.drawShape = function drawShape(visuals, element) { };

DefaultRenderer.prototype.drawConnection = function drawShape(
  visuals,
  element
) { };
