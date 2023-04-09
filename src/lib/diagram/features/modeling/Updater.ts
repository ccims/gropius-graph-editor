import inherits from "inherits";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import EventBus from "diagram-js/lib/core/EventBus";

/**
 * A handler responsible for updating the underlying OD XML + DI
 * once changes on the diagram happen
 */
export default function Updater(
  eventBus: EventBus,
  connectionDocking: any
) {
  CommandInterceptor.call(this, eventBus);

  // connection cropping //////////////////////

  // crop connection ends during create/update
  function cropConnection(e) {
    let context = e.context,
      hints = context.hints || {},
      connection;

    if (!context.cropped && hints.createElementsBehavior !== false) {
      connection = context.connection;
      connection.waypoints = connectionDocking.getCroppedWaypoints(connection);
      context.cropped = true;
    }
  }

  this.executed(["connection.layout", "connection.create"], cropConnection);

  this.reverted(["connection.layout"], function (e) {
    delete e.context.cropped;
  });

}

inherits(Updater, CommandInterceptor);

Updater.$inject = ["eventBus", "connectionDocking"];
