import {
  assign,
  filter,
  groupBy,
  isObject
} from "min-dash";

import {
  classes as svgClasses
} from "tiny-svg";

/**
 * @typedef {import("../../model").Base} Base
 * @typedef {import("../../model").Shape} Shape
 *
 * @typedef {import("../dragging/Dragging").default} Dragging
 * @typedef {import("../../core/EventBus").default} EventBus
 * @typedef {import("../modeling/Modeling").default} Modeling
 * @typedef {import("../rules/Rules").default} Rules
 * @typedef {import("../selection/Selection").default} Selection
 */

const LOW_PRIORITY = 500,
  MEDIUM_PRIORITY = 1250,
  HIGH_PRIORITY = 1500;

// @ts-ignore
import { getOriginal as getOriginalEvent } from "diagram-js/lib/util/Event";

import {
  isPrimaryButton
  // @ts-ignore
} from "diagram-js/lib/util/Mouse";

import EventBus from "diagram-js/lib/core/EventBus";
import Modeling from "diagram-js/lib/features/modeling/Modeling";
import { Base } from "diagram-js/lib/model";

const round = Math.round;

function mid(element: any) {
  return {
    x: element.x + round(element.width / 2),
    y: element.y + round(element.height / 2)
  };
}

/**
 * A plugin that makes shapes draggable / droppable.
 *
 * @param {EventBus} eventBus
 * @param {Dragging} dragging
 * @param {Modeling} modeling
 * @param {Selection} selection
 * @param {Rules} rules
 */
export default function MoveEvents(
  eventBus: EventBus, dragging: any, modeling: Modeling,
  selection: any, rules: any) {

  // rules

  function canMove(shapes: any, delta?: any, position?: any, target?: any) {

    return rules.allowed("elements.move", {
      shapes: shapes,
      delta: delta,
      position: position,
      target: target
    });
  }


  // move events

  // assign a high priority to this handler to setup the environment
  // others may hook up later, e.g. at default priority and modify
  // the move environment.
  //
  // This sets up the context with
  //
  // * shape: the primary shape being moved
  // * shapes: a list of shapes to be moved
  // * validatedShapes: a list of shapes that are being checked
  //                    against the rules before and during move
  //
  eventBus.on("shape.move.start", HIGH_PRIORITY, function (event: any) {

    let context = event.context,
      shape = event.shape,
      shapes = selection.get().slice();

    // move only single shape if the dragged element
    // is not part of the current selection
    if (shapes.indexOf(shape) === -1) {
      shapes = [shape];
    }

    // ensure we remove nested elements in the collection
    // and add attachers for a proper dragger
    shapes = removeNested(shapes);

    // attach shapes to drag context
    assign(context, {
      shapes: shapes,
      validatedShapes: shapes,
      shape: shape
    });
  });


  // assign a high priority to this handler to setup the environment
  // others may hook up later, e.g. at default priority and modify
  // the move environment
  //
  eventBus.on("shape.move.start", MEDIUM_PRIORITY, function (event: any) {
    let context = event.context,
      validatedShapes = context.validatedShapes,
      canExecute;

    canExecute = context.canExecute = canMove(validatedShapes);

    // check if we can move the elements
    if (!canExecute) {
      return false;
    }
  });

  // assign a low priority to this handler
  // to let others modify the move event before we update
  // the context
  //
  eventBus.on("shape.move.move", LOW_PRIORITY, function (event: any) {
    let context = event.context,
      validatedShapes = context.validatedShapes,
      hover = event.hover,
      delta = { x: event.dx, y: event.dy },
      position = { x: event.x, y: event.y },
      canExecute,
      lastPosition = context.lastPosition;



    if (lastPosition) {
      delta.x = position.x - lastPosition.x;
      delta.y = position.y - lastPosition.y;
    }
    context.lastPosition = position;

    // check if we can move the elements
    canExecute = canMove(validatedShapes, delta, position, hover);

    context.delta = delta;
    context.canExecute = canExecute;

    // simply ignore move over
    if (canExecute === null) {
      context.target = null;
      return;
    }

    // TODO: No nesting possible without this. But since we move the shapes right away, this would lead to self-nesting.
    context.target = context.parent; // hover

    moveShape(event);
  });

  function moveShape(event: any) {
    const context = event.context;

    let delta = context.delta,
      canExecute = context.canExecute,
      isAttach = canExecute === "attach",
      shapes = Array<any>();

    // Remove all not-component and not-connections
    context.shapes.forEach(shape => {
      if(shape.id.startsWith("shape") && shape.grShape != "version"
        || shape.id.startsWith("connection"))
        shapes.push(shape)
    })

    // Add all component versions
    context.shapes.forEach(shape => {
      if(shape.id.startsWith("shape") && shape.grShape != "version") {
        shapes.push(shape.custom.versionObject)
      }
    })

    if (canExecute === false) {
      return false;
    }

    // ensure we have actual pixel values deltas
    // (important when zoom level was > 1 during move)
    delta.x = round(delta.x);
    delta.y = round(delta.y);

    if (delta.x === 0 && delta.y === 0) {
      // didn't move
      return;
    }

    modeling.moveElements(shapes, delta, context.target, {
      primaryShape: context.shape,
      attach: isAttach
    });
  }

  eventBus.on("shape.move.end", function (event) {
    moveShape(event);
  });


  // move activation

  eventBus.on("element.mousedown", function (event: any) {

    if (!isPrimaryButton(event)) {
      return;
    }

    const originalEvent = getOriginalEvent(event);

    if (!originalEvent) {
      throw new Error("must supply DOM mousedown event");
    }

    return start(originalEvent, event.element);
  });

  /**
   * Start move.
   *
   * @param {MouseEvent|TouchEvent} event
   * @param {Shape} shape
   * @param {boolean} [activate]
   * @param {Object} [context]
   */
  function start(event: any, element: any, activate?: boolean, context?: any) {
    if (isObject(activate)) {
      context = activate;
      activate = false;
    }

    // do not move connections or the root element
    if (element.waypoints || !element.parent) {
      return;
    }

    // ignore non-draggable hits
    if (svgClasses(event.target).has("djs-hit-no-move")) {
      return;
    }

    const referencePoint = mid(element);

    dragging.init(event, referencePoint, "shape.move", {
      cursor: "grabbing",
      autoActivate: activate,
      data: {
        shape: element,
        context: context || {}
      }
    });

    // we've handled the event
    return true;
  }

  // API

  // @ts-ignore
  this.start = start;
}

MoveEvents.$inject = [
  "eventBus",
  "dragging",
  "modeling",
  "selection",
  "rules"
];


/**
 * Return a filtered list of elements that do not contain
 * those nested into others.
 *
 * @param {Array<Base>} elements
 *
 * @return {Array<Base>} filtered
 */
function removeNested(elements: Array<Base>) {

  const ids = groupBy(elements, "id");

  return filter(elements, function (element: Base) {
    while ((element = element.parent)) {

      // parent in selection
      if (ids[element.id]) {
        return false;
      }
    }

    return true;
  });
}
