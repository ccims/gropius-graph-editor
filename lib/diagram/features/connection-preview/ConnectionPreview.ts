import {
  append as svgAppend,
  attr as svgAttr,
  classes as svgClasses,
  create as svgCreate,
  remove as svgRemove,
  clear as svgClear
} from "tiny-svg";

import {
  isObject
} from "min-dash";

import {
  getElementLineIntersection,
  getMid
  // @ts-ignore
} from "diagram-js/lib/layout/LayoutUtil";

// @ts-ignore
import {
  createLine
  // @ts-ignore
} from "diagram-js/lib/util/RenderUtil";

/**
 * @typedef {import("../../model").Base} Base
 * @typedef {import("../../model").Connection} Connection
 * @typedef {import("../../model").Shape} Shape
 *
 * @typedef {import("../../util/Types").Point} Point
 *
 * @typedef {import("didi").Injector} Injector
 *
 * @typedef {import("../../core/Canvas").default} Canvas
 * @typedef {import("../../core/ElementFactory").default} ElementFactory
 * @typedef {import("../../core/GraphicsFactory").default} GraphicsFactory
 */

const MARKER_CONNECTION_PREVIEW = "djs-connection-preview";

import GraphicsFactory from "diagram-js/lib/core/GraphicsFactory";
import Canvas from "diagram-js/lib/core/Canvas";
import ElementFactory from "diagram-js/lib/core/ElementFactory";
import { Injector } from "didi";

/**
 * Draws connection preview. Optionally, this can use layouter and connection docking to draw
 * better looking previews.
 *
 * @param {Injector} injector
 * @param {Canvas} canvas
 * @param {GraphicsFactory} graphicsFactory
 * @param {ElementFactory} elementFactory
 */
export default function ConnectionPreview(
  injector: Injector,
  canvas: Canvas,
  graphicsFactory: GraphicsFactory,
  elementFactory: ElementFactory
) {
  // @ts-ignore
  this._canvas = canvas;
  // @ts-ignore
  this._graphicsFactory = graphicsFactory;
  // @ts-ignore
  this._elementFactory = elementFactory;

  // optional components
  // @ts-ignore
  this._connectionDocking = injector.get("connectionDocking", false);
  // @ts-ignore
  this._layouter = injector.get("layouter", false);
}

ConnectionPreview.$inject = [
  "injector",
  "canvas",
  "graphicsFactory",
  "elementFactory"
];

/**
 * Draw connection preview.
 *
 * Provide at least one of <source, connectionStart> and <target, connectionEnd> to create a preview.
 * In the clean up stage, call `connectionPreview#cleanUp` with the context to remove preview.
 *
 * @param {Object} context
 * @param {Object|boolean} canConnect
 * @param {Object} hints
 * @param {Base} [hints.source] source element
 * @param {Base} [hints.target] target element
 * @param {Point} [hints.connectionStart] connection preview start
 * @param {Point} [hints.connectionEnd] connection preview end
 * @param {Point[]} [hints.waypoints] provided waypoints for preview
 * @param {boolean} [hints.noLayout] true if preview should not be laid out
 * @param {boolean} [hints.noCropping] true if preview should not be cropped
 * @param {boolean} [hints.noNoop] true if simple connection should not be drawn
 */
ConnectionPreview.prototype.drawPreview = function (context: any, canConnect: boolean, hints: any, clear = true) {
  hints = hints || {};

  let connectionPreviewGfx = context.connectionPreviewGfx,
    getConnection = context.getConnection,
    source = hints.source,
    target = hints.target,
    waypoints = hints.waypoints,
    connectionStart = hints.connectionStart,
    connectionEnd = hints.connectionEnd,
    noLayout = hints.noLayout,
    noCropping = hints.noCropping,
    noNoop = hints.noNoop,
    connection;

  const self = this;

  if (!connectionPreviewGfx) {
    connectionPreviewGfx = context.connectionPreviewGfx = this.createConnectionPreviewGfx();
  }

  if (clear)
    svgClear(connectionPreviewGfx);

  if (!getConnection) {
    getConnection = context.getConnection = cacheReturnValues(function (canConnect: boolean, source: any, target: any) {
      return self.getConnection(canConnect, source, target);
    });
  }

  if (canConnect) {
    connection = getConnection(canConnect, source, target);
  }

  if (!connection) {
    !noNoop && this.drawNoopPreview(connectionPreviewGfx, hints);
    return;
  }

  connection.waypoints = waypoints || [];

  // optional layout
  if (this._layouter && !noLayout) {
    connection.waypoints = this._layouter.layoutConnection(connection, {
      source: source,
      target: target,
      connectionStart: connectionStart,
      connectionEnd: connectionEnd,
      waypoints: hints.waypoints || connection.waypoints
    });
  }

  // fallback if no waypoints were provided nor created with layouter
  if (!connection.waypoints || !connection.waypoints.length) {
    connection.waypoints = [
      source ? getMid(source) : connectionStart,
      target ? getMid(target) : connectionEnd
    ];
  }

  // optional cropping
  if (this._connectionDocking && (source || target) && !noCropping) {
    connection.waypoints = this._connectionDocking.getCroppedWaypoints(connection, source, target);
  }

  this._graphicsFactory.drawConnection(connectionPreviewGfx, connection);
};

/**
 * Draw simple connection between source and target or provided points.
 *
 * @param {SVGElement} connectionPreviewGfx container for the connection
 * @param {Object} hints
 * @param {Base} [hints.source] source element
 * @param {Base} [hints.target] target element
 * @param {Point} [hints.connectionStart] required if source is not provided
 * @param {Point} [hints.connectionEnd] required if target is not provided
 */
ConnectionPreview.prototype.drawNoopPreview = function (connectionPreviewGfx: any, hints: any) {
  const source = hints.source,
    target = hints.target,
    start = hints.connectionStart || getMid(source),
    end = hints.connectionEnd || getMid(target);

  const waypoints = this.cropWaypoints(start, end, source, target);

  const connection = this.createNoopConnection(waypoints[0], waypoints[1]);

  svgAppend(connectionPreviewGfx, connection);
};

/**
 * Return cropped waypoints.
 *
 * @param {Point} start
 * @param {Point} end
 * @param {Base} source
 * @param {Base} target
 *
 * @returns {Point[]}
 */
ConnectionPreview.prototype.cropWaypoints = function (start: any, end: any, source: any, target: any) {
  const graphicsFactory = this._graphicsFactory,
    sourcePath = source && graphicsFactory.getShapePath(source),
    targetPath = target && graphicsFactory.getShapePath(target),
    connectionPath = graphicsFactory.getConnectionPath({ waypoints: [start, end] });

  start = (source && getElementLineIntersection(sourcePath, connectionPath, true)) || start;
  end = (target && getElementLineIntersection(targetPath, connectionPath, false)) || end;

  return [start, end];
};

/**
 * Remove connection preview container if it exists.
 *
 * @param {Object} [context]
 * @param {SVGElement} [context.connectionPreviewGfx] preview container
 */
ConnectionPreview.prototype.cleanUp = function (context: any) {
  if (context && context.connectionPreviewGfx) {
    svgRemove(context.connectionPreviewGfx);
  }
};

/**
 * Get connection that connects source and target.
 *
 * @param {Object|boolean} canConnect
 *
 * @returns {Connection}
 */
ConnectionPreview.prototype.getConnection = function (canConnect: boolean) {
  const attrs = ensureConnectionAttrs(canConnect);

  return this._elementFactory.createConnection(attrs);
};


/**
 * Add and return preview graphics.
 *
 * @returns {SVGElement}
 */
ConnectionPreview.prototype.createConnectionPreviewGfx = function () {
  const gfx = svgCreate("g");

  svgAttr(gfx, {
    pointerEvents: "none"
  });

  svgClasses(gfx).add(MARKER_CONNECTION_PREVIEW);

  svgAppend(this._canvas.getActiveLayer(), gfx);

  return gfx;
};

/**
 * Create and return simple connection.
 *
 * @param {Point} start
 * @param {Point} end
 *
 * @returns {SVGElement}
 */
ConnectionPreview.prototype.createNoopConnection = function (start: any, end: any) {
  return createLine([start, end], {
    "stroke": "#333",
    "strokeDasharray": [1],
    "strokeWidth": 2,
    "pointer-events": "none"
  });
};

// helpers //////////

/**
 * Returns function that returns cached return values referenced by stringified first argument.
 *
 * @param {Function} fn
 *
 * @return {Function}
 */
function cacheReturnValues(fn: any) {
  let returnValues = {};

  /**
   * Return cached return value referenced by stringified first argument.
   *
   * @returns {*}
   */
  return function (firstArgument: any) {
    const key = JSON.stringify(firstArgument);

    // @ts-ignore
    let returnValue = returnValues[key];

    if (!returnValue) {
      // @ts-ignore
      returnValue = returnValues[key] = fn.apply(null, arguments);
    }

    return returnValue;
  };
}

/**
 * Ensure connection attributes is object.
 *
 * @param {Object|boolean} canConnect
 *
 * @returns {Object}
 */
function ensureConnectionAttrs(canConnect: boolean) {
  if (isObject(canConnect)) {
    return canConnect;
  } else {
    return {};
  }
}
