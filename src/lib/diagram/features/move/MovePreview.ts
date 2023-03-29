import {
  flatten,
  forEach,
  filter,
  find,
  groupBy,
  map,
  matchPattern,
  size
} from "min-dash";

import {
  selfAndAllChildren
} from "diagram-js/lib/util/Elements";

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  remove as svgRemove,
  clear as svgClear
} from "tiny-svg";

import { translate } from "diagram-js/lib/util/SvgTransformUtil";

import { getBoundsMid } from "diagram-js/lib/layout/LayoutUtil";

/**
 * @typedef {import("../../model").Base} Base
 *
 * @typedef {import("../../core/Canvas").default} Canvas
 * @typedef {import("../../core/EventBus").default} EventBus
 * @typedef {import("../preview-support/PreviewSupport").default} PreviewSupport
 * @typedef {import("../../draw/Styles").default} Styles
 */

let LOW_PRIORITY = 499;

var MARKER_DRAGGING = "djs-dragging",
  MARKER_OK = "drop-ok",
  MARKER_NOT_OK = "drop-not-ok",
  MARKER_NEW_PARENT = "new-parent",
  MARKER_ATTACH = "attach-ok";


/**
 * Provides previews for moving shapes when moving.
 *
 * @param {EventBus} eventBus
 * @param {Canvas} canvas
 * @param {Styles} styles
 * @param {PreviewSupport} previewSupport
 */
export default function MovePreview(
  injector, eventBus, canvas, styles, previewSupport) {

  let connectionPreview = injector.get("connectionPreview", false);

  function getVisualDragShapes(shapes) {
    var elements = getAllDraggedElements(shapes);

    var filteredElements = removeEdges(elements);

    return filteredElements;
  }

  function getAllDraggedElements(shapes) {
    var allShapes = selfAndAllChildren(shapes, true);

    var allConnections = map(allShapes, function (shape) {
      return (shape.incoming || []).concat(shape.outgoing || []);
    });

    return flatten(allShapes.concat(allConnections));
  }

  /**
   * Sets drop marker on an element.
   */
  function setMarker(element, marker) {

    [MARKER_ATTACH, MARKER_OK, MARKER_NOT_OK, MARKER_NEW_PARENT].forEach(function (m) {

      if (m === marker) {
        canvas.addMarker(element, m);
      } else {
        canvas.removeMarker(element, m);
      }
    });
  }

  /**
   * Make an element draggable.
   *
   * @param {Object} context
   * @param {Base} element
   * @param {boolean} addMarker
   */
  function makeDraggable(context, element, addMarker) {

    previewSupport.addDragger(element, context.dragGroup);

    if (addMarker) {
      canvas.addMarker(element, MARKER_DRAGGING);
    }

    if (context.allDraggedElements) {
      context.allDraggedElements.push(element);
    } else {
      context.allDraggedElements = [element];
    }
  }

  // assign a low priority to this handler
  // to let others modify the move context before
  // we draw things
  eventBus.on("shape.move.start", LOW_PRIORITY, function (event) {

  });

  // update previews
  eventBus.on("shape.move.move", LOW_PRIORITY, function (event) {

  });

  eventBus.on(["shape.move.out", "shape.move.cleanup"], function (event) {

  });

  // remove previews
  eventBus.on("shape.move.cleanup", function (event) {

  });


  // API //////////////////////

  /**
   * Make an element draggable.
   *
   * @param {Object} context
   * @param {Base} element
   * @param {boolean} addMarker
   */
  this.makeDraggable = makeDraggable;
}

MovePreview.$inject = [
  "injector",
  "eventBus",
  "canvas",
  "styles",
  "previewSupport"
];


// helpers //////////////////////

/**
 * returns elements minus all connections
 * where source or target is not elements
 */
function removeEdges(elements) {

  var filteredElements = filter(elements, function (element) {

    if (!isConnection(element)) {
      return true;
    } else {

      return (
        find(elements, matchPattern({ id: element.source.id })) &&
        find(elements, matchPattern({ id: element.target.id }))
      );
    }
  });

  return filteredElements;
}

function getEdges(elements) {
  return filter(elements, function (element) {
    return isConnection(element);
  });
}

function haveDifferentParents(elements) {
  return size(groupBy(elements, function (e) {
    return e.parent && e.parent.id;
  })) !== 1;
}

/**
 * Checks if an element is a connection.
 */
function isConnection(element) {
  return element.waypoints;
}
