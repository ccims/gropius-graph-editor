import {
  filter,
  find,
  matchPattern,
} from "min-dash";

//@ts-ignore
import { translate } from "diagram-js/lib/util/SvgTransformUtil";

//@ts-ignore
import { getBoundsMid } from "diagram-js/lib/layout/LayoutUtil";

/**
 * @typedef {import("../../model").Base} Base
 *
 * @typedef {import("../../core/Canvas").default} Canvas
 * @typedef {import("../../core/EventBus").default} EventBus
 * @typedef {import("../preview-support/PreviewSupport").default} PreviewSupport
 * @typedef {import("../../draw/Styles").default} Styles
 */

const LOW_PRIORITY = 499;

const MARKER_DRAGGING = "djs-dragging"

/**
 * Provides previews for moving shapes when moving.
 *
 * @param {EventBus} eventBus
 * @param {Canvas} canvas
 * @param {Styles} styles
 * @param {PreviewSupport} previewSupport
 */
export default function MovePreview(
  injector: any, eventBus: any, canvas: any, styles: any, previewSupport: any) {

  /**
   * Make an element draggable.
   *
   * @param {Object} context
   * @param {Base} element
   * @param {boolean} addMarker
   */
  function makeDraggable(context: any, element: any, addMarker: any) {

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
  eventBus.on("shape.move.start", LOW_PRIORITY, function (event: any) {

  });

  // update previews
  eventBus.on("shape.move.move", LOW_PRIORITY, function (event: any) {

  });

  eventBus.on(["shape.move.out", "shape.move.cleanup"], function (event: any) {

  });

  // remove previews
  eventBus.on("shape.move.cleanup", function (event: any) {

  });


  // API //////////////////////

  /**
   * Make an element draggable.
   *
   * @param {Object} context
   * @param {Base} element
   * @param {boolean} addMarker
   */
  //@ts-ignore
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
function removeEdges(elements: any) {

  //@ts-ignore
  const filteredElements = filter(elements, function (element: any) {

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

/**
 * Checks if an element is a connection.
 */
function isConnection(element: any) {
  return element.waypoints;
}
