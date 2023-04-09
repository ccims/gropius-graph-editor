// @ts-ignore
import inherits from "inherits";

import { assign } from "min-dash";

// @ts-ignore
import BaseLayouter from "diagram-js/lib/layout/BaseLayouter";

import {
  repairConnection,
  withoutRedundantPoints,
} from "diagram-js/lib/layout/ManhattanLayout";

// @ts-ignore
import { getMid, getOrientation } from "diagram-js/lib/layout/LayoutUtil";

export default function Layouter() {}

inherits(Layouter, BaseLayouter);

Layouter.prototype.layoutConnection = function (connection: any, hints: any) {
  if (!hints) {
    hints = {};
  }

  var source = hints.source || connection.source,
    target = hints.target || connection.target,
    waypoints = hints.waypoints || connection.waypoints,
    connectionStart = hints.connectionStart,
    connectionEnd = hints.connectionEnd;

  var manhattanOptions, updatedWaypoints;

  if (!connectionStart) {
    connectionStart = getConnectionDocking(waypoints && waypoints[0], source);
  }

  if (!connectionEnd) {
    connectionEnd = getConnectionDocking(
      waypoints && waypoints[waypoints.length - 1],
      target
    );
  }

  if (connection.id.startsWith("connection")) {
    // layout all connection between flow elements h:h, except for
    if (source === target) {
      manhattanOptions = {
        preferredLayouts: getLoopPreferredLayout(source, connection),
      };
    } else {
      manhattanOptions = {
        preferredLayouts: ["h:h"],
      };
    }
  }

  if (manhattanOptions) {
    manhattanOptions = assign(manhattanOptions, hints);

    updatedWaypoints = withoutRedundantPoints(
      repairConnection(
        source,
        target,
        connectionStart,
        connectionEnd,
        waypoints,
        manhattanOptions
      )
    );
  }

  return updatedWaypoints || [connectionStart, connectionEnd];
};

// helpers //////////

function getConnectionDocking(point: any, shape: any) {
  return point ? point.original || point : getMid(shape);
}

function getLoopPreferredLayout(source: any, connection: any) {
  let waypoints = connection.waypoints;

  const orientation =
    waypoints && waypoints.length && getOrientation(waypoints[0], source);

  if (orientation === "top") {
    return ["t:r"];
  } else if (orientation === "right") {
    return ["r:b"];
  } else if (orientation === "left") {
    return ["l:t"];
  }

  return ["b:l"];
}
